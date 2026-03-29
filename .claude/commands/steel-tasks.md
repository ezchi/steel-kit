Break the implementation plan into ordered, actionable tasks using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `task_breakdown`

## Steps

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `task_breakdown`.

2. Read `specs/<specId>/spec.md`, `specs/<specId>/plan.md`, and `.steel/constitution.md`.

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Break the plan into ordered tasks. Each task must include:
      - Task number and title
      - Description of what needs to be done
      - Files to create or modify
      - Dependencies on other tasks (by number)
      - Verification criteria
      - Mark parallelizable tasks with [P]

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback. Do not blindly accept all suggestions.

   b. Write tasks to `specs/<specId>/tasks.md`
   c. Save a copy to `.steel/artifacts/task_breakdown/forge-iterN.md`
   d. Git commit: `forge(task_breakdown): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the task breakdown. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review criteria: task completeness, ordering, dependencies, granularity, constitution alignment. End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `.steel/artifacts/task_breakdown/gauge-iterN.md`
   g. Git commit: `gauge(task_breakdown): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: critically evaluate feedback against constitution, incorporate valid points, and loop.

4. Also save a JSON version to `.steel/tasks.json` with structure:
   ```json
   [{ "id": 1, "title": "...", "description": "...", "parallel": false }, ...]
   ```

5. Auto-advance to `implementation` stage. **No human approval needed.**

6. Update `.steel/state.json`, tag `steel/task_breakdown-complete`.

7. Tell the user: "Tasks ready. Run `/steel-implement` to start implementation."
