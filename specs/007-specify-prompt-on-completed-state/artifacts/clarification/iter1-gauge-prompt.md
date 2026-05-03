# Gauge Review Prompt — Clarification Stage, Iteration 1

You are the **Gauge** for Steel-Kit. Review the Forge's proposed clarifications. Be strict.

## Inputs

- **Project Constitution:** `/Users/ezchi/Projects/steel-kit/.steel/constitution.md`
- **Approved specification (iter2 forge output):** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/spec.md`
- **Iter2 gauge review (the source of W-1, W-2, N-1..N-5):** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/artifacts/specification/iter2-gauge.md`
- **Clarifications under review:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/clarifications.md`
- **Relevant source for grounding:**
  - `/Users/ezchi/Projects/steel-kit/src/workflow.ts`
  - `/Users/ezchi/Projects/steel-kit/src/cli.ts` (note lines 48-52, 90+ for helper subcommands)
  - `/Users/ezchi/Projects/steel-kit/src/spec-id.ts`
  - `/Users/ezchi/Projects/steel-kit/commands/clean.ts` (note lines 11-49, 88-101)
  - `/Users/ezchi/Projects/steel-kit/commands/state.ts`
  - `/Users/ezchi/Projects/steel-kit/templates/spec.md`

## Review Criteria

For each clarification (C-1 through C-7), evaluate:

1. **Does the resolution actually answer the question?** Or does it punt / restate?
2. **Is the rationale grounded in the constitution?** Cite which principle. Resolutions that contradict the constitution are blocking.
3. **Is the resolution feasible against the actual code?** Read the cited files. Any factual errors?
4. **Are the listed `spec.md edits` complete?** Will applying them cleanly close the corresponding OQ / W / N items, or are there leftover dangling references?
5. **Did any item get missed?** The Forge claims 3 OQs + 2 Ws + 5 Ns = 10 items. Verify all 10 are addressed.
6. **Is anything over-resolved** (introducing new design decisions beyond what was asked)?
7. **Will the resulting spec.md (after edits) have zero `[NEEDS CLARIFICATION]` markers and zero open questions?** Or will some leak through?

## Output Format

```
# Gauge Review — Clarification Iteration 1

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

OR `VERDICT: REVISE`. The very last non-empty line MUST be exactly `VERDICT: APPROVE` or `VERDICT: REVISE`. Do not use VERDICT lines anywhere else in the body.

Be specific: cite C-N and quote the resolution language when objecting. "C-7 is wrong" is useless; "C-7's state-diff check assumes `state.specId` is undefined after clean, but `createInitialState()` (workflow.ts:86-96) actually returns a state with `specId` as undefined-by-omission — verify this matches the proposed check exactly" is useful.
