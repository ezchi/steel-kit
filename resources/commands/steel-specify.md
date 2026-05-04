Create a feature specification using the Forge-Gauge dual-agent loop.

Feature description: $ARGUMENTS

## Prerequisites
- `.steel/` must exist (run `/steel-init` first)
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `specification`

## Steps

0a. **Detect a previously-completed workflow.** Before reading state for step 1:

   - `RETRO_STATUS=$(steel state get --field stages.retrospect.status)`
   - `PREV_SPEC_ID=$(steel state get --field specId)`
   - If `RETRO_STATUS != "complete"`, this step is a no-op — proceed to step 1.

   If `RETRO_STATUS == "complete"`, ask the user verbatim (substituting `$PREV_SPEC_ID`):

   > "A previous workflow (`<previous specId>`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]"

   Read the user's response (case-insensitive, leading/trailing whitespace stripped). Any value other than exactly `y`, `clean`, or `cancel` MUST cause the prompt to be re-displayed verbatim until a valid response is given.

   - **y** — preserve-history reset (step 0a-y below), then proceed to step 1. The new spec.md MUST include a `**Previous Spec ID:** <PREV_SPEC_ID>` line in its header block, placed between **Spec ID:** and **Status:**. Append this line ONLY when the y-path was taken; otherwise the line is absent.
   - **clean** — invoke `/steel-clean` then detect outcome (step 0a-clean below).
   - **cancel** — print `"Cancelled. Previous workflow <PREV_SPEC_ID> is still recorded as complete. Run /steel-clean or /steel-specify when ready."` and stop. No state changes, no commits, no branch.

   ### 0a-y: preserve-history reset

   `steel state reset`. This rewrites `.steel/state.json` to `createInitialState()` output. Prior `specs/<PREV_SPEC_ID>/` directory, `.steel/tasks.json`, and `steel/<PREV_SPEC_ID>/*-complete` git tags are NOT touched (documented in the command's `--description` and success message). Proceed to step 1.

   ### 0a-clean: invoke /steel-clean and detect outcome

   1. Snapshot: `PREV_SPEC_ID_BEFORE=$PREV_SPEC_ID` (already captured above; reuse).
   2. Invoke `/steel-clean` end-to-end, including its own confirmation prompt. Do NOT bypass that confirmation.
   3. After `/steel-clean` returns, re-read state: `POST_SPEC_ID=$(steel state get --field specId)`.
   4. If `POST_SPEC_ID` is empty (state.json now has no `specId` field), `/steel-clean` ran to completion — proceed to step 1.
   5. If `POST_SPEC_ID == PREV_SPEC_ID_BEFORE` (state unchanged), `/steel-clean` was declined or failed before resetting state — print `"/steel-clean did not complete — re-run /steel-specify when ready."` and stop. No branch, no commits.

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

   ### Pre-Loop: Intent Interview (iteration 1 only — MANDATORY)

   Before producing any Forge output, you MUST fully understand the user's intent. **No assumptions, no guessing.**

   - Read `.steel/constitution.md` for project context.
   - Interview the user **one question at a time**: ask exactly ONE focused clarifying question, wait for the user's answer, then decide whether to ask the next.
   - Cover at minimum: goal, constraints, expected output, and success criteria. Stop asking once these dimensions are clear; do NOT pad with questions you can answer from context.
   - Never batch multiple questions in one turn. Never propose multiple-choice answers in lieu of asking. Never proceed to draft the spec until each open dimension is settled by an explicit user answer.
   - Record the conversation verbatim to `specs/$SPEC_ID/interview.md` as you go:
     ```markdown
     # Pre-Spec Interview

     **Original prompt:** <verbatim $ARGUMENTS>

     ## Q1
     <your question>

     ## A1
     <user answer verbatim>

     ## Q2
     ...
     ```
   - When the interview is done, commit it: `git add specs/$SPEC_ID/interview.md && git commit -m "specify($SPEC_ID): record intent interview"`.
   - The Forge MUST treat `interview.md` as authoritative intent context alongside `$ARGUMENTS`. If iteration 1's interview leaves a dimension unresolved, return to the interview before drafting; do NOT fill the gap with a guess.

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the canonical Forge prompt:
      ```
      steel render-prompt --role forge --stage specification \
        --output .steel/tmp/specify-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
      `PRIOR_GAUGE` is the path to the previous iteration's gauge artifact (skip on iter 1).

   b. **Read the rendered prompt and follow it as your Forge instruction.** Also read `specs/$SPEC_ID/interview.md` (recorded in the pre-loop) and treat its Q&A pairs as authoritative intent — equal in weight to the original `$ARGUMENTS` description. The rendered prompt already substitutes `{{CONSTITUTION}}`, `{{BASE_BRANCH}}`, prior `{{FEEDBACK}}`, and the description. Produce the spec document content per its instructions. Do NOT introduce requirements that contradict the interview answers; do NOT mark items `[NEEDS CLARIFICATION]` for things the interview already resolved.

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

   ### User Review Gate — runs after every gauge iteration

   k. Show the user the parsed verdict, the gauge artifact path (`specs/$SPEC_ID/artifacts/specification/iter${N}-gauge.md`), and a 2–3 line synopsis of the gauge's main points.

   l. Ask the user verbatim:
      > "Gauge iter ${N} → VERDICT: <APPROVE|REVISE>. Review at `<path>`.
      > [c]ontinue (respect verdict) / [o]verride (flip verdict) / [s]top"

   m. Read the response (case-insensitive, whitespace-trimmed). Re-prompt verbatim until the user enters exactly `c`, `o`, or `s`.

   n. Resolve the **effective verdict** from the user's choice:
      - **c (continue)**: effective verdict = gauge verdict.
      - **o (override)**: effective verdict = flipped gauge verdict.
        - On APPROVE→REVISE flip, ask verbatim: `"What should the next iteration address?"` Read the answer, save it to `specs/$SPEC_ID/artifacts/specification/iter${N}-user-feedback.md` with a top header, then `git add` that file and commit: `git commit -m "specify($SPEC_ID): user override iter $N approve→revise"`. Use that file as `PRIOR_GAUGE` for the next iteration instead of the gauge artifact.
        - On REVISE→APPROVE flip: `git commit --allow-empty -m "specify($SPEC_ID): user override iter $N revise→approve"`.
      - **s (stop)**: leave stage `in_progress`, print `"Stage paused at iter ${N}. Re-run /steel-specify (with no description) to resume."` and stop.

   o. Apply the **effective verdict**:
      - **APPROVE**: break the loop, go to step 7.
      - **REVISE**: `steel state iter --inc`. If `PRIOR_GAUGE` was not already set by the override branch in step 6n, set `PRIOR_GAUGE=specs/$SPEC_ID/artifacts/specification/iter${N}-gauge.md`. Run the Complexity Gate (below), then loop back to step 6a.

   ### Complexity Gate — iteration > 8 (simplicity principle)

   After step 6o, check `state.iter`. The **first time** it crosses `> 8` (8 forge-gauge rounds completed without APPROVE), pause the loop. **A spec that won't converge in 8 iterations is too complex; it should be split.** Offer this gate at most once per workflow — if the user declines, do not offer again.

   1. Read `specs/$SPEC_ID/spec.md` and the most recent gauge artifact. Identify which user stories, FRs, NFRs, or scope items are driving disagreement and could be deferred without breaking the user's core intent.

   2. Ask the user verbatim (substituting your proposal):
      > "This spec has gone through 8 forge-gauge iterations without approval — a red flag for over-complexity. Recommend splitting it.
      >
      > **Keep in this spec (core feature):**
      > - <bulleted list — minimum that delivers the user's core intent>
      >
      > **Defer to follow-up specs:**
      > - <one bullet per deferred item, with a one-line rationale>
      >
      > Confirm split? (y/N)"

   3. Read the response.
      - **Anything other than `y`:** do not split. Fall through to step 6m (Max-iter cap behavior). Do NOT offer the split again later in this workflow.
      - **y:** apply the split:
         i. Write `specs/$SPEC_ID/deferred.md` (overwrite if it exists), capturing each deferred item:
            ```markdown
            # Deferred Features — <SPEC_ID>

            Items removed from spec `<SPEC_ID>` during a complexity-driven split on <YYYY-MM-DD>. Each is a candidate for a future `/steel-specify` workflow.

            ## D1: <title>
            - **Original spec section:** <heading or FR-N>
            - **Rationale for deferral:** <one or two sentences>
            - **Suggested follow-up entry point:** <one-line description for a future /steel-specify run>
            ```
         ii. Edit `specs/$SPEC_ID/spec.md` in place: remove the deferred user stories, FRs, NFRs, and acceptance criteria; tighten cross-references; ensure the trimmed spec is internally consistent and still satisfies the kept user intent.
         iii. Commit: `git add specs/$SPEC_ID/spec.md specs/$SPEC_ID/deferred.md && git commit -m "specify($SPEC_ID): split — defer items to follow-up"`.
         iv. Loop back to step 6a. The next Forge iteration starts from the simplified spec; clear `PRIOR_GAUGE` so the Forge does not chase feedback that referenced removed scope.

   ### Max-iter cap behavior
   p. If you hit `config.maxIterations` without APPROVE, ask the user verbatim:
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
      i. **User Review Gate** — same shape as the main loop's gate (steps 6k–6o). Show verdict + artifact path + 2–3 line synopsis; ask `[c]ontinue / [o]verride / [s]top`; resolve the effective verdict. On APPROVE→REVISE override, ask `"What should the next iteration address?"`, save the answer to `specs/$SPEC_ID/artifacts/specification/iter${N}-delta-user-feedback.md`, commit it, and treat that file as the feedback for the next delta forge iteration. Record overrides via `git commit --allow-empty -m "specify($SPEC_ID): delta user override iter $N — <flip>"` when no file was committed. Then:
         - **APPROVE (effective)**: exit delta loop.
         - **REVISE (effective)**: loop back to 8.a, addressing the disputed items (or the user's override feedback).
         - **stop**: leave stage `in_progress`, print the resume message, and stop.

   3. Return to step 7 — ask the user again: **"Approve specification and advance to clarification?"**

9. **Track skills used**: `steel state set-skills --stage specification --skills <skill-names>`. If no skills were used, pass `--skills` with an empty list (skip the flag entirely if your CLI requires at least one — in that case use `none` as the placeholder).

10. Show a summary of the specification (use `steel status` for the workflow view).
