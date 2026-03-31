Run the next stage in the Steel-Kit workflow.

## Steps

1. Read `.steel/state.json` to determine the current stage.

2. If stage is `constitution` or `specification`, stop: tell the user to run `/steel-specify "<description>"` first.

3. Based on the current stage, execute the corresponding slash command:
   - `clarification` → follow the steps in `/steel-clarify`
   - `planning` → follow the steps in `/steel-plan`
   - `task_breakdown` → follow the steps in `/steel-tasks`
   - `implementation` → follow the steps in `/steel-implement`
   - `validation` → follow the steps in `/steel-validate`
   - `retrospect` → follow the steps in `/steel-retrospect`

4. If all stages are complete, run `/steel-status` and say "Workflow complete!"
