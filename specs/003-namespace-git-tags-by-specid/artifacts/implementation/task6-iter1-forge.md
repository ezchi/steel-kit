# Task 6: Update and fix existing tests — Forge Iteration 1

## Files Changed
- None — all 77 existing tests pass without modification.

## Key Implementation Decisions
- Existing tests in `src/workflow.test.ts` test `loadState()` recovery which internally uses `resolveSpecId()` and the new scoped tag patterns. Tests pass because they test through the public API rather than referencing tag format strings directly.
- Existing tests in `src/doctor.test.ts` don't exercise `checkStateRecovery()` with tags, so no changes needed.
- No test references the old `steel/<stage>-complete` format string.

## Deviations from Plan
- None — task description said "fix any tests broken by Tasks 1-5", and none were broken.

## Tests Added
- None (this task is about fixing existing tests, not adding new ones).
