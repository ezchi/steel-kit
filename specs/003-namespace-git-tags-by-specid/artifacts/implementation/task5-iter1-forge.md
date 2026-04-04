# Task 5: Scope tag detection in src/doctor.ts — Forge Iteration 1

## Files Changed
- `src/doctor.ts` — modified (imports `resolveSpecId`, uses scoped tag pattern in `checkStateRecovery()`)

## Key Implementation Decisions
- Uses `resolveSpecId()` when config is available; falls back to broad `steel/*/*-complete` pattern otherwise.
- Spec-file scanning remains broad (deliberate divergence per FR-6).

## Deviations from Plan
- None.

## Tests Added
- None yet (Task 6/7).
