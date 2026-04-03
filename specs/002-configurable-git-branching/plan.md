# Implementation Plan: Configurable Git Branching Workflow Support

## Architecture Overview

This feature replaces hardcoded `spec/` branch prefix and `main` base branch assumptions with a configurable git branching system. The core change is replacing all hardcoded `spec/` branch prefixes with a resolved configuration object (`ResolvedGitConfig`) that flows from config loading through branch creation, state recovery, and drift detection.

The architecture follows three principles from the constitution:
1. **Single source of truth**: `resolveGitConfig()` is the only place branching config is computed (NFR-2).
2. **Provider-agnostic**: Git config lives in the shared config cascade, not in provider-specific code (NFR-3).
3. **Backward-compatible**: The `steel` preset replicates current behavior exactly when no `git` config is present (NFR-1).

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

// Validation (shared by resolveGitConfig and steel init)
export function validateBranchRef(value: string, fieldName: string): void;
export function validateSpecIdComponent(value: string): void;
```

**Dependencies**: `src/config.ts` (one-way — imports types only)

**Design decisions**:
- Types defined in `config.ts`, logic in `git-config.ts` — clean acyclic dependency graph.
- Validation functions exported so both `resolveGitConfig()` (NFR-5) and `steel init` (FR-26) share the same logic (CLR-6).
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

**Dependencies**: `fs` (directory listing, existence checks), `src/git-config.ts` (imports `validateSpecIdComponent()`)

**Design decisions**:
- Extracted from `commands/specify.ts` for direct unit testing (FR-16a, CLR-5).
- `slugify()` exported separately for reuse and testing (FR-15b).
- Collision detection checks `existsSync(path.join(specsDir, specId))` before returning (FR-15a).
- `--id` validation uses `validateSpecIdComponent()` from `git-config.ts`.

### 3. `src/config.ts` (MODIFIED)

**Changes**:
- Add `GitWorkflow`, `GitConfig`, `ResolvedGitConfig` type definitions co-located with `SteelConfig` (FR-1, FR-2, FR-3, FR-5).
- Add optional `git?: GitConfig` field to `SteelConfig` interface.
- Add `STEEL_GIT_*` environment variable handling in `loadConfig()` (FR-7). Invalid `STEEL_GIT_WORKFLOW` values warned and ignored (AC-15).
- Update `mergeConfig()` to deep-merge the `git` sub-object (FR-6).
- `DEFAULT_CONFIG` has no `git` field — the `steel` preset is the implicit default via `resolveGitConfig()`.

**Unchanged**: `saveConfig()`, `getSteelDir()`, `getSpecsDir()`, `getSpecDir()`, `getConfigPath()`.

### 4. `src/git-ops.ts` (MODIFIED)

**Changes to `initBranch()`** (FR-8–FR-13):
- New signature: `initBranch(specId: string, projectRoot: string, gitConfig: ResolvedGitConfig): Promise<string>`
- Call `ensureClean()` before switching branches (FR-11).
- Checkout `gitConfig.baseBranch` (FR-10), with auto-tracking from `origin/<baseBranch>` if local branch missing (FR-12).
- Create branch `gitConfig.branchPrefix + specId` (FR-9).
- Return the branch name string (FR-13).

**Unchanged**: `commitStep()`, `tagStage()`, `ensureClean()`, `getCurrentBranch()`, `getWorkingTreeDiff()`.

### 5. `src/workflow.ts` (MODIFIED)

**Changes to `recoverState()`** (FR-19–FR-21):
- Accept or resolve `ResolvedGitConfig` internally from config.
- Primary detection: `branch.startsWith(resolvedGitConfig.branchPrefix)` → extract specId via `branch.slice(branchPrefix.length)`.
- Legacy fallback: if configured prefix is not `spec/` but branch starts with `spec/`, still detect as spec branch (FR-20).
- specId treated as opaque string — no parsing of ID subcomponents (FR-21).

**Unchanged**: `loadState()`, `saveState()`, `advanceStage()`, `runForgeGaugeLoop()`, `createInitialState()`.

### 6. `src/doctor.ts` (MODIFIED)

**Changes to `checkDrift()`** (FR-22–FR-23):
- Use `resolvedGitConfig.branchPrefix` instead of hardcoded `spec/` for expected branch computation.
- Add legacy-prefix warning: if configured prefix differs from `spec/` but current branch uses `spec/`, emit `warn` with remediation suggesting branch or config update.

**Unchanged**: All other check functions, severity matrix, `runDoctor()` orchestration.

### 7. `commands/specify.ts` (MODIFIED)

**Changes** (FR-14, FR-17, FR-18):
- Add `--id <value>` option.
- Call `resolveGitConfig(config)` to get resolved git config.
- Call `generateSpecId()` from `src/spec-id.ts` instead of local function (with `customId` when `--id` provided).
- Pass `resolvedGitConfig` to `initBranch()`.
- Use branch name returned by `initBranch()` instead of reconstructing `spec/${specId}`.
- Remove the local `generateSpecId()` function.

### 8. `commands/init.ts` (MODIFIED)

**Changes** (FR-24–FR-27):
- Add two new `input()` prompts after provider selection:
  - Base branch (default: `"main"`)
  - Branch prefix (default: `"spec/"`)
- Validate inputs using `validateBranchRef()` from `git-config.ts`; re-prompt on failure (FR-26).
- Merge validated values into `.steel/config.json` under the `git` key, preserving all other fields (FR-27). Implementation: after provider prompts, read existing config, merge `git` sub-object, write back via `saveConfig()`.

### 9. `src/cli.ts` (MODIFIED)

**Changes**: Add `.option('--id <value>', 'Custom spec identifier')` to the `specify` command definition.

### 10. `steel.config.yaml` (MODIFIED)

**Changes** (FR-28): Add commented `git:` section documenting fields, presets, and defaults.

### 11. `resources/commands/steel-specify.md` (MODIFIED)

**Changes**: Document `--id <value>` option with validation rules. Replace hardcoded `spec/` references with configurable-prefix language. This is required by the constitution: "All workflow surfaces must stay behaviorally aligned across Codex, Gemini CLI, and Claude Code."

## Data Model

### Config Schema Extension

```typescript
// Added to SteelConfig
interface SteelConfig {
  // ... existing fields ...
  git?: GitConfig;
}

