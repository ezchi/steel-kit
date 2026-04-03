Diagnose project setup, workflow state, and provider health.

Run `steel doctor` to perform a read-only health check of the current project. The command checks initialization, constitution, workflow drift, stage file completeness, generated surface staleness, provider CLI availability, and auth environment variables.

## Usage

- `steel doctor` — human-readable diagnostic output
- `steel doctor --json` — structured JSON output for automation

## What it checks

1. **Initialization**: `.steel/` directory, `config.json`, `constitution.md`, `.gitignore`
2. **Constitution**: placeholder detection
3. **Workflow drift**: `state.specId` vs git branch vs `state.branch` vs spec directory
4. **Stage files**: cumulative prerequisite files for the current workflow stage
5. **State recovery**: detects recoverable state when `state.json` is missing
6. **Canonical sources**: `resources/commands/`, `prompts/`, `templates/` existence
7. **Generated surfaces**: Claude, Gemini, and Codex surface files present and current
8. **Providers**: Forge/Gauge CLI availability on PATH
9. **Auth**: provider-specific environment variables

## Exit codes

- `0` — no `fail` diagnostics (pass or warn only)
- `1` — one or more `fail` diagnostics

This command is diagnostic and read-only. It does not modify any files, state, or git history.
