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
`getCompletedStagesFromTags()` in `src/workflow.ts` MUST accept a `specId: string` parameter and list only tags matching `steel/<specId>/*-complete`. The regex must be updated from `/^steel\/(.+)-complete$/` to extract the stage name from the new format `/^steel\/[^/]+\/(.+)-complete$/`.

### FR-4: Recovery uses specId for tag lookup
`recoverState()` in `src/workflow.ts` MUST pass the recovered `specId` to `getCompletedStagesFromTags()`. If `specId` is unknown (null), tag-based recovery MUST be skipped — the function should return an empty set of completed stages from tags, falling back to file-based recovery only.

### FR-5: Scoped tag cleanup
`commands/clean.ts` MUST scope tag deletion to the active spec:
- If `specId` is known (from `state.json` or branch detection), delete only `steel/<specId>/*-complete` tags.
- If `specId` is unknown, fall back to deleting all `steel/*/*-complete` tags (two-level glob) and warn the user.
- Update the user-facing log message to include the specId when available.

### FR-6: Doctor tag detection update
`checkStateRecovery()` in `src/doctor.ts` MUST update the tag listing pattern to detect namespaced tags. Use `steel/*/*-complete` glob to find any spec's tags. If `specId` is available from branch or spec directory detection, narrow the check to `steel/<specId>/*-complete`.

### FR-7: No migration of legacy tags
Existing `steel/<stage>-complete` tags (old format) are NOT automatically migrated. This is intentional — old tags represent completed past workflows and their presence does no harm. Recovery code MAY optionally detect legacy tags and emit a diagnostic NOTE but MUST NOT fail.

## Non-Functional Requirements

### NFR-1: Provider parity
The tag format change is in shared TypeScript code (`src/git-ops.ts`, `src/workflow.ts`, `commands/clean.ts`, `src/doctor.ts`). All provider surfaces (Codex, Gemini CLI, Claude Code) use the same runtime, so parity is maintained by definition.

### NFR-2: Auditability
The namespaced tag format improves auditability — `git tag -l "steel/*"` shows per-spec completion evidence that persists across specs.

### NFR-3: Backward compatibility
Legacy tags from previous specs remain untouched. The system does not break on repos containing old-format tags.

## Acceptance Criteria

- **AC-1**: After advancing a stage, `git tag -l "steel/*"` shows `steel/<specId>/<stage>-complete` (not the old flat format).
- **AC-2**: Running a second spec does not overwrite the first spec's tags.
- **AC-3**: `steel-clean` only removes tags for the active specId.
- **AC-4**: Deleting `state.json` and running recovery correctly reconstructs completed stages from namespaced tags when specId is known.
- **AC-5**: Recovery with an unknown specId does not crash — it skips tag-based recovery gracefully.
- **AC-6**: `steel-doctor` detects namespaced tags and reports state as recoverable.
- **AC-7**: `npm test` passes.
- **AC-8**: `npm run lint` passes.

## Out of Scope

- **Migration tooling** for converting legacy `steel/<stage>-complete` tags to the new format. Users can delete old tags manually if desired.
- **Remote tag management** (push/pull of tags). Tags remain local-only as they are today.
- **Tag signing or annotation**. Tags remain lightweight.

## Open Questions

None. The feature is well-scoped and all affected code paths are identified.