// New types in src/config.ts
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
const GIT_PRESETS = {
  'steel':       { branchPrefix: 'spec/',    baseBranch: 'main' },
  'github-flow': { branchPrefix: 'feature/', baseBranch: 'main' },
  'gitflow':     { branchPrefix: 'feature/', baseBranch: 'develop', developBranch: 'develop' },
};
```

### Resolution Algorithm

```
1. Merge all config sources into a single GitConfig (loadConfig → mergeConfig)
2. Determine workflow: config.git?.workflow ?? 'steel'
3. Look up preset defaults for that workflow
4. For each field (branchPrefix, baseBranch, developBranch):
   - Use explicit value if set in config → else preset default → else steel preset default
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
function validateBranchRef(value: string, fieldName: string): void;
function validateSpecIdComponent(value: string): void;

// src/spec-id.ts
function generateSpecId(opts: GenerateSpecIdOpts): string;
function slugify(description: string): string;

// src/git-ops.ts (modified)
function initBranch(specId: string, projectRoot: string, gitConfig: ResolvedGitConfig): Promise<string>;

// commands/specify.ts (modified)
function cmdSpecify(description: string, opts?: { id?: string }): Promise<void>;
```

### Error Messages

| Scenario | Error Message |
|----------|--------------|
| Invalid `--id` value | `"Invalid spec ID '<value>': <reason>"` |
| Spec dir collision | `"Spec directory 'specs/<specId>' already exists. Use a different --id or remove the existing spec."` |
| Empty branchPrefix | `"Invalid branchPrefix: value must be non-empty"` |
| Invalid branchPrefix | `"Invalid branchPrefix '<value>': <reason>"` |
| Missing baseBranch | `"Branch '<name>' does not exist locally or as remote-tracking branch 'origin/<name>'"` |
| Invalid workflow env var | `Warning: STEEL_GIT_WORKFLOW='<value>' is not a valid workflow preset; ignoring` (stderr) |

## Dependencies

**No new external dependencies.** All functionality uses existing packages:
- `execa` — git operations
- `@inquirer/prompts` — `input()` for init prompts
- `fs` / `fs/promises` — file operations

**Internal dependency graph (acyclic)**:
```
src/config.ts (types + cascade)
    ↑
