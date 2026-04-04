# Task 7: Add new tests for namespaced tag behavior — Forge Iteration 2

## Files Changed
- `src/doctor.test.ts` — fixed AC-6 (removed spec file so only tags prove recoverability), fixed AC-11 (test now verifies scoped pattern by asserting no recovery when only other spec's tags exist)
- `commands/clean.test.ts` — fixed AC-13 specs-dir (added second spec's tag and asserted survival), added unresolvable specId fallback test

## Key Implementation Decisions
- AC-6: Removed `spec.md` from test setup so `hasSpecFiles` is false — tag detection is the only path to recoverability.
- AC-11: Inverted the test — only creates tags for `001-other`, not `003-test`. With scoped pattern `steel/003-test/*-complete`, no tags match → no recovery detected. A broad pattern would falsely match.
- AC-13: Added `001-first` spec tags alongside `003-test` and asserted `001-first` survives, proving scoped deletion.
- Added new test for unresolvable specId → global `steel/*/*-complete` fallback.

## Deviations from Plan
- None.

## Tests Added
- Fixed 3 existing tests (AC-6, AC-11, AC-13)
- Added 1 new test: `falls back to global deletion with warning when specId unresolvable`
