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
- **US-3**: As an existing user with `.gemini/commands/` files, I want `steel update` to clean up the stale TOML files automatically, so that I don't have to manually delete them.

## Functional Requirements

### FR-1: Remove Gemini Command Installation

Remove the Gemini TOML rendering and installation pipeline from `src/command-installer.ts`:

- Delete `installGeminiCommands()` function (creates `.gemini/commands/` and writes TOML files)
- Delete `renderGeminiCommandToml()` export (converts Markdown to TOML format)
- Delete `adaptMarkdownForGemini()` helper (replaces `$ARGUMENTS` with `<args>`)
- Delete `toTomlString()` helper (TOML string escaping, only used by Gemini rendering)
- Remove the `gemini` field from the `CommandInstallResult` interface
- Remove the Gemini `attemptInstall()` call from `installProjectCommands()`

### FR-2: Define Shared `.agents/skills/` as the Canonical Gemini/Codex Surface

The existing `.agents/skills/` directory, rendered by `renderCodexSkill()`, becomes the shared surface for both Gemini CLI and Codex CLI.

**Format compatibility**: Gemini CLI reads `.agents/skills/*/SKILL.md` files. The current `renderCodexSkill()` produces Markdown with YAML frontmatter (`name`, `description` fields) and Markdown body. Gemini CLI parses this format correctly — the YAML frontmatter is ignored or treated as metadata, and the Markdown body is used as the command prompt.

**Cross-reference prefix issue**: `adaptMarkdownForCodexSkill()` currently replaces `/steel-` with `$steel-` in the command body. This produces Codex-compatible cross-references (`$steel-plan`) but Gemini expects `/steel-` prefixed commands. This is a **pre-existing issue** — Gemini users invoking commands from `.agents/skills/` already see `$steel-` cross-references. Fixing the cross-reference format is out of scope for this spec (it requires a renderer-level change to produce CLI-aware cross-references). The current behavior is preserved, not worsened, by this change.

**Rename for clarity** (optional but recommended): Consider renaming `renderCodexSkill()` to `renderAgentSkill()` and `adaptMarkdownForCodexSkill()` to `adaptMarkdownForAgentSkill()` since these now serve both providers. This is a non-functional rename.

### FR-3: Update Init Command Output

In `commands/init.ts`:

- Remove Gemini count from the installation summary log message (currently: `"Installed commands: Claude=${result.claude}, Gemini=${result.gemini}, Codex skills=${result.codex}"`)
- Remove `.gemini/commands` from the `writtenPaths` array (no longer staged for git)
- Update any user-facing messaging that references `.gemini/commands/` as an installation target

### FR-4: Update Update Command with Cleanup

In `commands/update.ts`:

- Remove Gemini count from the update summary log message
- Remove the pre-summary log line that says Steel-Kit is updating commands for "Claude Code, Gemini CLI, and Codex CLI" — update to reflect only Claude and agents/skills surfaces
- Add migration cleanup: detect and delete existing `.gemini/commands/steel-*.toml` files from the target project directory
- Log a message when stale files are cleaned up (e.g., `"Removed N stale .gemini/commands/ TOML files"`)

### FR-5: Update Doctor Health Checks

In `src/doctor.ts`:

- Remove the import of `renderGeminiCommandToml`
- Remove the Gemini surface drift check block (which compares `.gemini/commands/*.toml` against canonical sources)
- Keep Gemini in the provider availability checks (`checkProviders()`, `checkAuth()`) since Gemini is still a valid Forge/Gauge provider
- The `.agents/skills/` surface check (Codex path) already covers Gemini's command surface after this change

### FR-6: Update Tests

**Existing test updates:**
- Update mock return values in init/update tests to remove the `gemini` field from `CommandInstallResult`

**New tests required:**
- `installProjectCommands()` does NOT create a `.gemini/commands/` directory
- `steel update` cleanup: given a project with existing `.gemini/commands/steel-*.toml` files, `cmdUpdate()` deletes them and logs the count
- `runDoctor()` does not emit `surface-missing` or `surface-stale` diagnostics for `.gemini/commands/` artifacts
- Init and update summary output does not reference Gemini command counts

### FR-7: Repo-Wide Cleanup of `.gemini/commands/` References

Perform a repo-wide search for references to `.gemini/commands/` as an installation surface and update or remove them. Known locations include but are not limited to:

- `resources/commands/*.md` — update descriptions that list installation surfaces to mention only `.claude/commands/` and `.agents/skills/`
- `README.md` — remove `.gemini/commands/` as an installation target; document that Gemini CLI reads from `.agents/skills/`
- `docs/` directory — update any docs referencing `.gemini/commands/`
- Prior spec artifacts (read-only; do not modify committed specs, but note for awareness)

Keep references to Gemini CLI as a supported provider — only command installation surface references change.

## Non-Functional Requirements

- **NFR-1: No breakage of Gemini as a provider.** Gemini must remain selectable as a Forge or Gauge provider in `.steel/config.json`. This change only removes the command installation surface, not provider support.
- **NFR-2: Backward-compatible migration.** Existing users with `.gemini/commands/` files must not experience breakage. `steel update` must clean up stale files automatically.
- **NFR-3: All tests pass.** `npm test` and `npm run lint` must pass after the change. `npm run build` must succeed since TypeScript types change.

## Acceptance Criteria

- **AC-1:** `steel init` in a fresh project creates commands in `.claude/commands/` and `.agents/skills/` only. No `.gemini/commands/` directory is created.
- **AC-2:** `steel update` in a project with existing `.gemini/commands/steel-*.toml` files removes those files and logs the cleanup.
- **AC-3:** No `.gemini/commands/` artifacts are installed by any Steel-Kit command. `.agents/skills/` artifacts are generated in the shared SKILL.md format. (Manual Gemini CLI smoke-test recommended but not gate-blocking.)
- **AC-4:** `steel doctor` does not report Gemini surface drift diagnostics (`surface-missing` or `surface-stale` for `.gemini/commands/`). Provider availability for Gemini is still checked.
- **AC-5:** `npm test`, `npm run lint`, and `npm run build` all pass.
- **AC-6:** Gemini remains configurable as Forge or Gauge provider in `.steel/config.json`.
- **AC-7:** No source file or documentation references `.gemini/commands/` as an active installation surface (repo-wide grep returns zero hits outside of prior spec artifacts and git history).

## Out of Scope

- Removing Gemini as a Forge/Gauge provider entirely — Gemini stays as a supported LLM.
- Changing the `.agents/skills/` SKILL.md format or structure — that surface already works for both Codex and Gemini.
- Fixing the `$steel-` vs `/steel-` cross-reference prefix in `.agents/skills/` content — this is a pre-existing issue unrelated to removing the Gemini command surface. May be addressed in a follow-up spec.
- Adding new Gemini-specific features or configuration.
- Modifying `.gitignore` patterns — `.gemini/commands/` was committed; old files in existing repos are the user's responsibility beyond what `steel update` cleans up.

## Open Questions

None. The plan from the feature description is clear and the codebase analysis confirms all integration points.
