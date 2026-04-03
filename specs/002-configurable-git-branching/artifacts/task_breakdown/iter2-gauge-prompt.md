# Gauge Review: Task Breakdown — Iteration 2

You are reviewing revision 2 of a task breakdown.

## Prior Review

Iteration 1 (1 major, 1 minor):
1. MAJOR: `commands/specify.ts` split across T2 and T6 breaking build-safety → FIXED: all specify.ts edits moved to T6, T2 only creates src/spec-id.ts
2. MINOR: Incorrect parallelism claim (T1∥T2∥T3 but T2 depends on T1) → FIXED: corrected to T1∥T3, then T2, then T4

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
