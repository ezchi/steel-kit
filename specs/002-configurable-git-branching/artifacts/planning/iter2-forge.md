# Implementation Plan: Configurable Git Branching Workflow Support

## Architecture Overview

This feature introduces a git branching configuration layer between Steel-Kit's workflow engine and its git operations. The core change is replacing all hardcoded `spec/` branch prefixes with a resolved configuration object (`ResolvedGitConfig`) that flows from config loading through branch creation, state recovery, and drift detection.

The architecture follows three principles from the constitution:
1. **Single source of truth**: `resolveGitConfig()` is the only place branching config is computed.
2. **Provider-agnostic**: Git config lives in the shared config cascade, not in provider-specific code.
3. **Backward-compatible**: The `steel` preset replicates current behavior exactly when no `git` config is present.

```
Config Sources              Resolution              Consumers
─────────────              ──────────              ─────────
DEFAULT_CONFIG ─┐
steel.config.yaml ─┤  mergeConfig()   resolveGitConfig()   initBranch()
.steel/config.json ─┤  ──────────► ──────────────► recoverState()
STEEL_GIT_* env ───┘  (deep-merge)   (preset fill)        checkDrift()
                                                           generateSpecId()
```

## Components

### 1. `src/git-config.ts` (NEW)

**Responsibility**: Preset registry, resolution logic, and validation for git branching configuration. Type definitions (`GitWorkflow`, `GitConfig`, `ResolvedGitConfig`) live in `src/config.ts` alongside `SteelConfig` to avoid a bidirectional type dependency.

**Exports**:
```typescript
// Preset registry
export const GIT_PRESETS: Record<GitWorkflow, Omit<ResolvedGitConfig, 'workflow'>>;

// Resolution
export function resolveGitConfig(config: SteelConfig): ResolvedGitConfig;

// Validation
export function validateBranchRef(value: string, fieldName: string): void;
export function validateSpecIdComponent(value: string): void;
```

**Dependencies**: `src/config.ts` (for `SteelConfig`, `GitConfig`, `GitWorkflow`, `ResolvedGitConfig` types — one-way dependency, no cycle)

**Key design decisions**:
- Types defined in `config.ts`, logic in `git-config.ts` — clean one-way dependency graph: `git-config.ts` → `config.ts`, never the reverse.
- Validation functions are exported so both `resolveGitConfig()` (NFR-5) and `steel init` (FR-26) share the same logic (CLR-6).
- Preset values (`spec/`, `feature/`) skip validation since they are known-valid (NFR-5).

### 2. `src/spec-id.ts` (NEW)

**Responsibility**: Spec ID generation, slugification, `--id` validation, and collision detection (FR-16a, CLR-5).

**Exports**:
```typescript
export interface GenerateSpecIdOpts {
  projectRoot: string;
  specsDir: string;
  description: string;
  customId?: string;  // from --id flag
}

export function generateSpecId(opts: GenerateSpecIdOpts): string;
export function slugify(description: string): string;
```

**Dependencies**: `fs` (for directory listing and existence checks)

**Key design decisions**:
- Extracted from `commands/specify.ts` for direct unit testing.
- `slugify()` is exported separately for reuse and testing (FR-15b, AC-31–34).
- Collision detection (FR-15a) checks `existsSync(path.join(specsDir, specId))` before returning.
- `--id` validation uses `validateSpecIdComponent()` from `git-config.ts`.

### 3. `src/config.ts` (MODIFIED)

**Changes**:
- Add `GitWorkflow`, `GitConfig`, and `ResolvedGitConfig` type definitions (FR-2, FR-3, FR-5). These types are co-located with `SteelConfig` because `GitConfig` is a field of `SteelConfig` — defining them here prevents a bidirectional dependency with `git-config.ts`.
- Add optional `git?: GitConfig` field to `SteelConfig` interface (FR-1).
- Add `STEEL_GIT_*` environment variable handling to the env override section of `loadConfig()` (FR-7). Invalid `STEEL_GIT_WORKFLOW` values are warned and ignored (AC-15).
- Update `mergeConfig()` to deep-merge the `git` sub-object (FR-6).
- Update `DEFAULT_CONFIG` — no `git` field (steel preset is the implicit default via `resolveGitConfig()`).

