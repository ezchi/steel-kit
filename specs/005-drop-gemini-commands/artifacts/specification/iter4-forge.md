# Spec 005: Drop `.gemini/commands/` — Let Gemini Use `.agents/skills/`

## Overview

`steel init` currently installs commands to three directories: `.claude/commands/`, `.gemini/commands/`, and `.agents/skills/`. Gemini CLI reads both `.gemini/commands/` and `.agents/skills/`, causing 14 duplicate `/steel-*` command conflicts at runtime. Since `.agents/skills/` is already shared between Codex and Gemini, we can eliminate `.gemini/commands/` entirely. This reduces the install surface from three directories to two, removes the TOML rendering pipeline, and eliminates a class of drift bugs.

After this change:
- **Claude Code** reads from `.claude/commands/` (Markdown)
- **Gemini CLI + Codex CLI** both read from `.agents/skills/` (Markdown with YAML frontmatter)

Gemini remains a fully supported Forge/Gauge provider. Only the redundant command installation surface is removed.

## User Stories

- **US-1**: As a developer using Gemini CLI, I want Steel-Kit commands to appear exactly once in my command list, so that I don't see confusing duplicates or get prompted to disambiguate.
- **US-2**: As a Steel-Kit maintainer, I want fewer installation surfaces to keep in sync, so that command drift bugs are less likely.
- **US-3**: As an existing user with `.gemini/commands/` files, I want `steel init` or `steel update` to clean up the stale TOML files automatically, so that I don't have to manually delete them.

## Functional Requirements

### FR-1: Remove Gemini Command Installation

Remove the Gemini TOML rendering and installation pipeline from `src/command-installer.ts`:

- Delete `installGeminiCommands()` function (creates `.gemini/commands/` and writes TOML files)
- Delete `renderGeminiCommandToml()` export (converts Markdown to TOML format)
- Delete `adaptMarkdownForGemini()` helper (replaces `$ARGUMENTS` with `<args>`)
- Delete `toTomlString()` helper (TOML string escaping, only used by Gemini rendering)
- Remove the `gemini` field from the `CommandInstallResult` interface
- Remove the Gemini `attemptInstall()` call from `installProjectCommands()`

### FR-2: Make `.agents/skills/` the Canonical Shared Surface

The existing `.agents/skills/` directory becomes the shared surface for both Gemini CLI and Codex CLI.

**Format compatibility**: Gemini CLI reads `.agents/skills/*/SKILL.md` files. The current `renderCodexSkill()` produces Markdown with YAML frontmatter (`name`, `description` fields) and Markdown body. Gemini CLI parses this format correctly.

**Fix cross-reference prefix**: `adaptMarkdownForCodexSkill()` currently replaces `/steel-` with `$steel-` in the command body. This produces Codex-compatible cross-references but breaks Gemini's `/steel-` prefix convention. Since this surface now serves both providers:
- **Remove the `/steel-` → `$steel-` replacement** from `adaptMarkdownForCodexSkill()`. The canonical `/steel-` prefix works for both Gemini CLI (which uses `/` natively) and Codex CLI (which maps `/` to `$` at its own layer). Codex CLI invokes skills from `.agents/skills/` by directory name, not by the prefix used within the prompt text — the `$steel-` rewrite was a cosmetic adaptation, not a functional requirement.
- Keep the `$ARGUMENTS` → `the user-provided input` replacement (this is provider-neutral descriptive text).

**Make wrapper text provider-neutral**: The current `renderCodexSkill()` injects the line `Use this skill when the user invokes \`$<name>\` or asks to run the corresponding Steel-Kit workflow step in Codex.` This is Codex-specific guidance. Replace it with provider-neutral text such as `Use this skill when the user invokes \`/<name>\` or asks to run the corresponding Steel-Kit workflow step.` — no provider name, canonical `/` prefix.

**Rename for clarity**: Rename `renderCodexSkill()` to `renderAgentSkill()` and `adaptMarkdownForCodexSkill()` to `adaptMarkdownForAgentSkill()` since these now serve both providers.

### FR-3: Update Init Command Output and Add Cleanup

In `commands/init.ts`:

- Remove Gemini count from the installation summary log message
- Remove `.gemini/commands` from the `writtenPaths` array (no longer staged for git)
- Update any user-facing messaging that references `.gemini/commands/` as an installation target
- Add migration cleanup: if `.gemini/commands/steel-*.toml` files exist in the project, delete them and log the count (same cleanup as `steel update`, so users who re-init also get migrated)

### FR-4: Update Update Command with Cleanup

In `commands/update.ts`:

