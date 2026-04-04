---
name: steel-tasks
description: "Steel-Kit workflow skill: Break the implementation plan into ordered, actionable tasks using the Forge-Gauge loop."
---

# steel-tasks

Use this skill when the user invokes `/steel-tasks` or asks to run the corresponding Steel-Kit workflow step.

Break the implementation plan into ordered, actionable tasks using the Forge-Gauge loop.

## Prerequisites
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `task_breakdown`

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

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

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback. Do not blindly accept all suggestions.

   b. Write tasks to `specs/<specId>/tasks.md`
   c. Save a copy to `specs/<specId>/artifacts/task_breakdown/iterN-forge.md`
   d. Git commit: `forge(task_breakdown): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the task breakdown. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - Write the full review prompt to a file at `specs/<specId>/artifacts/task_breakdown/iterN-gauge-prompt.md`
      - If gauge is `gemini`: run `gemini "Read and follow the instructions in <absolute-path-to-prompt-file>"` in the current project directory
      - If gauge is `codex`: run `codex exec "Read and follow the instructions in <absolute-path-to-prompt-file>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review criteria: task completeness, ordering, dependencies, granularity, constitution alignment. End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `specs/<specId>/artifacts/task_breakdown/iterN-gauge.md`
   g. Git commit: `gauge(task_breakdown): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: critically evaluate feedback against constitution, incorporate valid points, and loop.

4. Also save a JSON version to `.steel/tasks.json` with structure:
   ```json
   [{ "id": 1, "title": "...", "description": "..." }, ...]
   ```

5. Auto-advance to `implementation` stage. **No human approval needed.**

6. Update `.steel/state.json`, tag `steel/<specId>/task_breakdown-complete`.

7. **Track skills used**: Update `.steel/state.json` field `skillsUsed.task_breakdown` with an array of skill names you invoked during this stage. If no skills were used, set it to `[]`.

8. Tell the user: "Tasks ready. Run `/steel-implement` to start implementation."

