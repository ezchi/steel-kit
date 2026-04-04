# Gauge Review — Task Breakdown Iteration 1

### [WARNING] Missing doctor test file reference
- **Location**: Task 8
- **Issue**: Task 8 step 5 requires doctor test but `src/doctor.test.ts` not in Files list.
- **Suggestion**: Add `src/doctor.test.ts` to Task 8's Files list.

### [WARNING] Dependency metadata is incomplete
- **Location**: Task 5, Task 8
- **Issue**: Task 5 depends on Task 1 too (removes Gemini import). Task 8 command-installer tests could run after Tasks 1-2 without waiting for 3-5.
- **Suggestion**: Fix Task 5 deps. Split or narrow Task 8 deps.

### [NOTE] Task 8 "done when" criteria are too generic
- **Location**: Task 8
- **Issue**: "All new tests pass" too vague for FR-6/AC-2/AC-5/AC-9.
- **Suggestion**: Add concrete checks.

VERDICT: REVISE
