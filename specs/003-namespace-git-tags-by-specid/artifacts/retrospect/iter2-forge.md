# Retrospect Report: 003-namespace-git-tags-by-specid

## Workflow Summary

| Stage | Iterations | REVISE verdicts | Notes |
|-------|-----------|-----------------|-------|
| Specification | 5 | 4 | Gauge caught missing FR-8/FR-9, incomplete FR-5 resolution chain, FR-6 scope question |
| Clarification | 1 | 0 | Clean pass |
| Planning | 1 | 0 | Clean pass |
| Task Breakdown | 3 | 2 | Missing test coverage for specs-dir fallback and multi-spec coexistence |
| Implementation | 2 (tasks 1-5), 1 (tasks 6,8,9,10), 2 (task 7) | 2 | Tasks 1-5: orphan tags + behavioral divergence. Task 7: false positive tests |
| Validation | 2 | 1 | Wrong line number citation |

- **Forge**: Claude (claude)
- **Gauge**: Codex CLI (codex / gpt-5.4)
- **Skills used**: None (all stages were pure workflow + TypeScript)
- **Total forge-gauge cycles**: ~16

## Memories to Save

### Memory 1: Codex gauge is strict about test false positives
- **Type**: feedback
- **Name**: gauge-strict-test-false-positives
- **Content**: When writing tests for the Codex gauge, ensure each test can ONLY pass if the feature works correctly. Tests that pass trivially (e.g., because another code path produces the same result) will be flagged as BLOCKING.
- **Evidence**: `artifacts/implementation/task7-iter1-gauge.md` — all 3 BLOCKING issues were false positive tests where alternative code paths could satisfy assertions.
- **Rationale**: This pattern cost an extra iteration in task 7. Future test writing should defensively verify that removing the feature would break the test.

### Memory 2: Codex gauge verifies behavioral equivalence in refactors
- **Type**: feedback
- **Name**: gauge-catches-refactor-divergence
- **Content**: When extracting shared functions from existing code, the gauge checks exact behavioral equivalence. The issue found was incorrect branch assignment when specId came from specs-dir fallback — `recoverState()` made a second `getCurrentBranch()` call that could incorrectly set `state.branch` when specId was not derived from the branch.
- **Evidence**: `artifacts/implementation/tasks1-5-iter2-gauge-prompt.md` (issue summary from iteration 1), `artifacts/implementation/task1-iter2-forge.md` (fix description), `artifacts/implementation/task1-iter2-gauge.md` (APPROVE after fix).
- **Rationale**: Future refactors should trace all state derivation paths, not just verify the happy path. When a function's return value is used to set multiple state fields, extraction must preserve the coupling between derivation and assignment.

## Skill Updates

No project-specific skills were invoked during this workflow. No skill updates proposed.

## Process Improvements

### Bottlenecks

1. **Specification stage (5 iterations)**: The gauge found genuinely missing or undertightened requirements in each round:
   - Iter 1→2: Missing FR-8 (canonical command files) and FR-9 (README). **(a) Real defect.**
   - Iter 2→3: FR-5 resolution chain too weak. **(a) Real defect.**
   - Iter 3→4: state.json-exists-but-null-specId edge case in FR-5. **(a) Real defect.**
   - Iter 4→5: Gauge required explicit documentation of the deliberate divergence in FR-6 doctor scope. The Forge added the divergence paragraph to FR-6, and the gauge approved. **(b) Enforced valid standard.**

2. **Task breakdown (3 iterations)**:
   - Iter 1→2: Missing AC-2 multi-spec coexistence test. **(a) Real defect.**
   - Iter 2→3: specs-dir fallback path untested, AC-9 split unclear. **(b) Enforced valid standard.**

3. **Implementation tasks 1-5 (2 iterations)**:
   - `advanceStage()` used `?? 'unknown'` creating orphan tags. **(a) Real defect.**
   - Double branch lookup behavioral divergence. **(a) Real defect.**

### Forge-Gauge Dynamics

The Codex gauge was effective as a reviewer. Out of ~8 REVISE verdicts across all stages:
- **6 caught real defects** (missing FRs, orphan tags, false positive tests, behavioral divergence)
- **2 enforced valid standards** (task breakdown test coverage granularity, specification FR-6 divergence documentation)
- **0 unnecessary churn**

### Test-to-AC Traceability

A recurring theme across task breakdown and implementation reviews: the gauge repeatedly flagged insufficient mapping between tests and acceptance criteria. Examples:
- `artifacts/task_breakdown/iter1-gauge.md`: task list did not name actual clean-command test file location.
- `artifacts/task_breakdown/iter2-gauge.md`: AC-9 coverage not split by code path (recovery, doctor, clean).
- `artifacts/implementation/task7-iter2-gauge.md`: test title said "with warning" but didn't assert `log.warn` was called.

**Takeaway**: When writing task descriptions and tests, explicitly map each assertion to the AC it validates, and ensure test titles accurately describe what's asserted.

### Constitution Gaps

None identified. The constitution's coding standards were sufficient for this feature.

### Workflow Gaps

1. **Validation self-check needs stronger enforcement**: The validation report cited `src/workflow.ts:286` when the actual line was 290. The validation instructions include a "self-check" step to verify line number citations, but the Forge skipped it. This cost an extra iteration. Future validation rounds should grep every cited line number before submitting the report.
