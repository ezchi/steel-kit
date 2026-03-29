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

   b. Write validation report to `specs/<specId>/validation.md`
   c. Save a copy to `.steel/artifacts/validation/forge-iterN.md`
   d. Git commit: `forge(validation): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the validation results. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review criteria: test coverage, requirement coverage, missed edge cases, constitution compliance. End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `.steel/artifacts/validation/gauge-iterN.md`
   g. Git commit: `gauge(validation): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: incorporate feedback and loop.

4. Auto-advance to done. **No human approval needed.** Update `.steel/state.json`, tag `steel/validation-complete`.

5. Show final summary: "Workflow complete! All stages passed."
