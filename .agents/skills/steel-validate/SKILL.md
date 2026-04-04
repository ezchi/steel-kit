---
name: steel-validate
description: "Steel-Kit workflow skill: Validate the implementation against the specification using the Forge-Gauge loop."
---

# steel-validate

Use this skill when the user invokes `/steel-validate` or asks to run the corresponding Steel-Kit workflow step.

Validate the implementation against the specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `validation`

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `validation`.

2. Read `specs/<specId>/spec.md`, `specs/<specId>/plan.md`, and `.steel/constitution.md`.

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)

   a. **Run tests first — before any static analysis.** Discover and execute all available test suites:
      1. Detect the project's test runner(s) by checking for:
         - `Makefile` / `CMakeLists.txt` targets (e.g., `make test`, `ctest`)
         - `package.json` scripts (e.g., `npm test`)
         - `pytest` / `cocotb` / `unittest` in Python projects
         - Verilator simulation targets (e.g., `make sim`, `ctest --test-dir build`)
         - Any test runner referenced in the constitution or plan
      2. Run each test suite. Capture the **full stdout/stderr** and the **exit code**.
      3. If a test runner is not installed or a build step is missing, attempt to build first (e.g., `cmake --build build`). If it still fails, record the error — do not silently skip.
      4. Save all test output verbatim to `specs/<specId>/artifacts/validation/iterN-test-output.txt`
      5. Git commit: `forge(validation): iteration N test output [iteration N]`

   b. **Static analysis and manual verification** — using the test results from (a) plus code reading:
      - Verify each acceptance criterion from the spec (cite test results where applicable)
      - Check requirement coverage (map FR-* to implementation AND to tests)
      - Identify untested edge cases and error scenarios
      - Security review (OWASP top 10)
      - Performance check against NFRs

   c. For each validation item, assign one of these verdicts:
      - **PASS** — requirement met and verified
      - **FAIL** — requirement not met or broken
      - **DEFERRED** — cannot be validated now (see policy below)

      ### DEFERRED Policy

      DEFERRED is **acceptable** when ALL of these are true:
      1. The item depends on infrastructure, tooling, or environment that is explicitly listed in the spec's "Out of Scope" section
      2. The untested code path is isolated — it does not affect the correctness of in-scope functionality
      3. A clear test plan exists describing how to validate it once the dependency is available

      DEFERRED is **NOT acceptable** (must be FAIL) when ANY of these are true:
      1. The item covers core functionality defined in the spec's Functional Requirements (FR-*)
      2. The inability to test reveals a design flaw (e.g., tight coupling, missing interface, untestable architecture)
      3. The item was not listed as out-of-scope — missing infrastructure is not an excuse if the spec expected it to work
      4. Deferring would hide a regression risk in code that IS in-scope

      For every DEFERRED item, the validation report MUST include:
      - **Requirement**: which FR/AC/NFR is deferred
      - **Reason**: why it cannot be validated now (cite the specific out-of-scope item)
      - **Risk**: what could go wrong if this is never validated
      - **Test plan**: exact steps to validate once the dependency is available

   d. Write validation report to `specs/<specId>/validation.md` with this structure:

      ```markdown
      # Validation Report

      ## Summary
      - PASS: N | FAIL: N | DEFERRED: N

      ## Test Execution
      | Suite | Command | Exit Code | Pass/Fail/Skip |
      |-------|---------|-----------|----------------|
      (one row per test suite executed; link to full output in artifacts)

      ## Results
      (one entry per requirement/acceptance criterion with PASS/FAIL/DEFERRED verdict)
      (for PASS items backed by tests, cite the specific test name and result)

      ## Deferred Items
      (for each DEFERRED item: Requirement, Reason, Risk, Test plan)

      ## Security Review
      ...

      ## Performance Review
      ...
      ```

   e. **Self-check the report before proceeding:**
      1. Count the number of PASS, FAIL, and DEFERRED verdicts in the Results tables. Verify these counts match the Summary line exactly. If they don't match, fix the Summary before continuing.
      2. For every cited line number (e.g., `file.ts:42`), grep the referenced source file to confirm the cited line actually contains what the report claims. If a line number is wrong, correct it or remove the citation.
      If either check fails, fix the report in `specs/<specId>/validation.md` before proceeding.

   f. Save a copy to `specs/<specId>/artifacts/validation/iterN-forge.md`
   g. Git commit: `forge(validation): iteration N output [iteration N]`

   ### Gauge Phase — FACTUAL VERIFICATION

   The Gauge's job is NOT to rubber-stamp the report. It must independently verify that the Forge's claims are factually correct.

   h. **Build the Gauge verification prompt** that includes ALL of the following:
      - The full validation report from the Forge
      - The spec (`spec.md`) — so the Gauge can cross-check requirement mappings
      - The plan (`plan.md`) — so the Gauge can verify deviation claims
      - The verbatim test output from `specs/<specId>/artifacts/validation/iterN-test-output.txt`
      - The actual source files referenced by PASS claims (read them, don't summarize)

   i. Call the Gauge LLM (per config) to verify. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - Write the full verification prompt to a file at `specs/<specId>/artifacts/validation/iterN-gauge-prompt.md`
      - If gauge is `gemini`: run `gemini "Read and follow the instructions in <absolute-path-to-prompt-file>"` in the current project directory
      - If gauge is `codex`: run `codex exec "Read and follow the instructions in <absolute-path-to-prompt-file>"` in the current project directory
      - If gauge is `claude`: Switch to Gauge role and perform independent verification yourself. Be adversarial.

      The Gauge MUST perform these checks:
      1. **PASS claims**: For each PASS, verify the cited evidence actually proves the requirement is met. Read the relevant source/test files — does the code actually do what the Forge says? Did the tests actually pass?
      2. **FAIL accuracy**: For each FAIL, confirm the failure is real and correctly described. Is the root cause accurate?
      3. **DEFERRED legitimacy**: For each DEFERRED, verify against the DEFERRED policy. Is the dependency truly out-of-scope? Is the code path truly isolated? Reject any that should be FAIL.
      4. **Missing coverage**: Are there requirements from the spec that the Forge didn't address at all? Flag any gaps.
      5. **Test validity**: Do the tests actually test what they claim? Are there tests that pass trivially (e.g., always-true assertions, mocked-away logic)?

      For each disputed claim, cite the specific file/line/test that contradicts the Forge's report.

      End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`

   j. Save verification report to `specs/<specId>/artifacts/validation/iterN-gauge.md`
   k. Git commit: `gauge(validation): iteration N review — <verdict> [iteration N]`

   l. If **APPROVE**: break loop. If **REVISE**: the Forge must fix disputed claims — re-run tests, re-read code, correct the report. Do not just reword — reverify.

4. **If any DEFERRED items exist**, warn the user before advancing:

   ```
   ⚠ Validation has N deferred item(s):
   - FR-X: <short reason>
   - ...
   Review the Deferred Items section in specs/<specId>/validation.md.
   These items need a follow-up validation pass once dependencies are available.
   ```

   If any FAIL items exist, do NOT advance — inform the user and stay on the validation stage so the issues can be fixed.

5. **Track skills used**: Update `.steel/state.json` field `skillsUsed.validation` with an array of skill names you invoked during this stage. If no skills were used, set it to `[]`.

6. Auto-advance to `retrospect` stage. **No human approval needed.** Update `.steel/state.json`, tag `steel/<specId>/validation-complete`.

7. Tell the user: "Validation complete. Run `/steel-retrospect` to review the workflow."