**What stays the same**: `saveConfig()`, `getSteelDir()`, `getSpecsDir()`, `getSpecDir()`, `getConfigPath()` — all untouched. `loadConfig()` signature unchanged but body extended for env vars.

### 4. `src/git-ops.ts` (MODIFIED)

**Changes to `initBranch()`** (FR-8–FR-13):
- New signature: `initBranch(specId: string, projectRoot: string, gitConfig: ResolvedGitConfig): Promise<string>`
- Calls `ensureClean()` before switching branches (FR-11).
- Checks out `gitConfig.baseBranch` (FR-10), with auto-tracking from `origin/<baseBranch>` if needed (FR-12).
- Creates branch `gitConfig.branchPrefix + specId` (FR-9).
- Returns the branch name string (FR-13).

**What stays the same**: `commitStep()`, `tagStage()`, `ensureClean()`, `getCurrentBranch()`, `getWorkingTreeDiff()`.

### 5. `src/workflow.ts` (MODIFIED)

**Changes to `recoverState()`** (FR-19–FR-21):
- Accept `ResolvedGitConfig` (or resolve it internally from config).
- Primary detection: `branch.startsWith(resolvedGitConfig.branchPrefix)` → extract specId via `branch.slice(branchPrefix.length)`.
- Legacy fallback: if configured prefix is not `spec/` but branch starts with `spec/`, still detect as spec branch (FR-20).
- specId treated as opaque string (FR-21).

**What stays the same**: `loadState()`, `saveState()`, `advanceStage()`, `runForgeGaugeLoop()`, `createInitialState()`.

### 6. `src/doctor.ts` (MODIFIED)

**Changes to `checkDrift()`** (FR-22–FR-23):
- Use `resolvedGitConfig.branchPrefix` instead of hardcoded `spec/` for expected branch computation.
- Add legacy-prefix warning diagnostic: if configured prefix differs from `spec/` but current branch uses `spec/`, emit `warn` with remediation.

**What stays the same**: All other check functions, severity matrix, `runDoctor()` orchestration.

### 7. `commands/specify.ts` (MODIFIED)

**Changes** (FR-14, FR-17, FR-18):
- Add `--id <value>` option to the `specify` command.
- Call `resolveGitConfig(config)` to get resolved git config.
- Call `generateSpecId()` from `src/spec-id.ts` instead of local function (with `customId` when `--id` provided).
- Pass `resolvedGitConfig` to `initBranch()`.
- Use branch name returned by `initBranch()` instead of reconstructing `spec/${specId}`.
- Remove the local `generateSpecId()` function.

### 8. `commands/init.ts` (MODIFIED)

**Changes** (FR-24–FR-27):
- Add two new prompts after provider selection using `@inquirer/prompts` `input()`:
  - Base branch (default: `"main"`)
  - Branch prefix (default: `"spec/"`)
- Validate inputs using `validateBranchRef()` from `git-config.ts`; re-prompt on failure (FR-26).
- Merge validated values into `.steel/config.json` under the `git` key, preserving all other fields (FR-27).

### 9. `src/cli.ts` (MODIFIED)

**Changes**:
- Add `.option('--id <value>', 'Custom spec identifier (e.g. Jira ticket ID)')` to the `specify` command definition.
- Pass `options.id` through to `cmdSpecify()`.

### 10. `steel.config.yaml` (MODIFIED)

**Changes** (FR-28):
- Add commented `git:` section documenting fields, presets, and defaults.

### 11. `resources/commands/steel-specify.md` (MODIFIED)

