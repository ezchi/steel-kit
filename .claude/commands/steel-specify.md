Create a feature specification using the Forge-Gauge dual-agent loop.

Feature description: $ARGUMENTS

## Prerequisites
- `.steel/` must exist (run `/steel-init` first)
- `.steel/state.json` currentStage must be `specification`

## Steps

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `specification`.

2. Generate a spec ID: count existing directories in `specs/`, increment, and create `specs/NNN-<semantic-name>/` where the name is derived from $ARGUMENTS.

3. Create a git branch: `spec/NNN-<semantic-name>`

4. Update `.steel/state.json` with `specId`, `branch`, `description`, and set `specification` status to `in_progress`.

5. Read `.steel/constitution.md` for context.

6. **FORGE-GAUGE LOOP** (max iterations from config, default 5):

   ### Forge Phase (you are the Forge)
   a. Generate a comprehensive specification document including:
      - Overview
      - User Stories (As a [role], I want [action], so that [benefit])
      - Functional Requirements (FR-1, FR-2, etc.)
      - Non-Functional Requirements
      - Acceptance Criteria
      - Out of Scope
      - Open Questions (mark with [NEEDS CLARIFICATION])

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback and follow the constitution. Do not blindly accept all review suggestions.

   b. Write the spec to `specs/NNN-<name>/spec.md`
   c. Save a copy to `specs/<specId>/artifacts/specification/iterN-forge.md`
   d. Git commit: `forge(specification): iteration N output [iteration N]`

   ### Gauge Phase
   e. Read `.steel/config.json` to get the gauge provider.
   f. Call the Gauge LLM to review the spec. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt with spec content>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt with spec content>"` in the current project directory
      - If gauge is `claude`: You ARE Claude, so review the spec yourself critically as the Gauge role — evaluate completeness, clarity, testability, consistency. Be strict.

      The Gauge review prompt must include these instructions:
      - Review for completeness, clarity, testability, consistency, feasibility
      - Check alignment with the Project Constitution
      - List issues with severity: BLOCKING / WARNING / NOTE
      - End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`

   g. Save the review to `specs/<specId>/artifacts/specification/iterN-gauge.md`
   h. Git commit: `gauge(specification): iteration N review — <verdict> [iteration N]`

   i. Parse the verdict: look for `VERDICT: APPROVE` or `VERDICT: REVISE` in the review.

   j. If **APPROVE**: mark stage complete, break the loop.
   k. If **REVISE**: critically evaluate the feedback against the constitution, incorporate valid feedback, and loop back to Forge Phase.

7. After the loop completes, ask the user: **"Approve specification and advance to clarification?"**
   - This is a HUMAN APPROVAL GATE — do not skip it.
   - If approved: update state to `clarification` stage and tag `steel/specification-complete`.
   - If not: leave state as-is so user can re-run.

8. **Track skills used**: Update `.steel/state.json` field `skillsUsed.specification` with an array of skill names you invoked during this stage (e.g., `["systemverilog-core", "sv-gen"]`). If no skills were used, set it to `[]`.

9. Show a summary of the specification.
