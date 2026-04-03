# Implementation Plan: steel doctor

## Architecture Overview

The `steel doctor` command is a **non-stage diagnostic command** — it does not participate in the Forge-Gauge loop, does not modify state, and does not advance stages. It follows the same command pattern as `commands/status.ts` (read-only, no stage guard) rather than stage commands like `commands/validate.ts`.

The diagnostic logic lives in a shared module (`src/doctor.ts`) so it is testable independent of the CLI, importable by any provider surface, and consistent across Codex/Gemini/Claude (FR-24).

## Components

### 1. `src/doctor.ts` — Core diagnostic engine

**Responsibility**: Run all checks, collect diagnostics, compute overall status.

**Interface**:
```typescript
interface Diagnostic {
  id: string;          // Check ID from severity matrix (e.g., 'init-steel-dir')
  status: 'pass' | 'warn' | 'fail';
  summary: string;     // One-line description
  details?: string;    // Extended explanation
  remediation?: string; // Command or instruction
}

interface DoctorResult {
  status: 'pass' | 'warn' | 'fail';
  diagnostics: Diagnostic[];
  counts: { pass: number; warn: number; fail: number };
}

async function runDoctor(projectRoot: string): Promise<DoctorResult>;
```

**Dependencies**: Imports from `config.ts` (loadConfig, path helpers), `workflow.ts` (loadState, STAGE_ORDER), `command-installer.ts` (rendering functions), `providers/index.ts` (getProvider), `git-ops.ts` (getCurrentBranch), and `constitution.ts` (placeholder detection).

**Check execution order** (matches FR numbering, early-exit on hard init failures):

1. **Init checks** (FR-4): `.steel/` dir, `config.json`, `constitution.md`, `.gitignore`, `state.json` parse. If `.steel/` is missing, skip all subsequent checks (nothing to diagnose).
2. **Constitution check** (FR-5): Placeholder detection using existing `isPlaceholder()` from `constitution.ts`.
3. **Drift checks** (FR-6): `state.specId` vs git branch, `state.branch` vs git branch, `state.branch` vs `spec/<specId>`, `specId` vs spec directory. Only run when `state.json` was successfully loaded and `specId` is present.
4. **Stage file checks** (FR-7): Cumulative prerequisites per stage. Only run when a spec is active.
5. **State recovery check** (FR-8): Only run when `state.json` is absent. Check for `steel/*-complete` tags and spec files.
6. **Canonical source checks** (FR-9): `resources/commands/` existence and content, `prompts/` existence, `templates/` existence.
7. **Surface checks** (FR-10/11/13): Presence and staleness per surface type. Uses imported rendering functions for byte-for-byte comparison.
8. **Provider checks** (FR-14/15/16): CLI availability via `which`/`command -v`. Configured vs unconfigured severity split.
9. **Auth checks** (FR-17): Env var presence for each provider.

Each check function returns one or more `Diagnostic` objects. The runner collects them all, computes `counts` and overall `status`, and returns `DoctorResult`.

### 2. `commands/doctor.ts` — CLI command entrypoint

**Responsibility**: Parse CLI flags, call `runDoctor()`, format and print output, set exit code.

**Interface**:
```typescript
export async function cmdDoctor(opts: { json?: boolean }): Promise<void>;
```

**Two output modes**:
- **Human-readable** (default): Grouped by category with pass/warn/fail indicators and colors using existing `log` utilities from `utils.ts`. Summary line at the end.
- **JSON** (`--json`): Print `DoctorResult` as JSON to stdout and exit.

**Exit code**: `process.exit(1)` when `result.status === 'fail'`, otherwise `process.exit(0)`.

### 3. `src/command-installer.ts` — Export `renderGeminiCommandToml`

**Change**: Add `export` keyword to the existing `renderGeminiCommandToml` function. No logic changes.

**Rationale**: Per CLR-2, doctor must import the actual rendering functions to compute expected surface content. `renderCodexSkill` is already exported. `renderGeminiCommandToml` needs the same treatment.

### 4. `resources/commands/steel-doctor.md` — Command definition for surface installation

**Responsibility**: Canonical command definition installed to `.claude/commands/`, `.gemini/commands/`, `.agents/skills/` by the command installer.

**Content**: Brief description of `steel doctor` purpose and usage. Unlike stage commands, this is a simple help text — it does not contain Forge-Gauge loop instructions.

## Data Model

No new persistent data. Doctor is read-only (FR-3).

