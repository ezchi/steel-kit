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

Replace the current root `.gitignore` entry `.steel/` with a negation pattern that allows only `constitution.md`:

```gitignore
# Steel-Kit — only constitution is shared; configs are per-contributor
.steel/*
!.steel/constitution.md
```

The `/*` glob (instead of `/`) is required so that negation patterns for files inside `.steel/` can take effect.

### FR-2: Remove .steel/.gitignore

The inner `.steel/.gitignore` file becomes unnecessary once the root `.gitignore` handles exclusion via `/*` + negation. Remove it to avoid confusion and redundant rules.

### FR-3: Update steel-init to stop creating .steel/.gitignore

In `commands/init.ts`, remove the code block (approximately lines 51–62) that creates `.steel/.gitignore`. The root `.gitignore` pattern now handles all exclusion logic.

### FR-4: Update steel-init to ensure root .gitignore has correct .steel pattern

During `steel init`, if the root `.gitignore` contains the old `.steel/` entry, replace it with the new `/*` + negation pattern. If it already has the correct pattern, leave it alone.

### FR-5: Update doctor check for .steel/.gitignore

The doctor currently checks for `.steel/.gitignore` existence (`init-gitignore` diagnostic). This check should be updated:
- Remove the check for `.steel/.gitignore` existence.
- Add a check that the root `.gitignore` contains the correct `.steel/*` + `!.steel/constitution.md` pattern, so that the constitution is tracked.

### FR-6: Update tests

All test files that create `.steel/.gitignore` as part of test fixtures must be updated to remove that setup step. Tests that verify the `init-gitignore` doctor diagnostic must be updated to match the new behavior.

## Non-Functional Requirements

- **NFR-1:** The change must not break existing repositories. Contributors with the old `.steel/` pattern can run `steel init` (re-init) to migrate.
- **NFR-2:** The `constitution.md` file must appear as tracked in `git status` after the change.
- **NFR-3:** No contributor-specific files (`config.json`, `state.json`, `tasks.json`) should appear in `git status` after the change.

## Acceptance Criteria

- **AC-1:** After applying the change, `git ls-files .steel/` shows only `constitution.md`.
- **AC-2:** `git status` does not show `config.json`, `state.json`, or `tasks.json` as untracked or modified.
- **AC-3:** Running `steel init` on a fresh repo creates the correct root `.gitignore` pattern and does NOT create `.steel/.gitignore`.
- **AC-4:** Running `steel init` (re-init) on an existing repo with the old `.steel/` pattern migrates to the new pattern.
- **AC-5:** `steel doctor` no longer checks for `.steel/.gitignore`; instead it verifies the root `.gitignore` has the correct pattern.
- **AC-6:** All existing tests pass after updating fixtures.

## Out of Scope

- Migrating `.steel/config.json` to a committed configuration format (e.g., `steel.config.yaml`). The project already supports `steel.config.yaml` in the project root for shared config — this spec does not change that.
- Adding any new files to the committed set beyond `constitution.md`.
- Changing the constitution content or format.

## Open Questions

None — the requirement is straightforward and the implementation path is clear.
