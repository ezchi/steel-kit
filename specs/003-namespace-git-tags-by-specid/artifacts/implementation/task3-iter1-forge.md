# Task 3: Scope getCompletedStagesFromTags() by specId — Forge Iteration 1

## Files Changed
- `src/workflow.ts` — modified (`getCompletedStagesFromTags()` now takes `specId`, scoped glob/regex; `recoverState()` skips tags if specId is null)

## Key Implementation Decisions
- Regex changed from `/^steel\/(.+)-complete$/` to `/^steel\/[^/]+\/(.+)-complete$/` — uses `[^/]+` to match exactly one path segment.
- When specId is null, returns empty set instead of listing all tags — file-based recovery still works.

## Deviations from Plan
- None.

## Tests Added
- None yet (Task 6/7).
