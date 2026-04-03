diff --git a/specs/001-steel-doctor-health-checks/spec.md b/specs/001-steel-doctor-health-checks/spec.md
index a84c90b..1954ff7 100644
--- a/specs/001-steel-doctor-health-checks/spec.md
+++ b/specs/001-steel-doctor-health-checks/spec.md
@@ -30,7 +30,7 @@ The command must align with the project constitution:
 
 ### Project and workflow checks
 
-- FR-4: The command shall detect whether the current repository is initialized for Steel-Kit by checking for this minimum required project structure: `.steel/`, `.steel/config.json`, `.steel/constitution.md`, and `.steel/.gitignore`.
+- FR-4: The command shall detect whether the current repository is initialized for Steel-Kit by checking for this minimum required project structure: `.steel/`, `.steel/config.json`, `.steel/constitution.md`, and `.steel/.gitignore`. If `.steel/state.json` exists but cannot be parsed as valid JSON, the command shall report a `fail` diagnostic with check ID `init-state-corrupt` and remediation "Delete `.steel/state.json` and run any `steel` command to recover from artifacts."
 - FR-5: The command shall report whether `.steel/constitution.md` is missing, placeholder-only, or ready for workflow use. Placeholder detection shall match the current constitution gate behavior: content containing `<!-- Define the core principles` is treated as placeholder and not ready.
 - FR-6: The command shall inspect `.steel/state.json`, current git branch, `state.branch`, and active spec directory and report drift or inconsistency between them using explicit rules:
   - If `state.specId` is present, the expected workflow branch is `spec/<state.specId>`.
@@ -64,13 +64,14 @@ The command must align with the project constitution:
   - Claude Code command files are direct copies of `resources/commands/*.md`
   - Gemini CLI command files are TOML renders via `renderGeminiCommandToml()`
   - Codex skills are `SKILL.md` renders via `renderCodexSkill()`
+  Note: The implementation must ensure both `renderGeminiCommandToml` and `renderCodexSkill` are exported from `src/command-installer.ts` so the doctor module can import them directly rather than duplicating rendering logic.
 
 ### Provider checks
 
 - FR-14: The command shall inspect configured Forge and Gauge providers from Steel-Kit configuration and verify whether the corresponding provider CLIs are available on `PATH`.
 - FR-15: The command shall also report availability status for Codex, Gemini CLI, and Claude Code across all three supported provider surfaces.
 - FR-16: Missing configured Forge or Gauge provider CLIs shall produce `fail` diagnostics. Missing unconfigured provider CLIs shall produce `warn` diagnostics so full-surface parity remains visible without blocking projects that intentionally use only one pair.
-- FR-17: Authentication checks, if implemented, shall be best-effort and advisory only. They may produce `warn` or `note` style information but shall never produce a `fail`, shall not require network access by default, and shall not mutate local or remote auth state.
+- FR-17: Authentication checks shall be limited to checking provider-specific environment variables: `ANTHROPIC_API_KEY` for Claude, `CODEX_API_KEY` or `OPENAI_API_KEY` for Codex, and `GEMINI_API_KEY` for Gemini (matching the env vars already used in `src/providers/`). If the relevant env var is absent, report a `warn` noting that subscription or account-based auth may still work. Auth checks shall never produce a `fail`, shall not require network access, shall not parse credential files, and shall not mutate local or remote auth state.
 
 ### Diagnostic model
 
@@ -110,6 +111,7 @@ The command must align with the project constitution:
   | `provider-configured` | Configured Forge/Gauge CLI not on PATH | `fail` |
   | `provider-unconfigured` | Unconfigured supported CLI not on PATH | `warn` |
   | `provider-auth` | Advisory auth signal absent (e.g., env var) | `warn` |
+  | `init-state-corrupt` | `.steel/state.json` exists but is not valid JSON | `fail` |
 
 ### Auditability and parity
 
@@ -152,4 +154,11 @@ The command must align with the project constitution:
 
 ## Open Questions
 
-- [NEEDS CLARIFICATION] Should advisory auth diagnostics be limited to obvious local signals such as missing environment variables, or should they also parse provider-specific local credential/session files when present?
+None — all clarifications resolved.
+
+## Changelog
+
+- [Clarification iter1] FR-17: Resolved auth diagnostics scope — limited to environment variable checks only (`ANTHROPIC_API_KEY`, `CODEX_API_KEY`/`OPENAI_API_KEY`, `GEMINI_API_KEY`). No credential file parsing.
+- [Clarification iter1] FR-13: Added note that `renderGeminiCommandToml` must be exported from `src/command-installer.ts` for doctor to reuse.
+- [Clarification iter1] FR-4: Added corrupt `state.json` handling — unparseable JSON produces `fail` with check ID `init-state-corrupt`.
+- [Clarification iter1] FR-27: Added `init-state-corrupt` to severity matrix.
