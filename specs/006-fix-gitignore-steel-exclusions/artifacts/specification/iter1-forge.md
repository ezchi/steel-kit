# Specification: Fix .gitignore to Exclude Steel-Kit Generated Files

**Spec ID:** 006-fix-gitignore-steel-exclusions  
**Status:** Draft  
**Created:** 2026-04-05

## Overview

The `steel-init` command removes `.steel/` from `.gitignore` and commits tool-generated configuration and command files that should not be version-controlled. This pollutes the repository with ephemeral tool state that varies per developer and per session. This spec defines the changes needed to properly ignore generated Steel-Kit artifacts while preserving the files that _should_ be tracked (`.steel/constitution.md` and `.steel/.gitignore`).

## User Stories

- **US-1:** As a developer, I want Steel-Kit generated files (config, commands, skills) excluded from git tracking, so that my repository is not polluted with ephemeral tool artifacts.
- **US-2:** As a developer, I want `.steel/constitution.md` and `.steel/.gitignore` to remain tracked, so that project governance and ignore rules are shared across the team.
- **US-3:** As a developer, I want already-tracked generated files removed from the git index (but kept on disk), so that the ignore rules take effect immediately without losing local files.

## Functional Requirements

### FR-1: Update Root `.gitignore`

Add the following entries to `/Users/ezchi/Projects/steel-kit/.gitignore`:

```
# Steel-Kit generated files
.steel/*
!.steel/.gitignore
!.steel/constitution.md
.claude/commands/steel-*
.agents/skills/steel-*/
```

**Rationale:** `.steel/*` with negation patterns (`!`) allows `.steel/constitution.md` and `.steel/.gitignore` to remain tracked while ignoring everything else under `.steel/`. The `.claude/commands/steel-*` and `.agents/skills/steel-*/` patterns cover the installed command and skill files that `steel-init` generates.

### FR-2: Update `.steel/.gitignore`

Replace the contents of `.steel/.gitignore` with:

```
# Ephemeral working state — do not commit
*
!.gitignore
!constitution.md
```

**Rationale:** This acts as a defense-in-depth layer inside `.steel/` itself. The current file only ignores `state.json` and `tasks.json` by name, which misses `config.json` and any future generated files. The wildcard-with-exceptions approach is more robust.

### FR-3: Remove Tracked Files from Git Index

Run `git rm --cached` on all files that are now ignored but currently tracked:

- `.steel/config.json` (1 file)
- `.claude/commands/steel-*.md` (14 files)
- `.agents/skills/steel-*/SKILL.md` (14 files)

These files must remain on disk (local working copies are not deleted). Only the git index entries are removed so that the new ignore rules take effect.

### FR-4: Commit the Changes

Create a single commit containing:
1. The updated `.gitignore`
2. The updated `.steel/.gitignore`
3. The `git rm --cached` deletions from the index

Commit message should follow the project's conventional commit style.

## Non-Functional Requirements

- **NFR-1:** The change must not delete any files from disk — only from the git index.
- **NFR-2:** The change must not affect non-steel files in `.claude/commands/` or `.agents/skills/` (i.e., only files matching `steel-*` patterns are affected).
- **NFR-3:** The solution must work on both macOS and Linux (per constitution constraints).

## Acceptance Criteria

- **AC-1:** After the change, `git status` no longer shows `.steel/config.json`, `.claude/commands/steel-*.md`, or `.agents/skills/steel-*/SKILL.md` as tracked.
- **AC-2:** `ls .steel/config.json` confirms the file still exists on disk.
- **AC-3:** `git check-ignore .steel/config.json .claude/commands/steel-init.md .agents/skills/steel-init/SKILL.md` lists all three paths as ignored.
- **AC-4:** `.steel/constitution.md` remains tracked: `git ls-files .steel/constitution.md` returns the path.
- **AC-5:** `.steel/.gitignore` remains tracked: `git ls-files .steel/.gitignore` returns the path.
- **AC-6:** Non-steel files under `.claude/commands/` and `.agents/skills/` are unaffected.

## Out of Scope

- Modifying `steel-init` behavior to prevent it from removing `.steel/` from `.gitignore` in the first place (that is a separate fix to the init command logic).
- Changing how `steel-init` generates or installs command/skill files.
- Adding `.steel/` entries to a global gitignore.

## Open Questions

None — the plan from the feature description is well-defined. All requirements are clear.
