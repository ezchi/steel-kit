Run all remaining stages in the Steel-Kit workflow automatically.

## Steps

1. Read `.steel/state.json` to determine the current stage.

2. If stage is `specification`, stop: tell the user to run `/steel-specify "<description>"` first.

3. Execute each remaining stage in order by following their slash command steps:
   - `clarification` → `/steel-clarify` steps
   - `planning` → `/steel-plan` steps
   - `task_breakdown` → `/steel-tasks` steps
   - `implementation` → `/steel-implement` steps
   - `validation` → `/steel-validate` steps
   - `retrospect` → `/steel-retrospect` steps

4. Between each stage, re-read `.steel/state.json` to confirm the stage advanced. If it didn't (e.g., human approval was declined at a gate), stop and inform the user.

5. After all stages complete (or stopped), run `/steel-status` to show final state.

Note: Human approval gates at specification→clarification and planning→task_breakdown will still pause and ask the user. If the user declines, the run stops at that stage.
