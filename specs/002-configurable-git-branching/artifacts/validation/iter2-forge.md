# Validation — Forge Output (Iteration 2)

## Changes from Iteration 1

Added missing tests identified by Gauge review:

### New test file: `src/workflow.test.ts` (2 tests)
- AC-9: Recovery detects `feature/002-add-auth` with `feature/` config → specId=002-add-auth
- AC-10: Recovery detects `spec/001-doctor` with `feature/` config (legacy fallback) → specId=001-doctor

### Extended: `src/doctor.test.ts` (+2 tests, now 13 total)
- AC-11: `feature/` config + `feature/002-test` branch → no drift failures
- AC-12: `feature/` config + `spec/002-test` branch → drift-legacy-prefix warn only, no failures

Total: 77 tests across 7 test files, all passing.
