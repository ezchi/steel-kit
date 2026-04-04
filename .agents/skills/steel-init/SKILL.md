---
name: steel-init
description: "Steel-Kit workflow skill: Initialize Steel-Kit in the current project."
---

# steel-init

Use this skill when the user invokes `$steel-init` or asks to run the corresponding Steel-Kit workflow step in Codex.

Initialize Steel-Kit in the current project.

## Steps

1. Confirm the user wants to initialize Steel-Kit in the current repository.

2. Run `steel init` from the project root.

3. Explain what was created:
   - `.steel/` workflow state and configuration
   - Claude Code commands in `.claude/commands/`
   - Gemini CLI commands in `.gemini/commands/`
   - Codex skills in `.agents/skills/`

4. Tell the user the next step is `$steel-constitution` in Codex, `$steel-constitution` in Claude Code, or `$steel-constitution` in Gemini CLI.