**Input data**:
- `.steel/config.json` → `SteelConfig` (via `loadConfig`)
- `.steel/state.json` → `WorkflowState` (via `loadState`, error-tolerant)
- `.steel/constitution.md` → raw string (direct read)
- `resources/commands/*.md` → canonical source files
- `.claude/commands/`, `.gemini/commands/`, `.agents/skills/` → installed surface files
- Git branch → `getCurrentBranch()` from `git-ops.ts`
- Git tags → `git tag -l 'steel/*-complete'`
- PATH → `which codex`, `which gemini`, `which claude`
- Environment → `process.env.ANTHROPIC_API_KEY`, etc.

**Output data**: `DoctorResult` object → formatted to stdout.

## API Design

No external API. Internal module API:

```typescript
// src/doctor.ts
export async function runDoctor(projectRoot: string): Promise<DoctorResult>;
export interface Diagnostic { ... }
export interface DoctorResult { ... }

// commands/doctor.ts  
export async function cmdDoctor(opts: { json?: boolean }): Promise<void>;
```

## Dependencies

No new external dependencies. Uses only:
- `node:fs/promises` (readFile, readdir, access)
- `node:fs` (existsSync)
- `node:path` (resolve)
- `node:child_process` (execFile — for `which`/`git tag`)
- Existing internal modules (config, workflow, command-installer, providers, git-ops, utils, constitution)

## Implementation Strategy

### Phase 1: Foundation
1. Export `renderGeminiCommandToml` from `command-installer.ts`
2. Create `src/doctor.ts` with `DoctorResult`/`Diagnostic` types and the `runDoctor` skeleton that collects diagnostics from check functions
3. Create `commands/doctor.ts` with `cmdDoctor` and both output formatters
4. Wire `doctor` command in `src/cli.ts`
5. Create `resources/commands/steel-doctor.md`

### Phase 2: Init and constitution checks
6. Implement init checks (FR-4): `.steel/` dir, `config.json`, `constitution.md`, `.gitignore`, `state.json` parse
7. Implement constitution check (FR-5): reuse `isPlaceholder()` or equivalent
8. Implement state recovery check (FR-8): git tags + spec file scan

### Phase 3: Drift and stage file checks
9. Implement drift checks (FR-6): all five sub-rules
10. Implement stage file checks (FR-7): cumulative prerequisites with prior/current severity split

### Phase 4: Surface checks
11. Implement canonical source checks (FR-9): `resources/commands/`, `prompts/`, `templates/`
12. Implement surface presence checks (FR-10): enumerate expected files per surface
13. Implement staleness detection (FR-11/13): render expected content, byte-for-byte compare

### Phase 5: Provider checks
14. Implement provider CLI checks (FR-14/15/16): `which` for each CLI binary
15. Implement auth env var checks (FR-17): check `process.env` for provider-specific keys

### Phase 6: Tests
16. Unit tests for `src/doctor.ts` check functions with mocked filesystem
17. Integration test: run `cmdDoctor` in a temp directory with known state

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `renderGeminiCommandToml` export breaks something | Low — adding `export` to an existing function is additive | Run existing tests (`npm test`) after the change |
| Staleness detection false positives from line endings or encoding | Medium — would cause spurious `surface-stale` warnings | Use consistent UTF-8 reads and normalize line endings before comparison |
| `which` behavior differs between macOS and Linux | Low — `which` is POSIX-standard on both | Use `execFile('which', [name])` and check exit code; fall back to `command -v` if needed |
| Doctor crashes on corrupt `state.json` | Medium — defeats the purpose of diagnosing corrupt state | Wrap `JSON.parse` in try/catch and emit `init-state-corrupt` diagnostic instead of throwing |
| Git not available or not a git repo | Low — doctor should work in non-git contexts too | Wrap git operations in try/catch; skip drift checks and report a `warn` if git is unavailable |

## Testing Strategy

**Unit tests** (`src/doctor.test.ts`):
- Each check function tested in isolation with a controlled temp directory
- Test cases per severity matrix row: verify correct `id`, `status`, `summary`, and `remediation`
- Test `runDoctor` aggregation: multiple diagnostics → correct `counts` and `status`
- Test corrupt `state.json` → `init-state-corrupt` diagnostic (not a crash)
- Test staleness detection with known canonical → surface mismatches

**Integration tests**:
- Full `cmdDoctor` run in a temp project directory:
  - Uninitialized repo → `fail` exit code, initialization diagnostics
  - Healthy repo → `pass` exit code, all pass
  - Stale surfaces → `warn` diagnostics
- JSON output mode: parse stdout, validate schema matches `DoctorResult`

**Existing tests**: Run `npm test` after `renderGeminiCommandToml` export to verify no regressions.
