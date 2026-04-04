# Task 4: Scope tag cleanup in commands/clean.ts — Forge Iteration 1

## Files Changed
- `commands/clean.ts` — modified (imports `resolveSpecId`, adds fallback resolution, scoped tag pattern, updated user messages)

## Key Implementation Decisions
- After `loadState()`, if `state.specId` is null, calls `resolveSpecId()` for branch/specs-dir fallback per FR-5.
- Tag pattern: `steel/<specId>/*-complete` when specId known, `steel/*/*-complete` as last resort.
- Warns user when falling back to global deletion.
- Updated preview message to show scoped pattern.

## Deviations from Plan
- None.

## Tests Added
- None yet (Task 7).
