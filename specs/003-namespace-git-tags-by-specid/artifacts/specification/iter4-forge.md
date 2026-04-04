# Specification: Namespace Git Tags by specId

## Overview

Git tags currently use the format `steel/<stage>-complete` (e.g., `steel/specification-complete`). This is a global namespace — when a second spec is run, `git tag -f` silently overwrites the first spec's tags, making tag-based state recovery unreliable for any repo with more than one spec. The `clean` command also deletes ALL `steel/*-complete` tags regardless of which spec is active.

This feature changes the tag format to `steel/<specId>/<stage>-complete` so each spec's tags are isolated, enabling reliable multi-spec state recovery and scoped cleanup.

## User Stories

- **US-1**: As a developer running multiple specs, I want each spec's stage-completion tags to be namespaced by specId, so that completing a second spec does not destroy evidence of the first spec's progress.
- **US-2**: As a developer running `steel-clean`, I want only the active spec's tags deleted, so that previous specs' audit trails remain intact.
- **US-3**: As a developer recovering state from a fresh checkout, I want `recoverState()` to find the correct namespaced tags for the active spec, so that stage completion is accurately reconstructed.
- **US-4**: As a developer running `steel-doctor`, I want the health-check to detect namespaced tags and correctly report whether state is recoverable.

## Functional Requirements

### FR-1: Namespaced tag format
`tagStage()` in `src/git-ops.ts` MUST create tags in the format `steel/<specId>/<stage>-complete` instead of `steel/<stage>-complete`. The function signature must accept a `specId: string` parameter.

### FR-2: Pass specId at call site
`advanceStage()` in `src/workflow.ts` (line 290) MUST pass `state.specId` to `tagStage()`.

### FR-3: Scoped tag reading in recovery
`getCompletedStagesFromTags()` in `src/workflow.ts` MUST accept a `specId: string` parameter and list only tags matching `steel/<specId>/*-complete`. The regex must be updated to extract the stage name from the new format `/^steel\/[^/]+\/(.+)-complete$/`.

### FR-4: Recovery uses specId for tag lookup
`recoverState()` in `src/workflow.ts` MUST pass the recovered `specId` to `getCompletedStagesFromTags()`. If `specId` is unknown (null), tag-based recovery MUST be skipped — the function should return an empty set of completed stages from tags, falling back to file-based recovery only.

### FR-5: Scoped tag cleanup
`commands/clean.ts` MUST scope tag deletion to the active spec. The specId resolution MUST follow this deterministic order:
1. Load state via `loadState()` (which calls `recoverState()` when `state.json` is missing).
2. If `state.specId` is non-null, use it.
3. If `state.specId` is null (including the case where `state.json` exists but contains a null/empty specId), perform the same branch-detection and specs-directory fallback that `recoverState()` uses:
   a. Detect specId from the current branch using the configured branch prefix (or legacy `spec/` fallback).
   b. If branch detection fails, inspect `specs/` directory entries and use the last (highest-numbered) entry.
4. If specId is resolved by any of steps 2–3, delete only `steel/<specId>/*-complete` tags.
5. Only if specId remains null after all resolution attempts should the command fall back to deleting all `steel/*/*-complete` tags and warn the user that it cannot determine the active spec.
- Update the user-facing log message to include the specId when available.

### FR-6: Doctor tag detection update
`checkStateRecovery()` in `src/doctor.ts` MUST update the tag listing pattern to detect namespaced tags. The deterministic rule for specId resolution mirrors `recoverState()`:
1. Detect specId from the current branch name using the configured branch prefix (or legacy `spec/` fallback).
2. If branch detection fails, inspect `specs/` directory entries and use the last (highest-numbered) entry.
3. If specId is resolved, check for `steel/<specId>/*-complete` tags.
4. If specId cannot be resolved, check for `steel/*/*-complete` tags (any namespaced tags from any spec).
5. The function MUST NOT attempt to disambiguate between multiple specs — it only needs to determine whether *some* recoverable tag evidence exists and report accordingly.

### FR-7: No migration of legacy tags
Existing `steel/<stage>-complete` tags (old format) are NOT automatically migrated. Recovery code and doctor MUST NOT fail when legacy flat tags are present alongside new namespaced tags. Legacy tags are simply ignored by the new glob patterns (`steel/<specId>/*-complete` does not match `steel/<stage>-complete` because the old format has no second `/` separator).

### FR-8: Update canonical workflow-command files
The following files in `resources/commands/` reference the old flat tag format and MUST be updated to reflect the new `steel/<specId>/<stage>-complete` format:
- `resources/commands/steel-specify.md` — tag reference in step 7 (approval gate)
- `resources/commands/steel-clean.md` — tag cleanup instructions
- Any other `resources/commands/steel-*.md` files that reference `steel/<stage>-complete` tags

After updating canonical sources, regenerate or synchronize downstream provider artifacts (`.claude/commands/`, `.gemini/commands/`, `.agents/skills/`) to maintain provider parity per constitution principle 3.

### FR-9: Update README.md
`README.md` documents the tag format. Update all references from `steel/<stage>-complete` to `steel/<specId>/<stage>-complete`.

## Non-Functional Requirements

### NFR-1: Provider parity
The tag format change spans shared TypeScript runtime code AND canonical workflow-command files. Both must be updated in the same change to maintain behavioral alignment across Codex, Gemini CLI, and Claude Code per constitution principle 3.

### NFR-2: Auditability
The namespaced tag format improves auditability — `git tag -l "steel/*"` shows per-spec completion evidence that persists across specs.

### NFR-3: Backward compatibility
Legacy tags from previous specs remain untouched. The system does not break on repos containing old-format tags. New glob patterns naturally exclude old-format tags (no second `/` separator).

## Acceptance Criteria

- **AC-1**: After advancing a stage, `git tag -l "steel/*"` shows `steel/<specId>/<stage>-complete` (not the old flat format).
- **AC-2**: Running a second spec does not overwrite the first spec's tags.
- **AC-3**: `steel-clean` only removes tags for the active specId.
- **AC-4**: Deleting `state.json` and running recovery correctly reconstructs completed stages from namespaced tags when specId is known.
- **AC-5**: Recovery with an unknown specId does not crash — it skips tag-based recovery gracefully.
- **AC-6**: `steel-doctor` detects namespaced tags and reports state as recoverable.
- **AC-7**: `npm test` passes.
- **AC-8**: `npm run lint` passes.
- **AC-9**: In a repo with both legacy flat tags (`steel/specification-complete`) and new namespaced tags (`steel/003-foo/specification-complete`), recovery, doctor, and clean all behave correctly — legacy tags are ignored, namespaced tags are processed, and no errors occur.
- **AC-10**: Canonical workflow-command files in `resources/commands/` reference the new tag format, and downstream provider command files are synchronized.
- **AC-11**: `steel-doctor` with a branch-derived specId checks `steel/<specId>/*-complete` tags (branch takes precedence over directory inspection).
- **AC-12**: `steel-doctor` with no resolvable specId (no branch match, no specs directory) falls back to `steel/*/*-complete` and still reports state as recoverable if any namespaced tags exist.
- **AC-13**: `steel-clean` with an existing `state.json` that has a null specId still resolves specId from branch or specs-directory fallback before falling through to global tag deletion.

## Out of Scope

- **Migration tooling** for converting legacy `steel/<stage>-complete` tags to the new format. Users can delete old tags manually if desired.
- **Remote tag management** (push/pull of tags). Tags remain local-only as they are today.
- **Tag signing or annotation**. Tags remain lightweight.

## Open Questions

None. The feature is well-scoped and all affected code paths are identified.
