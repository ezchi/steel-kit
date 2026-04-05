# Specification: Commit Only constitution.md from .steel/

**Spec ID:** 004-commit-only-constitution  
**Status:** Draft  
**Author:** Forge (Claude)

---

## Overview

Currently, the root `.gitignore` contains `.steel/`, which ignores the entire directory — including `constitution.md`. The `.steel/.gitignore` separately lists `state.json` and `tasks.json`, but this is redundant because the parent rule already excludes everything.

The constitution is the project's shared source of truth and must be version-controlled. All other `.steel/` files (`config.json`, `state.json`, `tasks.json`, `.gitignore`) are contributor-specific or ephemeral and should remain gitignored.

This change restructures the gitignore rules so that only `.steel/constitution.md` is committed, while everything else in `.steel/` stays ignored.

## User Stories

- **US-1:** As a contributor, I want the project constitution to be tracked in git, so that all team members share the same governing principles.
- **US-2:** As a contributor, I want my local `.steel/config.json` to remain untracked, so that I can configure my own Forge/Gauge providers without conflicting with others.
- **US-3:** As a contributor cloning the repo, I want to see `.steel/constitution.md` already present, so that I can start the Steel-Kit workflow without needing someone else's config files.

## Functional Requirements

### FR-1: Restructure .gitignore rules for .steel/

Replace the current root `.gitignore` entry `.steel/` with a two-line block that allows only `constitution.md`:

```gitignore
.steel/*
!.steel/constitution.md
```

The `/*` glob (instead of `/`) is required so that negation patterns for files inside `.steel/` can take effect. The two lines must appear in this exact order and must both be present; the negation only works when preceded by the wildcard exclusion.

### FR-2: Remove .steel/.gitignore

The inner `.steel/.gitignore` file becomes unnecessary once the root `.gitignore` handles exclusion via `/*` + negation. Remove the file from the working tree and from the git index (if tracked).

### FR-3: Update steel-init to stop creating .steel/.gitignore

In `commands/init.ts`, remove the code block (approximately lines 51–62) that creates `.steel/.gitignore`. The root `.gitignore` pattern now handles all exclusion logic.

### FR-4: Update steel-init to ensure root .gitignore has correct .steel pattern

During `steel init`, the init command shall normalize the root `.gitignore` to contain the correct `.steel/*` + `!.steel/constitution.md` block. The normalization rules are:

1. **Legacy patterns**: Any line matching one of these exact patterns (ignoring leading/trailing whitespace) is considered a legacy entry and shall be removed:
   - `.steel/`
   - `.steel`
   - `.steel/**`
   These patterns over-ignore the `.steel/` directory and prevent the constitution from being tracked.

2. **Correct block**: The required two-line block is:
   ```
   .steel/*
   !.steel/constitution.md
   ```
   Both lines must be present. If only `.steel/*` exists without the negation, it is treated as incomplete and replaced.

3. **Insertion behavior**:
   - If legacy entries are found, they are replaced in-place (at the position of the first legacy entry) with the correct block.
   - If no `.steel`-related entries exist at all, the correct block is appended to the end of the file.
   - If the correct block is already present (both lines exist), no changes are made.

4. **Preservation**: All unrelated lines, comments, and blank lines in the `.gitignore` are preserved as-is.

### FR-5: Git index migration during re-init

When `steel init` runs on an existing repository (re-init), in addition to the `.gitignore` normalization (FR-4), it shall:

1. If `.steel/.gitignore` is tracked in the git index, remove it from the index (`git rm --cached .steel/.gitignore`). The working-tree copy may or may not exist.
2. If `.steel/config.json` is tracked in the git index, remove it from the index (`git rm --cached .steel/config.json`).
3. Stage `.steel/constitution.md` for commit (so it becomes tracked if not already).
4. These index operations are performed before the init commit (when `autoCommit` is enabled). If `autoCommit` is disabled, the user is responsible for committing.

### FR-6: Update doctor check for .steel/.gitignore

The doctor currently checks for `.steel/.gitignore` existence (`init-gitignore` diagnostic). This check shall be replaced:

- **Remove**: The check for `.steel/.gitignore` file existence.
- **Add**: A check (keeping the `init-gitignore` diagnostic ID and `warn` severity) that reads the root `.gitignore` and verifies both required lines are present:
  - A line matching `.steel/*` (trimmed)
  - A line matching `!.steel/constitution.md` (trimmed)
- **Pass summary**: `.steel/ gitignore rules are correctly configured`
- **Warn summary**: `.steel/ gitignore rules are missing or incomplete`
- **Remediation**: `Run \`steel init\` to fix .gitignore, or manually add:\n.steel/*\n!.steel/constitution.md`

### FR-7: Update tests

All test files that create `.steel/.gitignore` as part of test fixtures must be updated to remove that setup step. Tests that verify the `init-gitignore` doctor diagnostic must be updated to match the new root-`.gitignore`-based behavior.

## Non-Functional Requirements

- **NFR-1:** The change must not break existing repositories. Contributors with the old `.steel/` pattern can run `steel init` (re-init) to migrate.
- **NFR-2:** After migration, `git ls-files .steel/` shall list only `.steel/constitution.md`. No other `.steel/` files shall appear in `git ls-files`.
- **NFR-3:** After migration, `git status --short .steel/` shall not show `.steel/config.json`, `.steel/state.json`, or `.steel/tasks.json` as untracked or modified (they are gitignored).

## Acceptance Criteria

- **AC-1:** After applying the change, `git ls-files .steel/` outputs exactly `.steel/constitution.md` (one line, no other entries).
- **AC-2:** `git status --short .steel/` does not list `config.json`, `state.json`, or `tasks.json` as untracked (`??`) or modified (`M`).
- **AC-3:** Running `steel init` on a fresh repo creates the correct root `.gitignore` pattern (with `.steel/*` and `!.steel/constitution.md`) and does NOT create `.steel/.gitignore`.
- **AC-4:** Running `steel init` (re-init) on an existing repo with the old `.steel/` pattern: (a) replaces the legacy pattern in root `.gitignore`, (b) removes `.steel/.gitignore` from the git index if tracked, (c) stages `.steel/constitution.md`, and (d) commits these changes when `autoCommit` is enabled.
- **AC-5:** `steel doctor` emits a `pass` for `init-gitignore` when root `.gitignore` contains both `.steel/*` and `!.steel/constitution.md`. It emits a `warn` when either line is missing, with the remediation message defined in FR-6.
- **AC-6:** All existing tests pass after updating fixtures.

## Out of Scope

- Migrating `.steel/config.json` to a committed configuration format (e.g., `steel.config.yaml`). The project already supports `steel.config.yaml` in the project root for shared config — this spec does not change that.
- Adding any new files to the committed set beyond `constitution.md`.
- Changing the constitution content or format.

## Open Questions

None.
