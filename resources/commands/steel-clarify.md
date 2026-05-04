Run clarification on the current specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `clarification`.
- `specs/<specId>/spec.md` must exist with `[NEEDS CLARIFICATION]` markers (or open questions surfaced during specify).

## Steps

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
   b. **Read the rendered prompt and follow it.** It substitutes `{{CONSTITUTION}}`, `{{SPEC}}`, `{{BASE_BRANCH}}`, `{{FEEDBACK}}`. Identify every `[NEEDS CLARIFICATION]` marker and every other open question or implicit assumption in the spec.

      Then **interview the user one question at a time** to resolve each item. **No assumptions, no guessing.**

      - Ask exactly ONE focused clarifying question per turn, then wait for the user's answer before asking the next.
      - Do NOT formulate answers yourself from the constitution or project context. Do NOT batch multiple questions. Do NOT offer multiple-choice options in lieu of asking. Do NOT proceed to write `clarifications.md` until every open item has an explicit user answer.
      - On iteration N>1, the prior gauge feedback (`{{FEEDBACK}}`) may surface NEW open items the Gauge spotted; ask the user about those too, one at a time.
      - Record each Q&A pair verbatim as you go.
   c. Write `specs/$SPEC_ID/clarifications.md` strictly from the interview record. Each entry MUST include: the original ambiguity, the question you asked, the user's verbatim answer, and how the spec will be updated to reflect it. Do NOT include resolutions you authored without a corresponding user answer.
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
