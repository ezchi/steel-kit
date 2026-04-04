# Spec 005: Drop `.gemini/commands/` — Let Gemini Use `.agents/skills/`

## Overview

`steel init` currently installs commands to three directories: `.claude/commands/`, `.gemini/commands/`, and `.agents/skills/`. Gemini CLI reads both `.gemini/commands/` and `.agents/skills/`, causing 14 duplicate `/steel-*` command conflicts at runtime. Since `.agents/skills/` is already shared between Codex and Gemini, we can eliminate `.gemini/commands/` entirely. This reduces the install surface from three directories to two, removes the TOML rendering pipeline, and eliminates a class of drift bugs.

After this change:
- **Claude Code** reads from `.claude/commands/` (Markdown)
- **Gemini CLI + Codex CLI** both read from `.agents/skills/` (Markdown)

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

### FR-2: Update Init Command Output

In `commands/init.ts`:

- Remove Gemini count from the installation summary log message
- Remove `.gemini/commands` from the `writtenPaths` array (no longer staged for git)
- Remove GEMINI_API_KEY references from next-steps messaging (Gemini auth guidance is orthogonal to command installation)

### FR-3: Update Update Command with Cleanup

In `commands/update.ts`:

- Remove Gemini count from the update summary log message
- Add migration cleanup: detect and delete existing `.gemini/commands/steel-*.toml` files from the target project directory
- Log a message when stale files are cleaned up (e.g., `"Removed N stale .gemini/commands/ TOML files"`)

### FR-4: Update Doctor Health Checks

In `src/doctor.ts`:

- Remove the import of `renderGeminiCommandToml`
- Remove the Gemini surface drift check block (which compares `.gemini/commands/*.toml` against canonical sources)
- Keep Gemini in the provider availability checks (`checkProviders()`, `checkAuth()`) since Gemini is still a valid Forge/Gauge provider
- The `.agents/skills/` surface check (Codex path) already covers Gemini's command surface after this change

### FR-5: Update Tests

In `src/command-installer.test.ts`:

- Remove any Gemini-specific test cases (currently none exist, but the mock in init tests returns `gemini: 0`)
- Update mock return values in `commands/init.test.ts` (or similar) to remove the `gemini` field from `CommandInstallResult`
- Add a test verifying that `installProjectCommands()` does NOT create a `.gemini/commands/` directory

### FR-6: Update Resource Command Files

In `resources/commands/*.md`:

- Remove references to `.gemini/commands/` paths
- Update descriptions that list installation surfaces to mention only `.claude/commands/` and `.agents/skills/`
- Keep references to Gemini CLI as a supported provider (Gemini is still supported; only the command directory changes)

### FR-7: Update Documentation

In `README.md` and any other user-facing docs:

- Remove mentions of `.gemini/commands/` as an installation target
- Document that Gemini CLI reads commands from `.agents/skills/` (shared with Codex)

## Non-Functional Requirements

- **NFR-1: No breakage of Gemini as a provider.** Gemini must remain selectable as a Forge or Gauge provider in `.steel/config.json`. This change only removes the command installation surface, not provider support.
- **NFR-2: Backward-compatible migration.** Existing users with `.gemini/commands/` files must not experience breakage. `steel update` must clean up stale files automatically.
- **NFR-3: All tests pass.** `npm test` and `npm run lint` must pass after the change. `npm run build` must succeed since TypeScript types change.

## Acceptance Criteria

- **AC-1:** `steel init` in a fresh project creates commands in `.claude/commands/` and `.agents/skills/` only. No `.gemini/commands/` directory is created.
- **AC-2:** `steel update` in a project with existing `.gemini/commands/steel-*.toml` files removes those files and logs the cleanup.
- **AC-3:** Gemini CLI in a project after `steel init` shows `/steel-*` commands from `.agents/skills/` with no duplicate warnings.
- **AC-4:** `steel doctor` does not report Gemini surface drift diagnostics (since the surface no longer exists). Provider availability for Gemini is still checked.
- **AC-5:** `npm test`, `npm run lint`, and `npm run build` all pass.
- **AC-6:** Gemini remains configurable as Forge or Gauge provider in `.steel/config.json`.

## Out of Scope

- Removing Gemini as a Forge/Gauge provider entirely — Gemini stays as a supported LLM.
- Changing the `.agents/skills/` format or structure — that surface already works for both Codex and Gemini.
- Changing the `adaptMarkdownForCodexSkill()` function — its `$ARGUMENTS` → `$steel-` replacement is Codex-specific and unrelated.
- Adding new Gemini-specific features or configuration.
- Modifying `.gitignore` patterns — `.gemini/commands/` was committed; old files in existing repos are the user's responsibility beyond what `steel update` cleans up.

## Open Questions

None. The plan from the feature description is clear and the codebase analysis confirms all integration points.
