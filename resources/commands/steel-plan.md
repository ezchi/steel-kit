Generate an implementation plan using the Forge-Gauge loop.

## Prerequisites
- `.steel/constitution.md` must contain a real project constitution.
- `.steel/state.json` currentStage must be `planning`.

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Verify state: `steel state get` and confirm `currentStage` is `planning` and `state.specId` is set.
2. Mark in progress: `steel state mark --stage planning --status in_progress`.

3. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N` (start at `state.iteration`):

   ### Forge Phase (you are the Forge)
   a. Render the Forge prompt (this substitutes `{{CONSTITUTION}}`, `{{SPEC}}`, `{{BASE_BRANCH}}`, `{{FEEDBACK}}`):
      ```
      steel render-prompt --role forge --stage planning \
        --output .steel/tmp/plan-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   b. **Read the rendered prompt and follow it as your Forge instruction.** It tells you to use `{{BASE_BRANCH}}` (already substituted to the per-spec base from `state.baseBranch`) for any verification gates — never hard-code `master` or `main`.
   c. Write the plan to `specs/$SPEC_ID/plan.md` (where `$SPEC_ID = $(steel state get --field specId)`).
   d. Save artifact: `steel save-artifact --stage planning --iter $N --role forge --content-file specs/$SPEC_ID/plan.md`.
   e. Commit: `steel commit-step --role forge --stage planning --iter $N --msg "iteration $N output"`.

   ### Gauge Phase
   f. Render the Gauge prompt:
      ```
      FORGE_ART=specs/$SPEC_ID/artifacts/planning/iter${N}-forge.md
      steel render-prompt --role gauge --stage planning \
        --review-target $FORGE_ART \
        --output .steel/tmp/plan-iter${N}-gauge-prompt.md
      ```
   g. Run the Gauge per `config.gauge.provider`:
      - If `claude`: spawn a **Task subagent (fresh context)** with prompt: `Read and follow the instructions in .steel/tmp/plan-iter${N}-gauge-prompt.md. Output the review and end with exactly one VERDICT line.`
      - Else: `steel run-gauge --provider <name> --prompt-file .steel/tmp/plan-iter${N}-gauge-prompt.md --output specs/$SPEC_ID/artifacts/planning/iter${N}-gauge.md`.
   h. If the subagent path was used, save its output via `steel save-artifact --stage planning --iter $N --role gauge --content "$REVIEW_TEXT"`.
   i. Commit: `steel commit-step --role gauge --stage planning --iter $N --msg "iteration $N review — <VERDICT>"`.
   j. Parse verdict from last 10 lines.
   k. **APPROVE** → break loop. **REVISE** → `steel state iter --inc`, set `PRIOR_GAUGE` to the just-saved gauge path, loop.

   ### Max-iter cap
   l. On hitting `maxIterations` with no APPROVE, ask the user: "Continue for up to `<maxIterations>` more iterations? (y/N)". Yes → continue. No → leave `in_progress`, print "Re-run `/steel-plan` to resume.", stop.

4. Auto-advance (no human gate at planning→task_breakdown):
   - `steel state mark --stage planning --status complete`
   - `steel tag-stage --stage planning`
   - `steel state advance-stage`

5. Track skills: `steel state set-skills --stage planning --skills <skill-names>` (or omit if none).

6. Tell the user: "Plan complete. Run `/steel-tasks` to break down tasks."
