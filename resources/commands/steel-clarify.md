Run clarification on the current specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `clarification`.
- `specs/<specId>/spec.md` must exist with `[NEEDS CLARIFICATION]` markers (or open questions surfaced during specify).

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Verify state: `steel state get` and confirm `currentStage` is `clarification`.

2. Mark in progress: `steel state mark --stage clarification --status in_progress`.

3. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the Forge prompt:
      ```
      steel render-prompt --role forge --stage clarification \
        --output .steel/tmp/clarify-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   b. **Read the rendered prompt and follow it.** It substitutes `{{CONSTITUTION}}`, `{{SPEC}}`, `{{BASE_BRANCH}}`, `{{FEEDBACK}}`. Identify open questions in the spec, formulate clarifying questions, and prepare answers based on the constitution + project context.
   c. Write to `specs/$SPEC_ID/clarifications.md`.
   d. Save artifact: `steel save-artifact --stage clarification --iter $N --role forge --content-file specs/$SPEC_ID/clarifications.md`.
   e. Commit: `steel commit-step --role forge --stage clarification --iter $N --msg "iteration $N output"`.

   ### Gauge Phase
   f. Render gauge prompt:
      ```
      FORGE_ART=specs/$SPEC_ID/artifacts/clarification/iter${N}-forge.md
      steel render-prompt --role gauge --stage clarification \
        --review-target $FORGE_ART \
        --output .steel/tmp/clarify-iter${N}-gauge-prompt.md
      ```
   g. Run gauge per `config.gauge.provider`: Task subagent (fresh context) if `claude`, else `steel run-gauge --provider <name> --prompt-file ... --output specs/$SPEC_ID/artifacts/clarification/iter${N}-gauge.md`.
   h. If subagent path: save with `steel save-artifact --stage clarification --iter $N --role gauge --content "$REVIEW"`.
   i. Commit: `steel commit-step --role gauge --stage clarification --iter $N --msg "iteration $N review — <VERDICT>"`.
   j. Parse verdict. APPROVE → break. REVISE → `steel state iter --inc`, set `PRIOR_GAUGE` to the new gauge artifact, loop.

   ### Max-iter cap
   k. On cap with no APPROVE, prompt "Continue for up to `<maxIterations>` more? (y/N)". Yes → continue. No → leave `in_progress`, stop.

4. **HUMAN APPROVAL GATE** — ask the user: **"Approve clarifications and advance to planning?"**
   - Approved: `steel state mark --stage clarification --status complete`, `steel tag-stage --stage clarification`, `steel state advance-stage`.
   - Rejected: collect new feedback and run a delta loop (same pattern as `/steel-specify` step 8); when delta is APPROVED, return to this gate.

5. Track skills: `steel state set-skills --stage clarification --skills <names>`.

6. Tell the user: "Clarification complete. Run `/steel-plan` to generate the implementation plan."
