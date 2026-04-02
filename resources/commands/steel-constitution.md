Generate a project constitution by analyzing the current codebase.

User prompt (optional): $ARGUMENTS

## Steps

1. Read `.steel/config.json` to confirm project is initialized. If not, tell user to run `/steel-init` first.

2. Read the existing `.steel/constitution.md`. If it contains real content (not just placeholder `<!-- TODO -->` comments), ask the user if they want to overwrite it.

3. Analyze the current project: read `package.json`, `tsconfig.json`, any config files, source code structure, and existing documentation.

4. Generate a constitution document with these sections based on your analysis:

   **# Project Constitution**

   **## Governing Principles** — Core principles that guide development decisions for this project

   **## Technology Stack** — Languages, frameworks, tools, and their versions (based on what you found)

   **## Coding Standards** — Style guide, naming conventions, code organization rules

   **## Development Guidelines** — Workflow rules: branching, testing, review requirements, commit conventions

   **## Constraints** — Hard constraints: performance budgets, compatibility targets, security requirements

   If the user provided a prompt in $ARGUMENTS, incorporate their guidance into the constitution.

5. Write the constitution to `.steel/constitution.md`.

6. Git add and commit with message: `steel(constitution): generate project constitution [iteration 1]`

7. Show the user a summary of what was generated and remind them to review and edit as needed.
