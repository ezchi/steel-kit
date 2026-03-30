Generate an implementation plan using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `planning`

## Steps

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `planning`.

2. Read `specs/<specId>/spec.md`, `specs/<specId>/clarifications.md` (if exists), and `.steel/constitution.md`.

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Create a technical implementation plan covering:
      - Architecture Overview
      - Components (responsibilities, interfaces, dependencies)
      - Data Model
      - API Design
      - Dependencies (external libraries/tools)
      - Implementation Strategy (phased approach)
      - Risks and Mitigations
      - Testing Strategy

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback. Do not blindly accept all suggestions.

   b. Write the plan to `specs/<specId>/plan.md`
   c. Save a copy to `specs/<specId>/artifacts/planning/iterN-forge.md`
   d. Git commit: `forge(planning): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the plan. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt with plan content>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt with plan content>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review criteria: spec coverage, architecture soundness, simplicity, risk assessment, testing strategy, alignment with constitution. End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `specs/<specId>/artifacts/planning/iterN-gauge.md`
   g. Git commit: `gauge(planning): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: critically evaluate feedback against constitution, incorporate valid points, and loop.

4. Auto-advance to `task_breakdown` stage. **No human approval needed here.**

5. Update `.steel/state.json`, tag `steel/planning-complete`.

6. Tell the user: "Plan complete. Run `/steel-tasks` to break down tasks."
