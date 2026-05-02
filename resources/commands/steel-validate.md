Validate the implementation against the specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `validation`.

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Verify state: `steel state get` and confirm `currentStage` is `validation`.
2. Mark in progress: `steel state mark --stage validation --status in_progress`.

3. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the Forge prompt:
      ```
      steel render-prompt --role forge --stage validation \
        --output .steel/tmp/validate-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   b. **Read the rendered prompt and follow it.** Per the prompt:
      - Run all tests first. Capture verbatim stdout/stderr.
      - If any test fails, debug and fix until green. Do NOT yield to the Gauge with failing tests unless you have hit your iteration cap.
      - Then verify acceptance criteria, requirement coverage, edge cases, security, performance.
      - For verification gates that diff against a base branch, use `{{BASE_BRANCH}}` (already substituted to `state.baseBranch`) — never `master` or `main`.

   c. Save the verbatim test output to `specs/$SPEC_ID/artifacts/validation/iter${N}-test-output.txt` (separate from the validation report).

   d. Write the validation report to `specs/$SPEC_ID/validation.md` with this structure:

      ```markdown
      # Validation Report

      ## Summary
      - PASS: N | FAIL: N | DEFERRED: N

      ## Test Execution
      | Suite | Command | Exit Code | Pass/Fail/Skip |
      |-------|---------|-----------|----------------|

      ## Results
      (one entry per requirement/AC with PASS/FAIL/DEFERRED verdict)

      ## Deferred Items
      (for each DEFERRED: Requirement, Reason, Risk, Test plan)

      ## Security Review
      ## Performance Review
      ```

      ### DEFERRED Policy

      DEFERRED is **acceptable** when ALL are true:
      1. The item depends on infrastructure listed in the spec's "Out of Scope".
      2. The untested code path is isolated.
      3. A clear test plan exists for when the dependency is available.

      DEFERRED is **NOT acceptable** (must be FAIL) when ANY is true:
      1. The item covers core functionality (FR-*).
      2. The inability to test reveals a design flaw.
      3. The item was not listed as out-of-scope.
      4. Deferring would hide a regression risk.

   e. **Self-check** before proceeding:
      1. Count PASS/FAIL/DEFERRED in Results; verify Summary matches.
      2. For every cited line number, grep the source to confirm.

   f. Save artifact: `steel save-artifact --stage validation --iter $N --role forge --content-file specs/$SPEC_ID/validation.md`.
   g. Commit: `steel commit-step --role forge --stage validation --iter $N --msg "iteration $N output"`.

   ### Gauge Phase — FACTUAL VERIFICATION (no test re-run)
   h. Render the Gauge prompt:
      ```
      FORGE_ART=specs/$SPEC_ID/artifacts/validation/iter${N}-forge.md
      steel render-prompt --role gauge --stage validation \
        --review-target $FORGE_ART \
        --output .steel/tmp/validate-iter${N}-gauge-prompt.md
      ```

   i. Run gauge per `config.gauge.provider`:
      - If `claude`: spawn a Task subagent (fresh context) with prompt: `Read and follow the instructions in .steel/tmp/validate-iter${N}-gauge-prompt.md. Verify the Forge's claims by reading source files and the captured test output at specs/$SPEC_ID/artifacts/validation/iter${N}-test-output.txt. Do NOT re-run tests. End with exactly one VERDICT line.`
      - Else: `steel run-gauge --provider <name> --prompt-file .steel/tmp/validate-iter${N}-gauge-prompt.md --output specs/$SPEC_ID/artifacts/validation/iter${N}-gauge.md`.

   The Gauge MUST check:
   1. **PASS claims**: For each PASS, verify cited evidence proves the requirement is met. Read the source/test files (don't re-run).
   2. **FAIL accuracy**: For each FAIL, confirm the failure is real and correctly described.
   3. **DEFERRED legitimacy**: Verify against policy. Reject any that should be FAIL.
   4. **Missing coverage**: Are there spec requirements the Forge didn't address?
   5. **Test validity**: Do the tests actually test what they claim? Trivial assertions or mocked-away logic?

   j. If subagent path: `steel save-artifact --stage validation --iter $N --role gauge --content "$REVIEW"`.
   k. Commit: `steel commit-step --role gauge --stage validation --iter $N --msg "iteration $N review — <VERDICT>"`.
   l. Parse verdict. APPROVE → break. REVISE → `steel state iter --inc`, set `PRIOR_GAUGE`, loop.

   ### Max-iter cap
   m. On cap, prompt the user to extend; same as in `/steel-plan`.

4. **If any DEFERRED items exist**, warn the user before advancing:
   ```
   ⚠ Validation has N deferred item(s):
   - FR-X: <short reason>
   ...
   Review the Deferred Items section in specs/$SPEC_ID/validation.md.
   These items need a follow-up validation pass once dependencies are available.
   ```

   If any FAIL items exist, do NOT advance — leave stage `in_progress` so the issues can be fixed.

5. Auto-advance:
   - `steel state mark --stage validation --status complete`
   - `steel tag-stage --stage validation`
   - `steel state advance-stage`

6. Track skills: `steel state set-skills --stage validation --skills <names>`.

7. Tell the user: "Validation complete. Run `/steel-retrospect` to review the workflow."
