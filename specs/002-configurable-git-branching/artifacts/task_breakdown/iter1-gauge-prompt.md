# Gauge Review: Task Breakdown — Iteration 1

You are reviewing a task breakdown for a software implementation plan.

## Files to Review

1. `.steel/constitution.md` — project constitution (highest authority)
2. `specs/002-configurable-git-branching/spec.md` — feature specification
3. `specs/002-configurable-git-branching/plan.md` — implementation plan
4. `specs/002-configurable-git-branching/tasks.md` — task breakdown (under review)

## Review Criteria

1. **Plan alignment**: Do tasks faithfully implement the plan? Any plan steps missing?
2. **Task granularity**: Are tasks appropriately sized? Too large or too small?
3. **Dependencies**: Are task dependencies correct? Can tasks within a phase actually be parallelized?
4. **AC coverage**: Does every AC from the spec map to at least one task?
5. **Ordering**: Is the execution order correct for incremental development?
6. **Testability**: Are verification gates clear for each task?
7. **Completeness**: Any missing tasks? Any tasks that don't map to the plan?

## Output Format

```
## Findings

### [CATEGORY]: [Finding title]
**Severity**: critical | major | minor | nit
**Details**: ...
**Suggestion**: ...

## Summary
...

## VERDICT: APPROVE or REVISE
```
