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

### CL-4: `/steel-` cross-references in shared `.agents/skills/` — assumption with validation

FR-2 removes the `/steel-` → `$steel-` rewrite so that the shared surface uses canonical `/steel-` prefixes. The rationale: `/steel-` references in SKILL.md are prompt text consumed by the LLM, not parsed as CLI commands. Gemini CLI natively uses `/steel-` prefixes, so this works directly.

**Assumption**: Codex CLI's LLM will correctly interpret `/steel-` cross-references in prompt text and guide users to the appropriate Codex invocation (`$steel-*`), since the LLM understands the context of the CLI it's operating in.

**Required validation step**: After implementation, manually test in Codex CLI that a skill referencing `/steel-plan` in its body still produces correct guidance. If Codex's LLM echoes `/steel-plan` literally (causing user confusion), a follow-up fix would be needed — but this is a behavioral test, not a code change, and the current `$steel-` rewrite was always a best-effort cosmetic adaptation with no guarantee the LLM would use it verbatim either.

### CL-5: No changes to `src/config.ts` provider list

Gemini remains in the `PROVIDERS` array and as a valid Forge/Gauge choice. The config UI, provider selection, and execution paths are unchanged.

### CL-6: Clarification artifact naming

This feature does not rename clarification-stage artifacts. Current runtime code (e.g., `src/doctor.ts`, `src/workflow.ts`, `commands/plan.ts`) references `clarifications.md` (plural). This spec's artifact is named `clarification.md` (singular) following the stage name convention used in the spec directory. The naming mismatch is pre-existing and out of scope.
