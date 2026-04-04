# Clarification: 005-drop-gemini-commands

## Summary

No open questions were identified in the specification. All functional requirements reference specific functions, files, and line-level behaviors. The scope is a pure removal with targeted adaptations to the shared surface.

## Clarifications

### CL-1: `extractDescription()` is shared — do not delete

`extractDescription()` in `src/command-installer.ts` is used by both `renderGeminiCommandToml()` and `renderCodexSkill()` (to become `renderAgentSkill()`). When deleting Gemini-specific code, `extractDescription()` must be preserved since the agent skill renderer still depends on it.

### CL-2: Cleanup scope for `.gemini/commands/`

The cleanup in FR-3 and FR-4 targets only `steel-*.toml` files (files Steel-Kit installed). If the user has other files in `.gemini/commands/`, those are untouched. The cleanup does NOT delete the `.gemini/commands/` directory itself — only the Steel-Kit TOML files within it.

### CL-3: `renderGeminiCommandToml` import in doctor.ts

`src/doctor.ts` imports `renderGeminiCommandToml` to generate expected TOML content for drift comparison. After removal, this import and all code paths using it are deleted. The doctor's `checkSurfaces()` function will only check Claude commands and agent skills surfaces.

### CL-4: Codex CLI `/` to `$` mapping behavior

FR-2 asserts that Codex CLI maps `/` to `$` at its own layer, so `/steel-` cross-references in prompt text work for both Gemini and Codex. This was verified by examining Codex CLI's skill invocation — skills are invoked by directory name (e.g., `$steel-init`), not by parsing `/steel-init` references within prompt bodies. The prompt text is presented to the LLM, which uses it as context, not as a CLI command.

### CL-5: No changes to `src/config.ts` provider list

Gemini remains in the `PROVIDERS` array and as a valid Forge/Gauge choice. The config UI, provider selection, and execution paths are unchanged.
