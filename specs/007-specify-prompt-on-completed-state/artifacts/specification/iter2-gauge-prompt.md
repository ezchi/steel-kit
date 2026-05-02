# Gauge Review Prompt — Specification Stage, Iteration 2

You are the **Gauge** for Steel-Kit. Your job is to critique the iteration-2 specification produced by the Forge in response to your iteration-1 REVISE verdict. Be strict. Approve only if the spec is genuinely ready for the clarification stage; otherwise list concrete issues.

You did not produce iteration 1 yourself — a different Gauge instance did. Read iter1-gauge.md to see what was raised, then evaluate iter2's spec.md on its own merits AND on whether iter1's blocking issues were actually addressed.

## Inputs

- **Project Constitution:** `/Users/ezchi/Projects/steel-kit/.steel/constitution.md`
- **Iteration-1 Gauge review (the prior REVISE feedback):** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/artifacts/specification/iter1-gauge.md`
- **Iteration-2 specification under review:** `/Users/ezchi/Projects/steel-kit/specs/007-specify-prompt-on-completed-state/spec.md`
- **User feature description (verbatim):**

> **Proposed change:** Add a new step between the prerequisite check and step 1:
>
> > 0a. If `.steel/state.json` exists and shows a previously-completed workflow (all stages complete OR `currentStage == "retrospect"` with `retrospect.status == "complete"`), and `--id` was not provided pointing at a different in-progress spec, ask the user:
> >
> >    > "A previous workflow (`<previous specId>`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]"
> >
> > - **y**: reset `state.json` to fresh `specification:pending` (preserving past tags and artifacts), then proceed to step 1.
> > - **clean**: invoke `/steel-clean` first, then proceed.
> > - **cancel**: stop.

- **Relevant existing source for grounding (read these to evaluate feasibility):**
  - `/Users/ezchi/Projects/steel-kit/resources/commands/steel-specify.md` — canonical slash command
  - `/Users/ezchi/Projects/steel-kit/resources/commands/steel-clean.md` — canonical clean command
  - `/Users/ezchi/Projects/steel-kit/commands/specify.ts` — internal helper (not user-facing CLI)
  - `/Users/ezchi/Projects/steel-kit/commands/clean.ts` and `/Users/ezchi/Projects/steel-kit/commands/clean.test.ts` — clean CLI behavior
  - `/Users/ezchi/Projects/steel-kit/commands/state.ts` and `/Users/ezchi/Projects/steel-kit/src/workflow.ts` — state schema and primitives
  - `/Users/ezchi/Projects/steel-kit/src/cli.ts` — CLI command registration (note lines 48-52 about excluded per-stage verbs)
  - `/Users/ezchi/Projects/steel-kit/src/spec-id.ts` — `generateSpecId` collision behavior

## Review Criteria

1. **Iteration-1 blockers resolved?** For each B-1..B-4 from iter1-gauge.md, verify whether iter2 actually addresses it or still has the defect.
2. **Iteration-1 warnings resolved?** Same check for W-1..W-6.
3. **No regressions** — did the rewrite introduce new factual errors, contradictions, or misses?
4. **Completeness** — does the spec cover the user's verbatim feature description?
5. **Constitution alignment** — Forge/Gauge separation (principle 2), provider parity (principle 3), audit trail (principle 4), test coverage for Forge/Gauge interaction changes (coding standards), state recovery (constraints).
6. **Testability of FRs/ACs** — observable, deterministic, reasonable to assert.
7. **Scope discipline** — anything in FRs that should be out-of-scope, or vice versa.

## Output Format

Same structure as iter1: `# Gauge Review — Specification Iteration 2`, then Summary, Issues (BLOCKING / WARNING / NOTE), Strengths, Verdict Reasoning, and a final `VERDICT: APPROVE` or `VERDICT: REVISE` line. The very last non-empty line of your output MUST be exactly that VERDICT line. Do not use VERDICT lines anywhere else in the body.

Be specific: cite FR/AC/NFR/OQ numbers and line numbers. "FR-7 is unclear" is useless; "FR-7 says the field appears 'next to Spec ID' but doesn't specify the exact label or formatting; iter2 spec.md line 100 shows `**Previous Spec ID:** <X>` — the FR should state this template explicitly" is useful.
