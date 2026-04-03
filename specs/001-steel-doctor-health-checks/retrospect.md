# Retrospect: steel doctor

## Workflow Summary

| Stage | Iterations | Forge-Gauge Cycles | Notes |
|-------|-----------|-------------------|-------|
| Specification | 3 | 3 | Gauge rejected iter1 and iter2; iter3 approved |
| Clarification | 1 | 1 | Approved on first iteration |
| Planning | 1 | 1 | Approved on first iteration |
| Task Breakdown | 1 | 1 | Approved on first iteration |
| Implementation | 1 | 1 | Tasks 1-7 batched; tasks 8-10 sequential |
| Validation | 1 | 1 | 22 PASS, 0 FAIL, 3 DEFERRED |

**Total Forge-Gauge cycles**: 8
**Config**: Forge=codex, Gauge=codex (but in practice, Claude served as both since gauge is `claude` in the CLI session)
**Skills used**: None — `steel doctor` is a standard TypeScript CLI command, no SystemVerilog or specialized skills needed.

## Memories to Save

### Memory 1: Specification stage commonly needs 3 iterations for new commands
- **Type**: project
- **Name**: spec-iteration-count
- **Content**: The specification stage for a new CLI command took 3 iterations. The Gauge's first two rejections were substantive (canonical source inconsistency, stage-file mapping mismatch, missing severity matrix). Expect 2-3 iterations for spec stages that introduce non-trivial new functionality.
- **Evidence**: `artifacts/specification/iter2-gauge.md` — 3 BLOCKING issues. `artifacts/specification/iter3-gauge.md` — all resolved, APPROVE.
- **Rationale**: Helps set expectations for future spec work. Not derivable from code.

### Memory 2: Gauge severity matrix feedback pattern
- **Type**: feedback
- **Name**: gauge-demands-severity-matrix
- **Content**: When a spec defines pass/warn/fail diagnostics without an explicit severity matrix mapping every check to a severity, the Gauge will block with a BLOCKING issue. Always include a complete severity matrix table in specs that define diagnostic output.
- **Evidence**: `artifacts/specification/iter2-gauge.md` — "The severity model is underspecified for several core checks... Without a severity matrix, `--json` output and CI behavior are not stable enough for automation"
- **Rationale**: This feedback pattern will recur for any future diagnostic or reporting feature.

## Skill Updates

No skills were invoked during this workflow (`skillsUsed` is `[]` for all stages). No skill updates applicable.

### Steel-Kit Workflow Command Observations

**steel-validate**: The newly added self-check step (step e — count verdicts and verify line numbers) worked well as a forcing function for report accuracy. No issues observed.

**steel-specify/steel-clarify**: The newly added delta clarification mode was not exercised because the user approved at the first gate presentation. No observations on its effectiveness yet.

## Process Improvements

### Bottlenecks

**Specification stage (3 iterations)**: Root cause was the initial spec making claims about runtime behavior without verifying them against the actual source code. The Gauge correctly caught that FR-9/FR-11/FR-13 conflated `prompts/` and `templates/` with surface generation inputs, and that FR-7 falsely claimed to match the runtime's file mapping.

- `artifacts/specification/iter1-gauge.md` → REVISE (not available in artifacts, was pre-existing)
- `artifacts/specification/iter2-gauge.md` → REVISE: 3 BLOCKING (canonical inconsistency, file mapping mismatch, missing severity matrix), 2 WARNING (drift detection incomplete, recovery too vague). **Classification: all caught real defects (a).**
- `artifacts/specification/iter3-gauge.md` → APPROVE: all issues resolved.

No other stage required more than 1 iteration.

### Forge-Gauge Dynamics

All REVISE verdicts caught real defects. No unnecessary churn observed. The Gauge's insistence on verifying claims against actual source code (citing specific files and line numbers) was the primary quality driver.

### Constitution Gaps

None identified. The constitution's guidance on shared code, auditability, provider parity, and Linux/macOS targeting was sufficient for this feature.

### Workflow Gaps

None. The 7-stage workflow (specification → clarification → planning → task_breakdown → implementation → validation → retrospect) was well-suited for this feature. The implementation stage's per-task loop worked well for batching related tasks.
