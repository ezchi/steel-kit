Initialize Steel-Kit in the current project.

## Steps

1. Check if `.steel/` directory already exists. If it does, stop and inform the user.

2. Create the directory structure:
   - `.steel/`
   - `.steel/.gitignore` with contents:
     ```
     # Ephemeral working state — do not commit
     state.json
     tasks.json
     ```

3. Ask the user which LLM provider to use for the **Forge** (primary agent): `claude`, `gemini`, or `codex`.

4. Ask the user which LLM provider to use for the **Gauge** (inspector agent): `claude`, `gemini`, or `codex`.

5. Create `.steel/config.json` with:
   ```json
   {
     "forge": { "provider": "<user choice>" },
     "gauge": { "provider": "<user choice>" },
     "maxIterations": 5,
     "autoCommit": true,
     "specsDir": "specs"
   }
   ```

6. Create `.steel/constitution.md` with a placeholder template containing these sections with `<!-- TODO -->` comments:
   - Governing Principles
   - Technology Stack
   - Coding Standards
   - Development Guidelines
   - Constraints

7. Create `.steel/state.json` with:
   ```json
   {
     "currentStage": "specification",
     "iteration": 1,
     "stages": {
       "constitution": { "status": "complete", "completedAt": "<now>" },
       "specification": { "status": "pending" },
       "clarification": { "status": "pending" },
       "planning": { "status": "pending" },
       "task_breakdown": { "status": "pending" },
       "implementation": { "status": "pending" },
       "validation": { "status": "pending" }
     }
   }
   ```

8. Git add and commit all `.steel/` files with message: `steel(init): initialize project [iteration 1]`

9. Tell the user:
   - Next steps: run `/steel-constitution` to generate constitution via LLM, or edit `.steel/constitution.md` manually
   - Then run `/steel-specify <description>` to start a feature
