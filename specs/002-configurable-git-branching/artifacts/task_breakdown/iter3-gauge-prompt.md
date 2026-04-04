# Gauge Review: Task Breakdown — Iteration 3

You are reviewing revision 3 of a task breakdown.

## Prior Reviews

Iter 1: Split specify.ts across phases → FIXED: all in T6
Iter 2: T1/T3 type dependency breaking parallelism; AC-13 defaults not tested; T5∥T6 wrong → FIXED: types in T1, T3 depends on T1; AC-13 test added; Phase 2 is T5→T6→T7

## Files to Review

1. `.steel/constitution.md`
2. `specs/002-configurable-git-branching/spec.md`
3. `specs/002-configurable-git-branching/plan.md`
4. `specs/002-configurable-git-branching/tasks.md`

## Review Criteria

1. Plan alignment, 2. Task granularity, 3. Dependencies, 4. AC coverage, 5. Ordering, 6. Testability, 7. Completeness

## Output Format

```
## Findings
### [CATEGORY]: [title]
**Severity**: critical | major | minor | nit
**Details**: ...
**Suggestion**: ...

## Summary
...

## VERDICT: APPROVE or REVISE
```