**Responsibility**: Canonical command documentation that feeds Claude/Gemini/Codex surface installations (NFR-3).

**Changes**:
- Document the `--id <value>` option with validation rules and examples.
- Replace any hardcoded references to `spec/` prefix with configurable-prefix language.
- Document that branch naming uses `branchPrefix + specId` from resolved git config.

**Why this matters**: `src/command-installer.ts` generates provider-specific command files from these canonical resources. If the resource still references `spec/` only, the installed surfaces will be out of date. This is a constitution requirement: "All workflow surfaces must stay behaviorally aligned across Codex, Gemini CLI, and Claude Code."

## Data Model

### Config Schema Extension

```typescript
// Added to SteelConfig
interface SteelConfig {
  // ... existing fields ...
  git?: GitConfig;
}

// New types in src/config.ts (co-located with SteelConfig to avoid dependency cycles)
type GitWorkflow = 'steel' | 'github-flow' | 'gitflow';

interface GitConfig {
  workflow?: GitWorkflow;
  branchPrefix?: string;
  baseBranch?: string;
  developBranch?: string;
}

interface ResolvedGitConfig {
  workflow: GitWorkflow;
  branchPrefix: string;
  baseBranch: string;
  developBranch?: string;
}
```

### Preset Registry

```typescript
const GIT_PRESETS: Record<GitWorkflow, Omit<ResolvedGitConfig, 'workflow'>> = {
  'steel':       { branchPrefix: 'spec/',    baseBranch: 'main' },
  'github-flow': { branchPrefix: 'feature/', baseBranch: 'main' },
  'gitflow':     { branchPrefix: 'feature/', baseBranch: 'develop', developBranch: 'develop' },
};
```

### Resolution Algorithm

```
1. Start with merged GitConfig from config cascade
2. Determine workflow: config.git?.workflow ?? 'steel'
3. Look up preset defaults for that workflow
4. For each field (branchPrefix, baseBranch, developBranch):
   - Use explicit value if set in config
   - Else use preset default
   - Else use 'steel' preset default (final fallback)
5. Validate all resolved values (skip for known-valid preset defaults)
6. Return ResolvedGitConfig
```

### Environment Variable Mapping

| Env Var | Config Path | Validation |
|---------|------------|------------|
| `STEEL_GIT_WORKFLOW` | `config.git.workflow` | Must be valid `GitWorkflow`; warn + ignore if invalid |
| `STEEL_GIT_BRANCH_PREFIX` | `config.git.branchPrefix` | Non-empty, valid git ref chars |
| `STEEL_GIT_BASE_BRANCH` | `config.git.baseBranch` | Valid git branch name |
| `STEEL_GIT_DEVELOP_BRANCH` | `config.git.developBranch` | Valid git branch name |

## API Design

### Public Function Signatures

```typescript
// src/git-config.ts
function resolveGitConfig(config: SteelConfig): ResolvedGitConfig;
function validateBranchRef(value: string, fieldName: string): void;  // throws on invalid
function validateSpecIdComponent(value: string): void;               // throws on invalid

// src/spec-id.ts
function generateSpecId(opts: GenerateSpecIdOpts): string;
function slugify(description: string): string;

// src/git-ops.ts (modified)
function initBranch(specId: string, projectRoot: string, gitConfig: ResolvedGitConfig): Promise<string>;

// src/workflow.ts (modified — internal change, no public API change)
// recoverState() internally uses ResolvedGitConfig

// commands/specify.ts (modified)
function cmdSpecify(description: string, opts?: { id?: string }): Promise<void>;
```

### Error Messages

