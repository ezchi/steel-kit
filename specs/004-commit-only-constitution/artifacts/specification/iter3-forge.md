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

3. **Conflicting-rule removal**: Normalization shall always remove all legacy patterns (from rule 1) from the entire file, even if the correct block is already present. This prevents order-sensitive `.gitignore` conflicts where a later legacy rule could re-ignore `constitution.md`. The correct block is the only permitted `.steel`-related set of lines in the file after normalization.

4. **Insertion behavior**:
   - If legacy entries are found and the correct block is not yet present, the correct block is inserted at the position of the first removed legacy entry.
   - If no `.steel`-related entries exist at all, the correct block is appended to the end of the file.
   - If the correct block is already present and no conflicting legacy rules exist, no changes are made.

5. **Preservation**: All unrelated lines (those not matching legacy patterns or the correct block lines), comments, and blank lines in the `.gitignore` are preserved as-is.

### FR-5: Git index migration during re-init

When `steel init` runs on an existing repository (re-init), in addition to the `.gitignore` normalization (FR-4), it shall:

1. If `.steel/.gitignore` is tracked in the git index, remove it from the index (`git rm --cached .steel/.gitignore`). The working-tree copy may or may not exist.
2. If `.steel/config.json` is tracked in the git index, remove it from the index (`git rm --cached .steel/config.json`).
3. Ensure `.steel/constitution.md` is tracked in the git index. If the file is already tracked with no content changes, this is a no-op (no staged diff is expected). If the file is new or modified, it is staged.
4. These index operations are performed before the init commit (when `autoCommit` is enabled). If `autoCommit` is disabled, the user is responsible for committing.

### FR-6: Update doctor check for .steel/.gitignore

The doctor currently checks for `.steel/.gitignore` existence (`init-gitignore` diagnostic). This check shall be replaced:

- **Remove**: The check for `.steel/.gitignore` file existence.
- **Add**: A check (keeping the `init-gitignore` diagnostic ID and `warn` severity) that reads the root `.gitignore` and verifies:
  1. Both required lines are present (trimmed): `.steel/*` and `!.steel/constitution.md`
  2. No conflicting legacy rules exist (`.steel/`, `.steel`, `.steel/**`)
- **Pass summary**: `.steel/ gitignore rules are correctly configured`
- **Warn summary (missing)**: `.steel/ gitignore rules are missing or incomplete`
- **Warn summary (conflict)**: `.steel/ gitignore contains conflicting rules that may re-ignore constitution.md`
- **Remediation**: `Run \`steel init\` to fix .gitignore, or manually ensure only these .steel rules exist:\n.steel/*\n!.steel/constitution.md`

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
- **AC-4:** Running `steel init` (re-init) on an existing repo with the old `.steel/` pattern: (a) replaces the legacy pattern in root `.gitignore` and removes any conflicting rules, (b) removes `.steel/.gitignore` from the git index if tracked, (c) ensures `.steel/constitution.md` is tracked in the index (no-op if already tracked and unchanged), and (d) commits these changes when `autoCommit` is enabled.
- **AC-5:** `steel doctor` emits a `pass` for `init-gitignore` when root `.gitignore` contains both `.steel/*` and `!.steel/constitution.md` with no conflicting legacy rules. It emits a `warn` when either required line is missing or when conflicting legacy rules are present, with the remediation message defined in FR-6.
- **AC-6:** All existing tests pass after updating fixtures.

## Out of Scope

- Migrating `.steel/config.json` to a committed configuration format (e.g., `steel.config.yaml`). The project already supports `steel.config.yaml` in the project root for shared config — this spec does not change that.
- Adding any new files to the committed set beyond `constitution.md`.
- Changing the constitution content or format.

## Open Questions

None.
