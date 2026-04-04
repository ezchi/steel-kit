# Task 7: Add new tests for namespaced tag behavior — Forge Iteration 1

## Files Changed
- `src/workflow.test.ts` — modified (added 8 new tests: tagStage format, multi-spec coexistence, recovery with/without specId, legacy tag handling, resolveSpecId)
- `src/doctor.test.ts` — modified (added 4 new tests: state recovery with namespaced tags, scoped/broad pattern, legacy tag handling)
- `commands/clean.test.ts` — created (4 new tests: scoped cleanup, branch/specs-dir fallback, legacy tag handling)

## Key Implementation Decisions
- Used real git repos (integration test style) consistent with existing workflow.test.ts and doctor.test.ts patterns.
- clean.test.ts uses `vi.mock` with `importOriginal` for git-ops.js to preserve real `getCurrentBranch` while mocking `commitStep`.
- clean.test.ts mocks `confirm` to auto-approve and `die` to throw for test assertions.
- Each test creates its own temp directory with isolated git repo.

## Deviations from Plan
- None.

## Tests Added
- `src/workflow.test.ts`:
  - `creates tag in steel/<specId>/<stage>-complete format (AC-1)`
  - `multi-spec tags coexist without overwriting (AC-2)`
  - `recovers completed stages from namespaced tags (AC-4)`
  - `skips tag-based recovery when specId is null (AC-5)`
  - `ignores legacy flat tags alongside namespaced tags (AC-9)`
  - `resolves from branch with configured prefix`
  - `falls back to specs-dir when branch does not match`
  - `returns null when no resolution path succeeds`
- `src/doctor.test.ts`:
  - `detects namespaced tags as recoverable when specId known (AC-6)`
  - `uses scoped tag pattern with branch-derived specId (AC-11)`
  - `falls back to broad pattern with no resolvable specId (AC-12)`
  - `ignores legacy flat tags — only namespaced tags count (AC-9)`
- `commands/clean.test.ts`:
  - `only deletes active spec tags, other spec tags remain (AC-3)`
  - `resolves specId from branch when state.specId is null (AC-13)`
  - `resolves specId from specs-dir when branch fails (AC-13 specs-dir path)`
  - `ignores legacy flat tags during scoped cleanup (AC-9)`