| Scenario | Error Message |
|----------|--------------|
| Invalid `--id` value | `"Invalid spec ID '<value>': <reason>"` (e.g. "invalid character '~'", "contains forbidden sequence '..'") |
| Spec dir collision | `"Spec directory 'specs/<specId>' already exists. Use a different --id or remove the existing spec."` |
| Empty branchPrefix | `"Invalid branchPrefix: value must be non-empty"` |
| Invalid branchPrefix | `"Invalid branchPrefix '<value>': <reason>"` |
| Invalid baseBranch | `"Invalid baseBranch '<value>': <reason>"` |
| Missing baseBranch | `"Branch '<name>' does not exist locally or as remote-tracking branch 'origin/<name>'"` |
| Invalid workflow env var | `Warning: STEEL_GIT_WORKFLOW='<value>' is not a valid workflow preset; ignoring` (stderr, not error) |

## Dependencies

**No new external dependencies required.** All needed functionality exists in the current stack:
- `execa` — for `git check-ref-format`, `git rev-parse`, `git checkout`, `git branch` commands
- `@inquirer/prompts` — `input()` for init prompts (already used for `select()`)
- `fs` — `existsSync`, `readdirSync` for spec directory operations

**Internal dependencies (new modules — acyclic)**:
- `src/config.ts` owns all type definitions (`SteelConfig`, `GitConfig`, `GitWorkflow`, `ResolvedGitConfig`)
- `src/git-config.ts` → `src/config.ts` (imports types, no reverse dependency)
- `src/spec-id.ts` → `src/git-config.ts` (imports `validateSpecIdComponent()`)

## Implementation Strategy

### Phase 1: Foundation (no behavioral changes)

Create the new modules and types without changing any existing behavior.

1. **Create `src/git-config.ts`**: Types, preset registry, `resolveGitConfig()`, validation functions.
2. **Create `src/spec-id.ts`**: Extract `generateSpecId()` from `commands/specify.ts`, add `slugify()`, add `--id` validation and collision detection.
3. **Update `src/config.ts`**: Add `git?: GitConfig` to `SteelConfig`, add env var handling for `STEEL_GIT_*`, update `mergeConfig()` for deep-merge.
4. **Write tests** for `resolveGitConfig()`, `generateSpecId()`, `slugify()`, and validation functions (AC-1–5, AC-14–15, AC-18–26, AC-30–34).

**Verification gate**: `npm run build && npm test && npm run lint` pass. All new tests pass. No existing behavior changed.

### Phase 2: Core integration

Wire the new config into existing operations.

5. **Update `src/git-ops.ts`**: Modify `initBranch()` signature and implementation (FR-8–FR-13).
6. **Update `commands/specify.ts`**: Wire `--id` flag, use `resolveGitConfig()`, call new `generateSpecId()`, use returned branch name. Remove local `generateSpecId()`.
7. **Update `src/cli.ts`**: Add `--id` option to `specify` command definition. Pass `options.id` through to `cmdSpecify()`.
8. **Write integration tests** for `initBranch()` with various configs (AC-16–17).
9. **Write command-level tests** for `cmdSpecify()` wiring: verify CLI option parsing passes `--id` through, `resolveGitConfig()` is called, `state.branch` uses returned branch name, and end-to-end branch creation produces correct names (AC-6–8). These test the full `specify` → `resolveGitConfig` → `generateSpecId` → `initBranch` chain, not just `initBranch()` in isolation.

**Verification gate**: `npm run build && npm test && npm run lint` pass. `steel specify "test"` with default config produces `spec/NNN-test` (backward compat).

### Phase 3: Recovery and diagnostics

Update state recovery and doctor to use resolved config.

9. **Update `src/workflow.ts`**: Modify `recoverState()` to use `resolvedGitConfig.branchPrefix` with legacy fallback (FR-19–FR-21).
10. **Update `src/doctor.ts`**: Modify `checkDrift()` to use resolved config, add legacy-prefix warning (FR-22–FR-23).
11. **Write tests** for recovery and drift scenarios (AC-9–12).

**Verification gate**: `npm run build && npm test && npm run lint` pass. Existing doctor tests still pass.

