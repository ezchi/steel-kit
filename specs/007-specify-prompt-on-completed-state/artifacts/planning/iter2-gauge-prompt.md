# Gauge Review Prompt — Planning Stage, Iteration 2

You are the **Gauge** for Steel-Kit. Review iteration 2 of the implementation plan, which the Forge revised in response to your prior REVISE verdict (3 BLOCKING + 3 WARNING + 4 NOTE).

You did not produce iteration 1 — a different Gauge instance did. Read iter1-gauge.md to see the prior findings, then evaluate whether iter2 actually addresses them AND check iter2 on its own merits.

## Inputs

- **Project Constitution:** `/Users/ezchi/Projects/steel-kit/.steel/constitution.md`
- **Approved + clarified specification:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/spec.md`
- **Clarifications doc (the resolutions every plan decision must respect):** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/clarifications.md`
- **Prior gauge review (the REVISE feedback driving iter 2):** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/artifacts/planning/iter1-gauge.md`
- **Iter2 plan under review:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/plan.md`
- **Relevant existing source for grounding:**
  - `/Users/ezchi/Projects/steel-kit/src/workflow.ts` (esp. line 264 — `saveState` byte format)
  - `/Users/ezchi/Projects/steel-kit/commands/state.ts`
  - `/Users/ezchi/Projects/steel-kit/commands/state.test.ts` (esp. setupProject 21-46, readState 48-50, fixture pattern)
  - `/Users/ezchi/Projects/steel-kit/commands/clean.ts` and `/Users/ezchi/Projects/steel-kit/commands/clean.test.ts`
  - `/Users/ezchi/Projects/steel-kit/src/cli.ts` (state subcommand registration ~line 200-248)
  - `/Users/ezchi/Projects/steel-kit/src/utils.ts` (find the `confirm` export — Phase 5a #2 mocks it)
  - `/Users/ezchi/Projects/steel-kit/src/command-installer.ts` and `src/command-installer.test.ts` (Phase 5d)
  - `/Users/ezchi/Projects/steel-kit/resources/commands/steel-specify.md`

## Review Criteria

1. **Iter1 blockers resolved?** B-1 (saveState byte format), B-2 (FR-7 placement test), B-3 (FR-5 decline-detection test). Verify each is genuinely fixed, not papered over.
2. **Iter1 warnings resolved?** W-1 (Phase 5c scope), W-2 (state.test.ts already exists), W-3 (dead --preserve-history flag).
3. **Iter1 notes addressed?** N-1, N-2, N-3, N-4.
4. **No regressions** — did the revision introduce new factual errors, contradictions, or scope creep?
5. **Spec coverage** — every FR/NFR/AC mapped to a phase. Particularly NFR-5's seven test items.
6. **Clarification fidelity** — C-1 through C-7 still respected.
7. **Technical feasibility** — read the cited source. Phase 5a #2's mock pattern (`vi.mock('../src/utils.js')` or `vi.spyOn` for `confirm`) — does the actual export structure support either pattern? Phase 5b's verbatim-string assertions — would they fire correctly given the slash-command edits in Phase 4a?
8. **Implementability** — would an implement-stage agent reading this plan know exactly what files to touch, what to add, what to leave alone?
9. **Constitution alignment** — provider parity (principle 3), audit trail (principle 4), self-improvement (principle 5), automation subordinate to user control (principle 6), test coverage (coding standards).

## Output Format

```
# Gauge Review — Planning Iteration 2

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

OR `VERDICT: REVISE`. Last non-empty line MUST be exactly `VERDICT: APPROVE` or `VERDICT: REVISE`. No VERDICT lines elsewhere in the body.

Be specific: cite Phase numbers, FR/NFR/AC numbers, and file:line. "Phase 5a #2 is wrong" is useless; "Phase 5a #2 says to use `vi.mock('../src/utils.js', ...)` to stub `confirm`, but `src/utils.ts` exports `confirm` as a named function — `vi.mock` works at module-load time and may not interact correctly with the dynamic `import('./state.js')` pattern used elsewhere in `commands/state.test.ts:80` — verify the mock fires before `cmdClean`'s `confirm` call resolves" is useful.
