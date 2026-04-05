# Gauge Review — Task Breakdown Iteration 2

### [WARNING] Task 8c asserts against a diagnostic field that does not exist
- **Location**: Task 8c
- **Issue**: Done-when references `label` field but `Diagnostic` only has `id`, `status`, `summary`, `details`, `remediation`.
- **Suggestion**: Assert against `summary` field instead.

### [WARNING] The task list drops the CL-4 validation step
- **Location**: Task 9
- **Issue**: Plan includes manual Codex smoke-test for `/steel-` shared surface (CL-4) but Task 9 omits it.
- **Suggestion**: Add CL-4 smoke-test step to Task 9.

VERDICT: REVISE