### Phase 4: Interactive setup and documentation

12. **Update `commands/init.ts`**: Add base branch and branch prefix prompts with validation (FR-24–FR-27). For re-initialization (FR-27), the init command shall read existing `.steel/config.json`, merge only the `git` sub-object, and write back preserving all other fields. This avoids `initConfig()` clobbering non-git fields. Implementation approach: after provider prompts complete via existing `initConfig()`, separately read config, add/update `git` key, and write back via `saveConfig()`.
13. **Update `steel.config.yaml`**: Add commented `git:` section (FR-28).
14. **Update `resources/commands/steel-specify.md`**: Document `--id` flag and configurable branch prefixes (NFR-3 surface parity).
15. **Write tests** for init config merging (AC-13, AC-27–28). Verify `loadConfig()` with `STEEL_GIT_*` env vars (AC-14, AC-15) — these test the full cascade from env vars through `loadConfig()`, not just `resolveGitConfig()` in isolation.

**Verification gate**: Full test suite passes. `steel init` on fresh project prompts for git config. Canonical command resources are updated.

### Phase 5: Final verification

16. **End-to-end smoke test**: Run through a complete `steel specify` → branch creation → recovery → doctor flow with each preset (`steel`, `github-flow`, `gitflow`) and with `--id`.
17. **Surface verification**: Run `steel update` and verify that installed Claude/Gemini/Codex command files reflect the updated `resources/commands/steel-specify.md` content.
18. **AC-29**: `npm run build && npm test && npm run lint` all pass clean.

## Risks and Mitigations

### Risk 1: Breaking existing projects (HIGH impact, LOW probability)

**Risk**: Projects with no `git` config could behave differently after changes.

**Mitigation**: The `steel` preset exactly replicates current hardcoded values (`spec/`, `main`). `resolveGitConfig({})` returns `{ workflow: 'steel', branchPrefix: 'spec/', baseBranch: 'main' }` (AC-1). Phase 1 tests verify this before any integration changes.

### Risk 2: State recovery regression (MEDIUM impact, MEDIUM probability)

**Risk**: `recoverState()` changes could break detection of existing spec branches.

**Mitigation**: Legacy fallback (FR-20) ensures `spec/` branches are always detected. The existing doctor tests provide a safety net. New tests cover both configured-prefix and legacy-prefix scenarios (AC-9, AC-10).

### Risk 3: Git ref validation edge cases (LOW impact, MEDIUM probability)

**Risk**: Validation could reject valid branch names or accept invalid ones across different git versions.

**Mitigation**: Use `git check-ref-format` as the authoritative validator where practical for integration tests. For unit tests, implement the rules from the git documentation directly in `validateBranchRef()` and `validateSpecIdComponent()`. Test known edge cases from ACs (AC-19–26).

### Risk 4: `initBranch()` signature change breaks callers (MEDIUM impact, LOW probability)

**Risk**: Other code paths may call `initBranch()` with the old signature.

**Mitigation**: TypeScript compiler will catch all call sites. The only caller is `commands/specify.ts`. Phase 2 updates both together.

### Risk 5: Config cascade ordering with env vars (LOW impact, LOW probability)

**Risk**: Env var overrides could interact unexpectedly with YAML/JSON git config.

**Mitigation**: The two-phase approach (merge all sources → resolve presets) has a single, testable code path. AC-14 and AC-15 verify env var behavior at the `loadConfig()` level, testing the full cascade.

### Risk 6: Command-surface drift (MEDIUM impact, MEDIUM probability)

**Risk**: `resources/commands/steel-specify.md` still references hardcoded `spec/` and numeric-only IDs. If not updated, installed Claude/Gemini/Codex surfaces will give incorrect guidance to users with non-default branching config.

**Mitigation**: Phase 4 explicitly includes updating canonical command resources. Phase 5 includes surface verification via `steel update`. The existing `checkSurfaces()` doctor check will flag stale surfaces.

