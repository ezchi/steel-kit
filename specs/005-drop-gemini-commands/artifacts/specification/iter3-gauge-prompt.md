# Gauge Review: Specification for 005-drop-gemini-commands (Iteration 3)

You are the **Gauge**, a strict reviewer. Evaluate the revised specification for quality, completeness, and alignment with the project constitution.

## Context

This is iteration 3. Previous issues and how they were addressed:

### Iteration 1 issues (all addressed in iteration 2):
1. [BLOCKING] Shared surface format not specified → FR-2 added
2. [WARNING] Missing integration points → FR-7 added
3. [WARNING] Test coverage too narrow → FR-6 expanded
4. [WARNING] AC-3 not verifiable → Split into verifiable ACs

### Iteration 2 issues (addressed in this iteration):
1. [BLOCKING] Cross-reference `/steel-` → `$steel-` misalignment → FR-2 now requires removing the `/steel-` → `$steel-` rewrite entirely, keeping `/steel-` as the canonical prefix in `.agents/skills/`. Codex CLI maps prefixes at its own layer.
2. [BLOCKING] AC-7 scope included spec itself → AC-8 now scopes grep to `src/`, `commands/`, `resources/commands/`, `docs/`, `README.md` only.
3. [WARNING] Init doesn't clean up stale files → FR-3 now includes cleanup on init, AC-3 added.

## Project Constitution

Read `.steel/constitution.md`. Key principles:
1. Every feature must strengthen planning, implementation review, validation, or recovery.
2. Forge and Gauge are first-class peers.
3. All workflow surfaces must stay behaviorally aligned across Codex, Gemini CLI, and Claude Code.
4. The workflow must remain auditable end to end.
5. Automation is subordinate to user control.

## Specification to Review

Read the specification at `specs/005-drop-gemini-commands/spec.md`.

## Review Criteria

1. **Completeness**: Are all affected files and integration points covered?
2. **Clarity**: Are requirements unambiguous?
3. **Testability**: Are acceptance criteria concrete and verifiable?
4. **Consistency**: Alignment with constitution and internal consistency.
5. **Feasibility**: Technical risks addressed?
6. **Previous issues resolved**: Were iteration 2 issues adequately addressed?

## Review Format

### [SEVERITY] Issue Title
- **Location**: Which requirement/section
- **Issue**: What's wrong
- **Suggestion**: How to fix it

Severities: BLOCKING / WARNING / NOTE

## Final Verdict

End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`