src/git-config.ts (resolution + validation)
    ↑
src/spec-id.ts (ID generation + slugification)
```

## Implementation Strategy

### Phase 1: Foundation (no behavioral changes)

1. **Create `src/git-config.ts`**: Types, preset registry, `resolveGitConfig()`, validation functions.
2. **Create `src/spec-id.ts`**: Extract `generateSpecId()` from `commands/specify.ts`, add `slugify()`, add `--id` validation and collision detection.
3. **Update `src/config.ts`**: Add `git?: GitConfig` to `SteelConfig`, add `STEEL_GIT_*` env var handling, update `mergeConfig()` deep-merge.
4. **Write tests**: `src/git-config.test.ts`, `src/spec-id.test.ts`, `src/config.test.ts` (AC-1–5, AC-14–15, AC-18–26, AC-30–34).

**Gate**: `npm run build && npm test && npm run lint` pass. No existing behavior changed.

### Phase 2: Core integration

5. **Update `src/git-ops.ts`**: Modify `initBranch()` signature and implementation (FR-8–FR-13).
6. **Update `commands/specify.ts`**: Wire `--id` flag, use `resolveGitConfig()`, call new `generateSpecId()`, use returned branch name. Remove local `generateSpecId()`.
7. **Update `src/cli.ts`**: Add `--id` option to `specify` command.
8. **Write tests**: `initBranch()` integration tests (AC-16–17), command-level tests for specify (AC-6–8).

**Gate**: `npm run build && npm test && npm run lint` pass. Default config produces `spec/NNN-test` (backward compat).

### Phase 3: Recovery and diagnostics

9. **Update `src/workflow.ts`**: Modify `recoverState()` to use `resolvedGitConfig.branchPrefix` with legacy fallback (FR-19–FR-21).
10. **Update `src/doctor.ts`**: Modify `checkDrift()` to use resolved config, add legacy-prefix warning (FR-22–FR-23).
11. **Write tests**: Recovery and drift scenarios (AC-9–12).

**Gate**: `npm run build && npm test && npm run lint` pass. Existing doctor tests still pass.

### Phase 4: Interactive setup and documentation

12. **Update `commands/init.ts`**: Add base branch and branch prefix prompts with validation (FR-24–FR-27).
13. **Update `steel.config.yaml`**: Add commented `git:` section (FR-28).
14. **Update `resources/commands/steel-specify.md`**: Document `--id` flag and configurable branch prefixes.
15. **Write tests**: Init config merging (AC-13, AC-27–28), env var cascade (AC-14, AC-15).

**Gate**: Full test suite passes. `steel init` prompts for git config.

### Phase 5: Final verification

16. **End-to-end smoke test**: Full specify → branch creation → recovery → doctor flow with each preset and `--id`.
17. **Surface verification**: Run `steel update` and verify installed command files reflect updates.
18. **AC-29**: `npm run build && npm test && npm run lint` all pass clean.

## Risks and Mitigations

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | Breaking existing projects with no `git` config | HIGH | LOW | `steel` preset exactly replicates hardcoded values. AC-1 and AC-8 verify. |
| 2 | State recovery regression | MEDIUM | MEDIUM | Legacy `spec/` fallback (FR-20) ensures existing branches always detected. AC-9, AC-10 test both paths. |
| 3 | Git ref validation edge cases | LOW | MEDIUM | Use `git check-ref-format` rules. Test known edge cases (AC-19–26). |
| 4 | `initBranch()` signature change breaks callers | MEDIUM | LOW | TypeScript compiler catches all call sites. Only caller is `commands/specify.ts`. |
| 5 | Config cascade ordering with env vars | LOW | LOW | Two-phase approach (merge → resolve) has single testable path. AC-14, AC-15 verify. |
| 6 | Command-surface drift after adding `--id` | MEDIUM | MEDIUM | Phase 4 explicitly updates canonical resources. Phase 5 runs surface verification. |
| 7 | Re-init config clobbering | MEDIUM | MEDIUM | Read existing config, merge only `git`, write back. AC-27 tests field preservation. |

## Testing Strategy

### Unit Tests

**`src/git-config.test.ts`** (NEW):
- `resolveGitConfig()` with no config → steel defaults (AC-1)
- `resolveGitConfig()` with gitflow → gitflow defaults (AC-2)
- `resolveGitConfig()` with gitflow + explicit override → override wins (AC-3)
- `validateBranchRef()` rejects empty (AC-18/25), `..` (AC-24), `~` (AC-26)
- `validateSpecIdComponent()` rejects space (AC-19), `~` (AC-20), `/` (AC-22), `..` (AC-23)
- `validateSpecIdComponent()` accepts valid values (AC-21)

**`src/spec-id.test.ts`** (NEW):
- `generateSpecId()` with `--id` → custom prefix (AC-4)
- `generateSpecId()` without `--id` → auto-increment (AC-5)
- `generateSpecId()` with `--id` and existing dir → collision error (AC-30)
- `slugify()` lowercase + strip + collapse (AC-31)
- `slugify()` trim whitespace (AC-32)
- `slugify()` truncation to 40 chars (AC-33)
- `slugify()` parity across modes (AC-34)

**`src/config.test.ts`** (NEW):
- `mergeConfig()` deep-merges `git` sub-object (FR-6)
- `loadConfig()` with `STEEL_GIT_BRANCH_PREFIX` env var (AC-14)
- `loadConfig()` with invalid `STEEL_GIT_WORKFLOW` env var (AC-15)

### Integration Tests

**`src/git-ops.test.ts`** (NEW):
- `initBranch()` with remote-only baseBranch → auto-tracks (AC-16)
- `initBranch()` with nonexistent baseBranch → clear error (AC-17)

**`commands/specify.test.ts`** (NEW):
- Full specify flow with `feature/` config → `feature/001-test` (AC-6)
- Full specify flow with `eda-` and `--id PROJ-21` → `eda-PROJ-21-add-auth` (AC-7)
- Default config → `spec/001-test` (AC-8)

**`src/doctor.test.ts`** (EXTEND):
- Drift check with configured prefix and matching branch → pass (AC-11)
- Drift check with configured prefix and `spec/` branch → legacy warning (AC-12)

**`src/workflow.test.ts`** (NEW):
- Recovery detects `feature/002-add-auth` with `feature/` config (AC-9)
- Recovery detects `spec/001-doctor` with `feature/` config (legacy fallback, AC-10)

**`commands/init.test.ts`** (NEW):
- Init stores git values under `git` key (AC-13)
- Re-init preserves existing non-git fields (AC-27)
- Invalid baseBranch re-prompts (AC-28)

### Build Verification

AC-29: `npm run build`, `npm test`, `npm run lint` all pass clean.

### Test Infrastructure

All tests use Vitest. Git integration tests use temporary directories with `git init` for isolation (same pattern as existing `doctor.test.ts`). No mocking of git — tests run real git commands against temp repos.