### Risk 7: Re-init config clobbering (MEDIUM impact, MEDIUM probability)

**Risk**: `steel init` re-run could overwrite existing config fields when adding git config. The current `initConfig()` path rewrites the full config.

**Mitigation**: Phase 4 implementation reads existing config, merges only the `git` sub-object, and writes back via `saveConfig()` — bypassing `initConfig()` for the git portion. AC-27 explicitly tests that non-git fields are preserved.

## Testing Strategy

### Unit Tests

**`src/git-config.test.ts`** (NEW):
- `resolveGitConfig()` with no config → steel defaults (AC-1)
- `resolveGitConfig()` with gitflow → gitflow defaults (AC-2)
- `resolveGitConfig()` with gitflow + explicit override → override wins (AC-3)
- `validateBranchRef()` rejects empty (AC-18/25), `..` (AC-24), `~` (AC-26)
- `validateSpecIdComponent()` rejects space (AC-19), `~` (AC-20), `/` (AC-22), `..` (AC-23)
- `validateSpecIdComponent()` accepts valid values (AC-21)

**`src/config.test.ts`** (NEW — config cascade tests):
- `loadConfig()` with `STEEL_GIT_BRANCH_PREFIX=eda-` env var → overrides config file (AC-14)
- `loadConfig()` with `STEEL_GIT_WORKFLOW=invalid` env var → warning emitted, default applies (AC-15)
- `mergeConfig()` deep-merges `git` sub-object correctly (FR-6)

**`src/spec-id.test.ts`** (NEW):
- `generateSpecId()` with `--id` → custom prefix (AC-4)
- `generateSpecId()` without `--id` → auto-increment (AC-5)
- `generateSpecId()` with `--id` and existing dir → collision error (AC-30)
- `slugify()` lowercase + strip + collapse (AC-31)
- `slugify()` trim (AC-32)
- `slugify()` truncation (AC-33)
- `slugify()` parity across modes (AC-34)

**`src/doctor.test.ts`** (MODIFIED):
- Drift check with configured prefix and matching branch → pass (AC-11)
- Drift check with configured prefix and `spec/` branch → legacy warning (AC-12)
- Existing tests continue passing with default (steel) config

### Integration Tests

**`src/git-ops.test.ts`** (NEW or added to existing):
- `initBranch()` with remote-only baseBranch → auto-tracks (AC-16)
- `initBranch()` with nonexistent baseBranch → clear error (AC-17)

**`commands/specify.test.ts`** (NEW — command-level tests):
- `cmdSpecify("test")` with `feature/` config creates branch `feature/001-test` (AC-6)
- `cmdSpecify("add auth", { id: 'PROJ-21' })` with `eda-` config creates branch `eda-PROJ-21-add-auth` (AC-7)
- `cmdSpecify("test")` with no git config creates `spec/001-test` (AC-8, backward compat)
- Verify `state.branch` is set from `initBranch()` return value (FR-18)
- Verify `--id` option is parsed and passed through from CLI (FR-14)

**`commands/init.test.ts`** (NEW — init config merging):
- Init with git prompts stores values under `git` key (AC-13)
- Re-init preserves existing `forge`, `gauge`, `maxIterations` etc. (AC-27)
- Init with invalid baseBranch re-prompts (AC-28)

**Recovery tests** (in `src/workflow.test.ts` or new file):
- Recovery detects `feature/002-add-auth` with `feature/` config (AC-9)
- Recovery detects `spec/001-doctor` with `feature/` config (legacy fallback, AC-10)

### Build Verification

- AC-29: `npm run build`, `npm test`, `npm run lint` all pass clean.

### Test Infrastructure

All tests use Vitest (existing framework). Git integration tests use temporary directories with `git init` for isolation (same pattern as existing `doctor.test.ts`). No mocking of git — tests run real git commands against temp repos.
