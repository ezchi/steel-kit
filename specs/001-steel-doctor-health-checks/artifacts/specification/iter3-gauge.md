## Iteration 3 Gauge Review

### BLOCKING issues from iteration 2 — resolution status

**BLOCKING 1 (FR-9/11/13/AC-5 canonical input inconsistency): RESOLVED.**
FR-9 now correctly separates `resources/commands/` as the sole generator input from `prompts/` and `templates/` as installation health checks. FR-11 explicitly scopes staleness to `resources/commands/*.md` only. AC-5 is narrowed to match. The severity matrix assigns appropriate levels. Verified against `src/command-installer.ts:13,22-24`.

**BLOCKING 2 (FR-7 stage/file mapping mismatch): RESOLVED.**
FR-7 now explicitly declares a doctor-specific cumulative prerequisite policy and explains why it differs from the runtime's one-file-per-stage mapping. Cites `src/workflow.ts` `fileMap`. Correctly notes `implementation` has no output file. Severity matrix differentiates completed-stage (`fail`) from current-stage (`warn`) missing files. Verified against `src/workflow.ts:461-468`.

**BLOCKING 3 (severity model underspecified): RESOLVED.**
FR-27 introduces a complete severity matrix with 20 named check IDs. Each maps a condition to exactly one severity. Check IDs are stable kebab-case identifiers suitable for the `--json` output `diagnostics[].id` field (FR-23). Exit code behavior (FR-21/FR-22) is fully deterministic from the matrix. No ambiguous severities remain.

### WARNING issues from iteration 2 — resolution status

**WARNING 1 (FR-6 ignores `state.branch`): RESOLVED.**
FR-6 now includes three branch-related drift rules covering `state.branch` vs `spec/<state.specId>`, current git branch vs `state.branch`, and `state.specId` vs git branch. The severity matrix maps these to `warn` (metadata drift) vs `fail` (identity mismatch). Verified against `WorkflowState.branch` at `src/workflow.ts:46`.

**WARNING 2 (FR-8 too vague): RESOLVED.**
FR-8 now defines explicit recovery detection: git tags matching `steel/*-complete`, spec directories with stage output files, and exact diagnostic/remediation text. Correctly references existing `loadState` recovery at `src/workflow.ts:96-114`. No-signal case correctly produces no diagnostic.

### New issues

None found. Internal consistency, testability, constitution alignment, and completeness are satisfactory.

NOTE: The spec is well-scoped, internally consistent, and addresses all prior feedback. The severity matrix makes `--json` output and CI behavior fully deterministic. The one remaining open question (auth diagnostic depth) is appropriately constrained by FR-17.

VERDICT: APPROVE
