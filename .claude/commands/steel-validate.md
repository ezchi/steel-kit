Validate the implementation against the specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `validation`

## Steps

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `validation`.

2. Read `specs/<specId>/spec.md`, `specs/<specId>/plan.md`, and `.steel/constitution.md`.

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Validate the implementation:
      - Run all tests and report results
      - Verify each acceptance criterion from the spec
      - Check requirement coverage (map FR-* to implementation)
      - Test edge cases and error scenarios
      - Security review (OWASP top 10)
      - Performance check against NFRs

   b. For each validation item, assign one of these verdicts:
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

   c. Write validation report to `specs/<specId>/validation.md` with this structure:

      ```markdown
      # Validation Report

      ## Summary
      - PASS: N | FAIL: N | DEFERRED: N

      ## Results
      (one entry per requirement/acceptance criterion with PASS/FAIL/DEFERRED verdict)

      ## Deferred Items
      (for each DEFERRED item: Requirement, Reason, Risk, Test plan)

      ## Security Review
      ...

      ## Performance Review
      ...
      ```
   c. Save a copy to `specs/<specId>/artifacts/validation/iterN-forge.md`
   d. Git commit: `forge(validation): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the validation results. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review criteria: test coverage, requirement coverage, missed edge cases, constitution compliance. **Also verify every DEFERRED item against the DEFERRED policy** — reject any that should be FAIL. End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `specs/<specId>/artifacts/validation/iterN-gauge.md`
   g. Git commit: `gauge(validation): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: incorporate feedback and loop.

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

6. Auto-advance to `retrospect` stage. **No human approval needed.** Update `.steel/state.json`, tag `steel/validation-complete`.

7. Tell the user: "Validation complete. Run `/steel-retrospect` to review the workflow."
