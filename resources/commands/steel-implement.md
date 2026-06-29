Implement all tasks using the Forge-Gauge loop. This is the stage where actual code gets written.

## Prerequisites
- `.steel/state.json` currentStage must be `implementation`.
- `.steel/tasks.json` must exist.

## Steps

1. Verify state: `steel state get` and confirm `currentStage` is `implementation`.
2. Read `.steel/tasks.json` to get the task list.
3. Mark in progress: `steel state mark --stage implementation --status in_progress`.

4. **FOR EACH TASK** in `.steel/tasks.json`:

   **CRITICAL — NO SKIPPING GAUGE:** Every task MUST receive a Gauge code review with a VERDICT before the implementation stage can advance. Each task gets its own `iter${N}-forge.md` and `iter${N}-gauge.md` artifacts (where `N` is per-task iteration). A task without a Gauge APPROVE verdict is not complete.

   Show: `=== Task K/total: <title> ===`

   Reset iteration for this task: `steel state iter --reset`.

   **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Write the current task description to a tempfile so the renderer can include it:
      ```
      jq -r ".[$((K-1))]" .steel/tasks.json > .steel/tmp/task${K}.json
      ```
   b. Render the Forge prompt:
      ```
      steel render-prompt --role forge --stage implementation \
        --task .steel/tmp/task${K}.json \
        --output .steel/tmp/impl-task${K}-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   c. **Read the rendered prompt and follow it.** It includes the test-pass invariant (run all tests, fix failures internally, do not yield to Gauge with failing tests unless cap is hit) and the required Forge artifact format (Files Changed / Key Decisions / Deviations from Plan / Tests Added / Test Results).

   d. Implement the task: write production code, run tests until green, capture results, then write the Forge artifact summary.

   e. Save the artifact (must use the per-task naming):
      ```
      ART_PATH=specs/$SPEC_ID/artifacts/implementation/task${K}-iter${N}-forge.md
      # Write your structured artifact content to $ART_PATH (per the Forge prompt's required format)
      ```

   f. Commit: `steel commit-step --role forge --stage implementation --iter $N --msg "task $K iteration $N output"`.

   ### Gauge Phase
   g. Render the Gauge review prompt. Branch on the task's `type` field (read from `.steel/tmp/task${K}.json`):
      ```
      TASK_TYPE=$(jq -r '.type // "implementation"' .steel/tmp/task${K}.json)
      if [ "$TASK_TYPE" = "verification" ]; then
        TEMPLATE_FLAG="--template review-verification"
      else
        TEMPLATE_FLAG=""
      fi
      steel render-prompt --role gauge --stage implementation \
        --review-target $ART_PATH \
        --task .steel/tmp/task${K}.json \
        $TEMPLATE_FLAG \
        --output .steel/tmp/impl-task${K}-iter${N}-gauge-prompt.md
      ```
      - `implementation` (default): heavy `review-code` template — full git diff, security/correctness/quality checklist.
      - `verification`: light `review-verification` template — confirms the right command was run, the result matched the criteria, and cleanup happened. Skips security/correctness/quality sections (no source change to review).
      - Missing or unrecognized `type` falls back to the heavy template (safe direction).
   h. Run gauge per `config.gauge.provider`:
      - If `claude`: spawn a Task subagent (fresh context) with prompt: `Read and follow the instructions in .steel/tmp/impl-task${K}-iter${N}-gauge-prompt.md. Output the code review and end with exactly one VERDICT line. Do NOT re-run tests — trust the Forge's reported pass/fail status and verify claims by reading code.`
      - Else: `steel run-gauge --provider <name> --prompt-file .steel/tmp/impl-task${K}-iter${N}-gauge-prompt.md --output specs/$SPEC_ID/artifacts/implementation/task${K}-iter${N}-gauge.md`.
   i. If subagent path: `steel save-artifact` to the same per-task gauge path.
   j. Commit: `steel commit-step --role gauge --stage implementation --iter $N --msg "task $K iteration $N review — <VERDICT>"`.
   k. Parse verdict. APPROVE → break, move to next task. REVISE → `steel state iter --inc`, set `PRIOR_GAUGE`, loop.

   ### Max-iter cap (per task)
   l. On cap with no APPROVE, prompt: "Max iterations reached for task $K. Continue for `<maxIterations>` more? (y/N)".
      - Yes: continue.
      - No: leave stage `in_progress`. Tell the user: "Stuck on task $K. Re-run `/steel-implement` to resume." Stop.

   Show: `Task K/total complete: <title>`.

5. After all tasks done:
   - `steel state mark --stage implementation --status complete`
   - `steel tag-stage --stage implementation`
   - `steel state advance-stage`

6. Track skills: `steel state set-skills --stage implementation --skills <names>` (skills used across all tasks).

7. Tell the user: "Implementation complete. Run `/steel-validate` to verify."
