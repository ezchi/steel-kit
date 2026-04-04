# Task 1: Extract resolveSpecId() into src/git-config.ts — Forge Iteration 1

## Files Changed
- `src/git-config.ts` — modified (added `resolveSpecId()` export and required imports)
- `src/workflow.ts` — modified (refactored `recoverState()` to use `resolveSpecId()`)

## Key Implementation Decisions
- Placed `resolveSpecId()` in `src/git-config.ts` per gauge feedback — keeps it with git/config concerns, avoids coupling doctor and clean to the workflow engine.
- `resolveSpecId()` returns `string | null`; callers convert to `undefined` as needed for `WorkflowState.specId`.
- Preserved branch assignment logic in `recoverState()` — only sets `state.branch` when specId was derived from a branch.

## Deviations from Plan
- None — implementation follows the plan exactly.

## Tests Added
- None yet (Task 6 covers test updates).
