# Task 1: Extract resolveSpecId() into src/git-config.ts — Forge Iteration 2

## Files Changed
- `src/workflow.ts` — modified (`recoverState()` branch assignment now verifies specId matches branch-derived value)

## Key Implementation Decisions
- Fixed behavioral divergence from original `recoverState()`: now verifies that branch-derived specId matches `resolveSpecId()` return value before setting `state.branch`. Prevents incorrect branch assignment when specId came from specs-dir fallback.
- Single branch lookup in `resolveSpecId()` determines specId; second lookup in `recoverState()` only confirms provenance.

## Deviations from Plan
- None.

## Tests Added
- None yet (Task 6 covers test updates).
