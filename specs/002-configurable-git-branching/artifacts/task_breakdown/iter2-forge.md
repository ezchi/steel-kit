# Task Breakdown: Configurable Git Branching Workflow Support

## Phase 1: Config layer and new modules

### Task 1: Create `src/git-config.ts` — types, presets, resolution, validation
**Files**: `src/git-config.ts` (new)
**Dependencies**: None
**Acceptance Criteria**: AC-1, AC-2, AC-3, AC-18, AC-24, AC-25, AC-26

**Subtasks**:
1. Define `GIT_PRESETS` constant with `steel`, `github-flow`, `gitflow` defaults (FR-4)
2. Implement `resolveGitConfig(config)` with merge → preset fill → validate flow (FR-5)
3. Implement `validateBranchPrefix(value)` — allows trailing `/`, rejects empty, `..`, control chars, `~^:?*[\` (NFR-5)
4. Implement `validateBranchName(value, fieldName)` — standard git branch name rules (NFR-5)
5. Implement `validateSpecIdComponent(value)` — single path segment, no `/`, git-ref-format rules (FR-14)
6. Implement `validateComposedRef(prefix, specId)` — validates composed ref as valid git ref
7. In `resolveGitConfig()`, run composed-ref smoke test with dummy suffix `000-test` for non-preset prefixes

**Verification**: `npm run build` passes. Unit tests in Task 4 cover all validation and resolution paths.

---

### Task 2: Create `src/spec-id.ts` — spec ID generation, slugification, validation
**Files**: `src/spec-id.ts` (new)
**Dependencies**: Task 1 (imports `validateSpecIdComponent`)
**Note**: Does NOT touch `commands/specify.ts` — the local `generateSpecId()` removal and all specify wiring happens in Task 6 to maintain build-safety at the phase boundary.
**Acceptance Criteria**: AC-4, AC-5, AC-30, AC-31, AC-32, AC-33, AC-34

**Subtasks**:
1. Implement `slugify(description)` — lowercase, strip non-`[a-z0-9\s]`, trim, collapse whitespace to hyphens, truncate to 40 chars (FR-15b)
2. Implement `generateSpecId(opts)` — when `customId` provided: validate via `validateSpecIdComponent()`, format as `<customId>-<slugify(description)>` (FR-15); when omitted: auto-increment with 3-digit padding (FR-16)
3. Implement collision detection — check `existsSync(path.join(specsDir, specId))`, fail with specific error message (FR-15a)
4. Export `GenerateSpecIdOpts` interface

**Verification**: `npm run build` passes. Unit tests in Task 4 cover all paths.

---

### Task 3: Update `src/config.ts` — add git types, deep-merge, env vars
**Files**: `src/config.ts`
**Dependencies**: None (types only, no dependency on `git-config.ts`)
**Acceptance Criteria**: AC-14, AC-15

**Subtasks**:
1. Add `GitWorkflow`, `GitConfig`, `ResolvedGitConfig` type exports (FR-1, FR-2, FR-3, FR-5)
2. Add `git?: GitConfig` to `SteelConfig` interface
3. Update `mergeConfig()` to deep-merge `git` sub-object: `git: { ...base.git, ...(override.git ?? {}) }` (FR-6)
4. Add `STEEL_GIT_*` env var handling in `loadConfig()` after YAML/JSON merge (FR-7):
   - `STEEL_GIT_WORKFLOW` — validate as `GitWorkflow`, warn + ignore if invalid
   - `STEEL_GIT_BRANCH_PREFIX`, `STEEL_GIT_BASE_BRANCH`, `STEEL_GIT_DEVELOP_BRANCH` — string overrides
5. Add `deferWrite` option to `initConfig()` — when true, return provider selections without writing to disk (FR-27 support)

**Verification**: `npm run build` passes. Existing tests still pass. Unit tests in Task 4 verify env var behavior.

---

### Task 4: Write Phase 1 unit tests
**Files**: `src/git-config.test.ts` (new), `src/spec-id.test.ts` (new), `src/config.test.ts` (new)
**Dependencies**: Tasks 1, 2, 3
**Acceptance Criteria**: AC-1–5, AC-14, AC-15, AC-18–26, AC-30–34

**Subtasks**:
1. `src/git-config.test.ts`:
   - `resolveGitConfig({})` → steel defaults (AC-1)
   - `resolveGitConfig({ git: { workflow: 'gitflow' } })` → gitflow defaults with `developBranch` (AC-2)
   - `resolveGitConfig({ git: { workflow: 'gitflow', branchPrefix: 'eda-' } })` → override wins (AC-3)
   - Explicit `developBranch` validates as branch name (NFR-5)
   - Invalid `developBranch` (e.g. `develop~1`) → rejects (NFR-5)
   - `validateBranchPrefix()` accepts `spec/`, `feature/`, `eda-`; rejects empty, `..` (AC-18/24/25)
   - `validateBranchName()` rejects `~` (AC-26), trailing `/`, empty; accepts `main`, `develop`
   - `validateSpecIdComponent()` rejects space (AC-19), `~` (AC-20), `/` (AC-22), `..` (AC-23); accepts valid (AC-21)
   - `validateComposedRef()` accepts valid compositions; rejects invalid
   - Non-preset prefix runs composed-ref smoke test during resolution

2. `src/spec-id.test.ts`:
   - `generateSpecId()` with `--id PROJ-21` + `"add auth"` → `PROJ-21-add-auth` (AC-4)
   - `generateSpecId()` without `--id` + `"add auth"` with 1 existing spec → `002-add-auth` (AC-5)
   - Collision detection with existing dir → error (AC-30)
   - `slugify()` lowercase + strip `!` + collapse (AC-31)
   - `slugify()` trim whitespace, no leading/trailing hyphens (AC-32)
   - `slugify()` truncation to 40 chars (AC-33)
   - `slugify()` parity across `--id` and non-id modes (AC-34)

3. `src/config.test.ts`:
   - `mergeConfig()` deep-merges `git` sub-object (FR-6)
   - `loadConfig()` with `STEEL_GIT_BRANCH_PREFIX=eda-` overrides config (AC-14)
   - `loadConfig()` with `STEEL_GIT_BASE_BRANCH` env var (FR-7)
   - `loadConfig()` with `STEEL_GIT_DEVELOP_BRANCH` env var (FR-7)
   - `loadConfig()` with invalid `STEEL_GIT_WORKFLOW` → warning, default applies (AC-15)
   - Multiple `STEEL_GIT_*` env vars simultaneously

**Verification**: `npm run build && npm test && npm run lint` all pass.

---

## Phase 2: Core integration

### Task 5: Update `src/git-ops.ts` — new `initBranch()` implementation
**Files**: `src/git-ops.ts`
**Dependencies**: Task 1 (imports `ResolvedGitConfig`, `validateComposedRef`)
**Acceptance Criteria**: AC-6, AC-7, AC-16, AC-17

**Subtasks**:
1. Change `initBranch()` signature to `(specId, projectRoot, gitConfig: ResolvedGitConfig): Promise<string>`
2. Call `ensureClean()` before switching (FR-11)
3. Checkout `gitConfig.baseBranch` (FR-10):
   - Check local branch exists via `git rev-parse --verify <baseBranch>`
   - If not, check `origin/<baseBranch>` exists → create local tracking branch (FR-12)
   - If neither exists → throw with clear error naming missing branch
4. Create branch `gitConfig.branchPrefix + specId` via `git checkout -b` (FR-9)
5. Call `validateComposedRef(prefix, specId)` defensively before branch creation
6. Return the created branch name (FR-13)

**Verification**: `npm run build` passes. Integration tests in Task 7.

---

### Task 6: Update `commands/specify.ts` and `src/cli.ts` — wire `--id` flag and new functions
**Files**: `commands/specify.ts`, `src/cli.ts`
**Dependencies**: Tasks 1, 2, 5
**Acceptance Criteria**: AC-6, AC-7, AC-8

**Subtasks**:
1. In `src/cli.ts`, add `.option('--id <value>', 'Custom spec identifier (e.g. Jira ticket ID)')` to `specify` command
2. Update `cmdSpecify()` signature to accept `opts?: { id?: string }`
3. Call `resolveGitConfig(config)` to get resolved git config
4. Replace local `generateSpecId()` call with imported `generateSpecId()` from `src/spec-id.ts`, passing `customId: opts?.id`
5. Pass `resolvedGitConfig` to `initBranch()`
6. Use branch name returned by `initBranch()` for `state.branch` (FR-18)
7. **Remove blanket `catch` around `initBranch()`** — fail-fast on branch creation errors (FR-11, FR-12)
8. Remove the local `generateSpecId()` function (now in `src/spec-id.ts`)

**Verification**: `npm run build` passes. Command tests in Task 7.

---

### Task 7: Write Phase 2 integration tests
**Files**: `src/git-ops.test.ts` (new), `commands/specify.test.ts` (new)
**Dependencies**: Tasks 5, 6
**Acceptance Criteria**: AC-6, AC-7, AC-8, AC-16, AC-17

**Subtasks**:
1. `src/git-ops.test.ts`:
   - `initBranch()` with remote-only baseBranch → auto-creates local tracking branch (AC-16)
   - `initBranch()` with nonexistent baseBranch (local + remote) → clear error (AC-17)

2. `commands/specify.test.ts`:
   - Full flow with `feature/` config → creates `feature/001-test` (AC-6)
   - Full flow with `eda-` + `--id PROJ-21` → creates `eda-PROJ-21-add-auth` (AC-7)
   - Default config → creates `spec/001-test` (AC-8)
   - Invalid `--id` (e.g. `hello world`) → error before branch/file creation (FR-14)
   - Colliding `--id` → error before branch/file creation (FR-15a, AC-30)
   - `initBranch()` failure (dirty tree) → command aborts, no state written (FR-11)

**Verification**: `npm run build && npm test && npm run lint` all pass.

---

## Phase 3: Recovery and diagnostics

### Task 8: Update `src/workflow.ts` — recovery with configurable prefix
**Files**: `src/workflow.ts`
**Dependencies**: Task 1 (imports `resolveGitConfig`)
**Acceptance Criteria**: AC-9, AC-10

**Subtasks**:
1. In `recoverState()`, resolve git config via `resolveGitConfig(config)`
2. Primary branch detection: `branch.startsWith(resolvedGitConfig.branchPrefix)` → extract specId via `branch.slice(branchPrefix.length)` (FR-19)
3. Legacy fallback: if configured prefix is not `spec/` but branch starts with `spec/`, detect and extract specId via `branch.slice(5)` (FR-20)
4. Treat specId as opaque string — no further parsing (FR-21)

**Verification**: `npm run build` passes. Tests in Task 10.

---

### Task 9: Update `src/doctor.ts` — drift checks with configurable prefix
**Files**: `src/doctor.ts`
**Dependencies**: Task 1 (imports `resolveGitConfig`)
**Acceptance Criteria**: AC-11, AC-12

**Subtasks**:
1. In `checkDrift()`, resolve git config and use `resolvedGitConfig.branchPrefix` for expected branch (FR-22)
2. Implement legacy compatibility case: when configured prefix ≠ `spec/` but current branch starts with `spec/<specId>`:
   - Suppress `drift-specid-branch` and `drift-state-branch` failures
   - Emit only `drift-legacy-prefix` warning with remediation (FR-23)
3. Add `drift-legacy-prefix: 'warn'` to severity matrix
4. Extract specId from `spec/` prefix for directory-existence checks in legacy case

**Verification**: `npm run build` passes. Tests in Task 10.

---

### Task 10: Write Phase 3 tests
**Files**: `src/doctor.test.ts` (extend), `src/workflow.test.ts` (new)
**Dependencies**: Tasks 8, 9
**Acceptance Criteria**: AC-9, AC-10, AC-11, AC-12

**Subtasks**:
1. `src/workflow.test.ts`:
   - Recovery detects `feature/002-add-auth` with `feature/` config (AC-9)
   - Recovery detects `spec/001-doctor` with `feature/` config — legacy fallback (AC-10)

2. `src/doctor.test.ts`:
   - Drift check with `feature/` config + `feature/002-test` branch → pass (AC-11)
   - Drift check with `feature/` config + `spec/002-test` branch → warn only, no failures (AC-12)
   - Existing doctor tests still pass with default config

**Verification**: `npm run build && npm test && npm run lint` all pass.

---

## Phase 4: Interactive setup and documentation

### Task 11: Update `commands/init.ts` — git config prompts and re-init preservation
**Files**: `commands/init.ts`, `src/config.ts`
**Dependencies**: Task 1 (imports validation), Task 3 (`deferWrite` option)
**Acceptance Criteria**: AC-13, AC-27, AC-28

**Subtasks**:
1. Add `input()` prompt for base branch (default: `"main"`) after provider prompts (FR-24, FR-25)
2. Add `input()` prompt for branch prefix (default: `"spec/"`) (FR-24, FR-25)
3. Validate base branch with `validateBranchName()`, re-prompt on failure (FR-26)
4. Validate branch prefix with `validateBranchPrefix()`, re-prompt on failure (FR-26)
5. Implement re-init config preservation:
   a. Call `initConfig({ deferWrite: true })` to get provider selections without writing
   b. If `.steel/config.json` exists, read as raw JSON
   c. Merge provider selections and `git` config onto raw JSON
   d. If no existing file, start from `DEFAULT_CONFIG` + selections
   e. Single `fs.writeFileSync()` of final merged object (FR-27)

**Verification**: `npm run build` passes. Tests in Task 13.

---

### Task 12: Update documentation — config template and command resources
**Files**: `steel.config.yaml`, `resources/commands/steel-specify.md`
**Dependencies**: None
**Acceptance Criteria**: FR-28

**Subtasks**:
1. Add commented `git:` section to `steel.config.yaml` documenting fields, presets, defaults (FR-28)
2. Update `resources/commands/steel-specify.md`: document `--id <value>` option, replace `spec/` references with configurable-prefix language

**Verification**: Files contain correct documentation. Surface verification in Phase 5.

---

### Task 13: Write Phase 4 tests
**Files**: `commands/init.test.ts` (new)
**Dependencies**: Task 11
**Acceptance Criteria**: AC-13, AC-27, AC-28

**Subtasks**:
1. `commands/init.test.ts`:
   - Init stores git values under `git` key (AC-13)
   - Re-init preserves existing `forge`, `gauge`, `maxIterations`, `autoCommit`, `specsDir` (AC-27)
   - Invalid `baseBranch` (e.g. `main~1`) re-prompts with error about `~` (AC-28)
   - Invalid `branchPrefix` (e.g. `feat..ure/`) re-prompts with clear error (FR-26)

**Verification**: `npm run build && npm test && npm run lint` all pass.

---

## Phase 5: Final verification

### Task 14: End-to-end smoke tests and surface verification
**Files**: None (testing only)
**Dependencies**: All previous tasks
**Acceptance Criteria**: AC-29

**Subtasks**:
1. Run `npm run build` — compiles without errors
2. Run `npm test` — all tests pass
3. Run `npm run lint` — type-checks clean
4. Run `steel update` — verify installed Claude/Gemini/Codex command files reflect updated `resources/commands/steel-specify.md`
5. Manual smoke test: verify `resolveGitConfig` behavior with each preset (`steel`, `github-flow`, `gitflow`)

**Verification**: AC-29 fully satisfied. All surfaces updated.

---

## Task Dependency Graph

```
Phase 1:  [T1] ─┬─► [T2] ─┐
          [T3] ─┘          ├──► [T4] (tests)
                           │
Phase 2:  [T5] ────────────┤
          [T6] ────────────┤──► [T7] (tests)
                           │
Phase 3:  [T8] ────────────┤
          [T9] ────────────┤──► [T10] (tests)
                           │
Phase 4:  [T11] ───────────┤
          [T12] ───────────┤──► [T13] (tests)
                           │
Phase 5:  [T14] (final verification)

Parallelism: T1∥T3, T5∥T6, T8∥T9, T11∥T12
Sequential: T1→T2→T4, phases are sequential
```

## Summary

14 tasks across 5 phases. Parallelism within phases: T1 and T3 can run in parallel (T2 depends on T1, so T2 runs after T1); T5 and T6 depend on T1/T2/T5 respectively; T8 and T9 can run in parallel; T11 and T12 can run in parallel. Each phase has a test task as its gate. Total coverage: all 34 acceptance criteria, all FRs, all NFRs.
