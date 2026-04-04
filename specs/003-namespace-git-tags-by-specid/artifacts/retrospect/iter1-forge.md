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

### Memory 2: Codex gauge catches behavioral divergence in refactors
- **Type**: feedback
- **Name**: gauge-catches-refactor-divergence
- **Content**: When extracting shared functions from existing code, the gauge checks exact behavioral equivalence, including subtle differences like double lookups vs single lookups and how state is derived.
- **Evidence**: `artifacts/implementation/tasks1-5-iter1-gauge-prompt.md` — WARNING about double branch lookup in `recoverState()` after `resolveSpecId()` extraction.
- **Rationale**: The refactor looked correct at a glance but introduced a subtle race condition. Future refactors should verify identical behavior by tracing all code paths, not just the happy path.

### Memory 3: Specification stage needs 5 iterations for cross-cutting features
- **Type**: project
- **Name**: spec-iteration-count-cross-cutting
- **Content**: Features that touch multiple subsystems (workflow, clean, doctor, canonical commands) tend to need 4-5 specification iterations because the gauge catches scope gaps incrementally. **Why:** The gauge found missing canonical command file updates (FR-8/FR-9) in iter 1, then progressively tightened edge cases in FR-5 and FR-6 through iters 2-4. **How to apply:** For future cross-cutting features, proactively enumerate all affected subsystems in the initial spec draft rather than waiting for gauge feedback.
- **Evidence**: `artifacts/specification/iter1-gauge.md` through `iter5-gauge.md` — each iteration added new FRs or tightened existing ones.
- **Rationale**: 5 iterations is the max allowed. A more complete initial draft would leave room for iteration on quality rather than coverage.

## Skill Updates

No project-specific skills were invoked during this workflow. No skill updates proposed.

## Process Improvements

### Bottlenecks

1. **Specification stage (5 iterations)**: The gauge found genuinely missing requirements in each round:
   - Iter 1→2: Missing FR-8 (canonical command files) and FR-9 (README). **(a) Real defect.**
   - Iter 2→3: FR-5 resolution chain too weak. **(a) Real defect.**
   - Iter 3→4: state.json-exists-but-null-specId edge case in FR-5. **(a) Real defect.**
   - Iter 4→5: FR-6 spec-file scanning scope. **(c) Unnecessary churn** — I correctly pushed back as deliberate divergence, documented it, and the gauge approved in iter 5.

2. **Task breakdown (3 iterations)**:
   - Iter 1→2: Missing AC-2 multi-spec coexistence test. **(a) Real defect.**
   - Iter 2→3: specs-dir fallback path untested, AC-9 split unclear. **(b) Enforced valid standard.**

3. **Implementation tasks 1-5 (2 iterations)**:
   - `advanceStage()` used `?? 'unknown'` creating orphan tags. **(a) Real defect.**
   - Double branch lookup behavioral divergence. **(a) Real defect.**

### Forge-Gauge Dynamics

The Codex gauge was effective as a reviewer. Out of ~8 REVISE verdicts across all stages:
- **6 caught real defects** (missing FRs, orphan tags, false positive tests, behavioral divergence)
- **1 enforced valid standards** (task breakdown test coverage granularity)
- **1 was unnecessary churn** (doctor spec-file scope in specification iter 4, correctly pushed back)

The Forge's constitution-override principle worked well in the single churn case — pushing back on the gauge was the right call.

### Constitution Gaps

None identified. The constitution's coding standards were sufficient for this feature.

### Workflow Gaps

1. **Validation gauge is too strict about line number citations**: The REVISE in validation was for a single wrong line number (286 vs 290). This is a factual error that should be caught, but it cost an extra iteration for a trivial fix. The validation instructions' "self-check" step should have caught this before submission.