- Remove Gemini count from the update summary log message
- Update the pre-summary log line to reflect only Claude and agents/skills surfaces (remove "Gemini CLI" from the list of surfaces being updated)
- Add migration cleanup: detect and delete existing `.gemini/commands/steel-*.toml` files from the target project directory
- Log a message when stale files are cleaned up (e.g., `"Removed N stale .gemini/commands/ TOML files"`)

### FR-5: Update Doctor Health Checks

In `src/doctor.ts`:

- Remove the import of `renderGeminiCommandToml`
- Remove the Gemini surface drift check block (which compares `.gemini/commands/*.toml` against canonical sources)
- Keep Gemini in the provider availability checks (`checkProviders()`, `checkAuth()`) since Gemini is still a valid Forge/Gauge provider
- The `.agents/skills/` surface check already covers Gemini's command surface after this change

### FR-6: Update Tests

**Existing test updates:**
- Update mock return values in init/update tests to remove the `gemini` field from `CommandInstallResult`
- Update any imports of `renderGeminiCommandToml` in test files

**New tests required:**
- `installProjectCommands()` does NOT create a `.gemini/commands/` directory
- `steel update` cleanup: given a project with existing `.gemini/commands/steel-*.toml` files, `cmdUpdate()` deletes them and logs the count
- `steel init` cleanup: given a project with existing `.gemini/commands/steel-*.toml` files, `installSlashCommands()` deletes them
- `runDoctor()` does not emit `surface-missing` or `surface-stale` diagnostics for `.gemini/commands/` artifacts
- Init and update summary output does not reference Gemini command counts
- `.agents/skills/` content preserves `/steel-` prefixes (not rewritten to `$steel-`)
- `.agents/skills/` SKILL.md files do not contain Codex-specific usage guidance (no "in Codex" or `$steel-` references)
- `cmdUpdate()` pre-summary log line does not mention "Gemini CLI" as a surface being updated
- `installSlashCommands()` summary log line does not mention Gemini command counts

### FR-7: Repo-Wide Cleanup of `.gemini/commands/` References

Perform a repo-wide search for references to `.gemini/commands/` as an installation surface and update or remove them. Scope: `src/`, `commands/`, `resources/commands/`, `docs/`, and `README.md`. Specifically:

- `resources/commands/*.md` — update descriptions that list installation surfaces to mention only `.claude/commands/` and `.agents/skills/`
- `README.md` — remove `.gemini/commands/` as an installation target; document that Gemini CLI reads from `.agents/skills/`
- `docs/` directory — update any docs referencing `.gemini/commands/`

Keep references to Gemini CLI as a supported provider — only command installation surface references change. Spec artifacts (`specs/`) are excluded from this cleanup.

## Non-Functional Requirements

- **NFR-1: No breakage of Gemini as a provider.** Gemini must remain selectable as a Forge or Gauge provider in `.steel/config.json`. This change only removes the command installation surface, not provider support.
- **NFR-2: Backward-compatible migration.** Existing users with `.gemini/commands/` files must not experience breakage. Both `steel init` and `steel update` must clean up stale files automatically.
- **NFR-3: All tests pass.** `npm test` and `npm run lint` must pass after the change. `npm run build` must succeed since TypeScript types change.

## Acceptance Criteria

- **AC-1:** `steel init` in a fresh project creates commands in `.claude/commands/` and `.agents/skills/` only. No `.gemini/commands/` directory is created.
- **AC-2:** `steel update` in a project with existing `.gemini/commands/steel-*.toml` files removes those files and logs the cleanup.
- **AC-3:** `steel init` in a project with existing `.gemini/commands/steel-*.toml` files removes those files.
- **AC-4:** `.agents/skills/` SKILL.md files preserve `/steel-` prefixed cross-references (not rewritten to `$steel-`).
- **AC-5:** `steel doctor` does not report Gemini surface drift diagnostics (`surface-missing` or `surface-stale` for `.gemini/commands/`). Provider availability for Gemini is still checked.
- **AC-6:** `npm test`, `npm run lint`, and `npm run build` all pass.
- **AC-7:** Gemini remains configurable as Forge or Gauge provider in `.steel/config.json`.
- **AC-8:** Grep for `.gemini/commands/` across `src/`, `commands/`, `resources/commands/`, `docs/`, and `README.md` returns zero hits.
- **AC-9:** User-facing log output from `steel init` and `steel update` does not reference Gemini command counts or `.gemini/commands/` as a surface.

## Out of Scope

- Removing Gemini as a Forge/Gauge provider entirely — Gemini stays as a supported LLM.
- Changing the `.agents/skills/` SKILL.md YAML frontmatter format or directory structure.
- Adding new Gemini-specific features or configuration.
- Modifying `.gitignore` patterns — `.gemini/commands/` was committed; old files in existing repos beyond Steel-Kit TOML files are the user's responsibility.

## Open Questions

None.
