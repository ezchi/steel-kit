Run clarification on the current specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `clarification`

## Steps

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `clarification`.

2. Read the spec from `specs/<specId>/spec.md` and `.steel/constitution.md`.

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Review the specification and:
      - Identify all [NEEDS CLARIFICATION] markers
      - Resolve each ambiguity with a recommended resolution and rationale
      - Identify implicit assumptions that should be explicit
      - Check for contradictions between requirements

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback. Do not blindly accept all suggestions.

   b. Write clarifications to `specs/<specId>/clarifications.md`
   c. Save a copy to `.steel/artifacts/clarification/iterN-forge.md`
   d. Git commit: `forge(clarification): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the clarifications. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review prompt must instruct: evaluate whether clarifications are complete, logical, align with the constitution, and resolve all ambiguities. End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `.steel/artifacts/clarification/iterN-gauge.md`
   g. Git commit: `gauge(clarification): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: critically evaluate feedback against constitution, incorporate valid points, and loop.

4. After the loop completes, ask the user: **"Approve clarifications and advance to planning?"**
   - This is a HUMAN APPROVAL GATE — do not skip it.
   - If approved: update state to `planning` stage and tag `steel/clarification-complete`.
   - If not: leave state as-is.

5. Tell the user: "Run `/steel-plan` to generate the implementation plan."
