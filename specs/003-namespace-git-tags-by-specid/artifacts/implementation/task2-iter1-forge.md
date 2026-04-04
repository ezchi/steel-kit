# Task 2: Add specId parameter to tagStage() — Forge Iteration 1

## Files Changed
- `src/git-ops.ts` — modified (added `specId` param, changed tag format to `steel/${specId}/${stage}-complete`)
- `src/workflow.ts` — modified (updated `advanceStage()` call to pass `state.specId`)

## Key Implementation Decisions
- Used `state.specId ?? 'unknown'` as fallback to avoid runtime errors if specId is missing.
- `specId` is the first parameter to make the function signature read naturally: `tagStage(specId, stage, projectRoot)`.

## Deviations from Plan
- None.

## Tests Added
- None yet (Task 6/7).
