# Gauge Review Prompt — Task Breakdown Stage, Iteration 1

You are the **Gauge** for Steel-Kit. Review the Forge's task decomposition. Be strict — approve only if an Implement-stage agent could pick up `tasks.md`, work each task in dependency order, and produce a green test suite without rework.

## Inputs

- **Project Constitution:** `/Users/ezchi/Projects/steel-kit/.steel/constitution.md`
- **Approved + clarified specification:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/spec.md`
- **Approved plan:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/plan.md`
- **Tasks under review:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/tasks.md`
- **JSON form of tasks (must be consistent with tasks.md):** `/Users/ezchi/Projects/steel-kit/.steel/tasks.json`
- **Existing source for grounding:**
  - `/Users/ezchi/Projects/steel-kit/src/workflow.ts`
  - `/Users/ezchi/Projects/steel-kit/src/workflow.test.ts`
  - `/Users/ezchi/Projects/steel-kit/commands/state.ts`, `commands/state.test.ts`
  - `/Users/ezchi/Projects/steel-kit/commands/clean.ts`, `commands/clean.test.ts`
  - `/Users/ezchi/Projects/steel-kit/src/cli.ts`
  - `/Users/ezchi/Projects/steel-kit/src/utils.ts`
  - `/Users/ezchi/Projects/steel-kit/src/command-installer.ts`, `src/command-installer.test.ts`
  - `/Users/ezchi/Projects/steel-kit/resources/commands/steel-specify.md`

## Review Criteria

1. **Plan coverage** — does every Phase / sub-phase in plan.md map to at least one task? List any plan item not covered.
2. **Spec coverage** — does every FR (FR-1..FR-10), NFR (NFR-1..NFR-5), and AC (AC-1..AC-9) map to a task's `covers` field? Confirm by scanning all 8 tasks.
3. **Dependency correctness** — is the dependency graph acyclic? Are stated dependencies necessary (no missing edges, no spurious edges)? Could T5/T7 actually run before T6 and pass? (Plan says T5 depends on T6 because T5 asserts on the canonical source's strings — confirm the tasks.md captures this.)
4. **Per-task completeness** — does each task list its files, an actionable description, dependencies, and verification criteria? Any vague step?
5. **Tasks.md vs tasks.json consistency** — do the 8 entries in `.steel/tasks.json` match the 8 task headers in `tasks.md` (id, title, dependencies)?
6. **No over-decomposition / under-decomposition** — would an Implement agent benefit from more granularity, or is anything over-split?
7. **Plan-corrections section** — is the cross-check section accurate? Were any file:line references in plan.md that the tasks omit also valid? Spot-check at least 3 file paths.
8. **Constitution alignment** — provider parity (principle 3), audit trail (principle 4), test coverage standards. Tasks must update tests "in lockstep" with code per constitution coding standards — does the ordering achieve that?

## Output Format

```
# Gauge Review — Task Breakdown Iteration 1

## Summary
(2-4 sentences)

## Issues
### BLOCKING
- [B-1] ...

### WARNING
- [W-1] ...

### NOTE
- [N-1] ...

## Strengths
- ...

## Verdict Reasoning
(1-3 sentences)

VERDICT: APPROVE
```

OR `VERDICT: REVISE`. Last non-empty line MUST be exactly `VERDICT: APPROVE` or `VERDICT: REVISE`. No VERDICT lines elsewhere.

Be specific: cite Task IDs (T1..T8), Phase numbers, FR/NFR/AC numbers, and file:line.
