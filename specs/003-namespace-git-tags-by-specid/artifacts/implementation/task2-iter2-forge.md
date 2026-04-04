# Task 2: Add specId parameter to tagStage() — Forge Iteration 2

## Files Changed
- `src/workflow.ts` — modified (`advanceStage()` now throws if specId is missing instead of falling back to 'unknown')

## Key Implementation Decisions
- Removed `?? 'unknown'` fallback per gauge BLOCKING feedback. Creating `steel/unknown/<stage>-complete` tags violates FR-2 and creates orphan tags that don't participate in recovery.
- `advanceStage()` now throws `Error('Cannot tag stage completion: specId is not set')` — this is the correct behavior since specId should always be set by the time a stage advances.

## Deviations from Plan
- None.

## Tests Added
- None yet (Task 6/7).
