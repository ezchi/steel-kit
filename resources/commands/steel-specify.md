Create a feature specification using the Forge-Gauge dual-agent loop.

Feature description: $ARGUMENTS

## Prerequisites
- `.steel/` must exist (run `/steel-init` first)
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `specification`

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Read state + config:
   - `STATE=$(steel state get)` then verify `currentStage` is `specification`.
   - `CONFIG=$(steel show-config)` then extract `git.baseBranch` and `git.branchPrefix`.

2. Generate the spec ID:
   - If the user passed `--id <value>`, run: `SPEC_ID=$(steel new-spec-id --description "$ARGUMENTS" --id <value>)`.
   - Otherwise: `SPEC_ID=$(steel new-spec-id --description "$ARGUMENTS")`.

3. **Branching policy — per-spec base branch:**
   - `CURRENT=$(git rev-parse --abbrev-ref HEAD)`
   - `CONFIG_BASE=<git.baseBranch from step 1>`
   - If `CURRENT == CONFIG_BASE`: silently use `CURRENT` as the base. Skip to step 4.
   - If `CURRENT != CONFIG_BASE`: ask the user verbatim:
     > "Current branch is `<CURRENT>`, which differs from the project's configured base `<CONFIG_BASE>`. Create the new spec branch based on `<CURRENT>`? (y/N)"
     - If the user declines: **abort.** Print: "Aborted. Checkout your desired base branch and re-run `/steel-specify`." Do NOT create a branch, do NOT touch state.
     - If the user accepts: use `CURRENT` as the base.

4. Create the spec branch and record state atomically:
   - `steel branch-init --spec-id "$SPEC_ID" --base-branch "$BASE" --description "$ARGUMENTS"`
   - This validates the working tree is clean, validates the base branch exists, creates `<branchPrefix>$SPEC_ID` from current HEAD, and writes `state.specId`, `state.branch`, `state.baseBranch`, `state.description` into `.steel/state.json`.
   - If `branch-init` fails (dirty tree, invalid ref, etc.), surface the error and stop.

5. Mark the stage in progress: `steel state mark --stage specification --status in_progress`.

6. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the canonical Forge prompt:
      ```
      steel render-prompt --role forge --stage specification \
        --output .steel/tmp/specify-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
      `PRIOR_GAUGE` is the path to the previous iteration's gauge artifact (skip on iter 1).

   b. **Read the rendered prompt and follow it as your Forge instruction.** The rendered prompt already substitutes `{{CONSTITUTION}}`, `{{BASE_BRANCH}}`, prior `{{FEEDBACK}}`, and the description. Produce the spec document content per its instructions.

   c. Write the spec to `specs/$SPEC_ID/spec.md`.

   d. Save the Forge artifact:
      ```
      steel save-artifact --stage specification --iter $N --role forge --content-file specs/$SPEC_ID/spec.md
      ```

   e. Commit:
      ```
      steel commit-step --role forge --stage specification --iter $N \
        --msg "iteration $N output"
      ```

   ### Gauge Phase
   f. Render the Gauge review prompt:
      ```
      FORGE_ARTIFACT=specs/$SPEC_ID/artifacts/specification/iter${N}-forge.md
      steel render-prompt --role gauge --stage specification \
        --review-target $FORGE_ARTIFACT \
        --output .steel/tmp/specify-iter${N}-gauge-prompt.md
      ```

   g. Run the Gauge **per `config.gauge.provider`**:
      - If `claude`: **spawn a Task subagent with a fresh context** (use the `Agent` tool with `subagent_type: general-purpose`). Pass the prompt: `Read and follow the instructions in .steel/tmp/specify-iter${N}-gauge-prompt.md. Output the review markdown to stdout. End with exactly one VERDICT line.` This isolates the review from the parent session that produced the Forge output. Capture the subagent's response.
      - If `gemini` or `codex`: `steel run-gauge --provider <name> --prompt-file .steel/tmp/specify-iter${N}-gauge-prompt.md --output specs/$SPEC_ID/artifacts/specification/iter${N}-gauge.md`.

   h. If the Gauge ran via subagent, save its output to the artifact path:
      ```
      steel save-artifact --stage specification --iter $N --role gauge --content "$REVIEW_TEXT"
      ```

   i. Commit the gauge review:
      ```
      steel commit-step --role gauge --stage specification --iter $N \
        --msg "iteration $N review — <VERDICT>"
      ```

   j. **Parse the verdict** from the last 10 lines of the gauge artifact. Look for `VERDICT: APPROVE` or `VERDICT: REVISE`.

   k. If **APPROVE**: break the loop, go to step 7.
   l. If **REVISE**: `steel state iter --inc`, set `PRIOR_GAUGE=specs/$SPEC_ID/artifacts/specification/iter${N}-gauge.md`, loop back to step 6a (next iter).

   ### Max-iter cap behavior
   m. If you hit `config.maxIterations` without APPROVE, ask the user verbatim:
      > "Max iterations reached for specification. Continue for up to `<maxIterations>` more iterations? (y/N)"
      - If yes: continue the loop.
      - If no: leave stage `in_progress`, print "Stage paused. Re-run `/steel-specify` (with no description) to resume." and stop.

7. **HUMAN APPROVAL GATE** — do not skip.

   Ask the user verbatim: **"Approve specification and advance to clarification?"**

   - If **approved**: `steel state mark --stage specification --status complete`, `steel tag-stage --stage specification`, `steel state advance-stage`. Continue to step 9.
   - If **rejected**: enter **Delta Clarification Mode** (step 8).

   ### 8. Delta Clarification Mode

   Process ONLY the user's new feedback without re-running the full loop on already-approved content.

   1. Ask the user what specific changes they want. Record their response verbatim as `userFeedback`.

   2. **DELTA FORGE-GAUGE LOOP** (max iterations from config):

      #### Delta Forge Phase
      a. Read the current `specs/$SPEC_ID/spec.md` — this is the approved baseline; do NOT regenerate from scratch.
      b. Address ONLY the items in `userFeedback`. For each item:
         - Identify the section(s) of `spec.md` affected.
         - Make targeted edits to those sections only.
         - Do NOT rewrite, reorder, or "improve" sections the user did not mention.
      c. Save the delta to `specs/$SPEC_ID/artifacts/specification/iter${N}-delta-forge.md`:
         ```markdown
         # Delta Revision — Iteration N

         ## User Feedback
         (verbatim user feedback)

         ## Changes Made
         (for each change: which section, what changed, why)

         ## Sections NOT Modified
         (sections left untouched)
         ```
      d. Commit: `steel commit-step --role forge --stage specification --iter $N --msg "delta iteration $N"`.

      #### Delta Gauge Phase
      e. The Gauge reviews ONLY the delta. Build a review prompt that includes:
         - The user's feedback (what was requested).
         - The diff of changes made (before → after for each modified section).
         - The full updated `spec.md` (for context only; review focuses on the delta).
      f. Same Gauge invocation pattern as step 6g (Task subagent if claude, else `steel run-gauge`).
      g. Save: `steel save-artifact --stage specification --iter $N --role gauge --content-file ...`.
      h. Commit: `steel commit-step --role gauge --stage specification --iter $N --msg "delta iteration $N review — <VERDICT>"`.
      i. If **REVISE**: fix only the disputed items, loop back. If **APPROVE**: exit delta loop.

   3. Return to step 7 — ask the user again: **"Approve specification and advance to clarification?"**

9. **Track skills used**: `steel state set-skills --stage specification --skills <skill-names>`. If no skills were used, pass `--skills` with an empty list (skip the flag entirely if your CLI requires at least one — in that case use `none` as the placeholder).

10. Show a summary of the specification (use `steel status` for the workflow view).
