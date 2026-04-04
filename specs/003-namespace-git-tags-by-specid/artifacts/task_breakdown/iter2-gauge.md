# Gauge Review — Task Breakdown Iteration 2

- **[BLOCKING]**: No test covers the `specs/` directory fallback path — when branch detection fails and the highest-numbered specs entry is used. This is required by FR-5 and FR-6. AC-13 is only partially exercised.

- **[WARNING]**: AC-9 "legacy coexistence" spans 3 code paths (clean, recoverState, doctor) but task doesn't specify which test file covers each.

- **[NOTE]**: Previous issues resolved.

VERDICT: REVISE
