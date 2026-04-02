# Specification: steel doctor command for workflow, agent-surface, and environment diagnostics

## Overview

Add a new read-only CLI command, `steel doctor`, that audits Steel-Kit installation health, workflow health, generated agent-surface drift, and provider availability for the current repository. The command must help users quickly diagnose why Steel-Kit is blocked or stale and provide exact remediation commands.

This specification is scoped only to Issue 1 from [docs/roadmap-issues.md](/Users/ezchi/Projects/steel-kit/docs/roadmap-issues.md). It does not include provenance metadata, new workflow stages, upgrade/refresh renaming, presets/extensions, or broader recovery redesign.

The command must align with the project constitution:
- Linux and macOS are the only supported platforms.
- Codex, Gemini CLI, and Claude Code must all be supported.
- The workflow must remain auditable and easy for users to inspect.
- Automation must prefer explicit, readable diagnostics over opaque behavior.

## User Stories

- As a Steel-Kit user, I want one command that tells me whether my project is initialized and workflow-ready so that I can fix setup problems quickly.
- As a user working inside an active spec branch, I want `steel doctor` to detect workflow drift between state, branch, spec files, and generated artifacts so that I do not continue from a broken state.
- As a user switching between Codex, Gemini CLI, and Claude Code, I want the doctor output to confirm whether required generated agent surfaces exist and are current so that all supported surfaces remain aligned.
- As a maintainer, I want the command to detect missing canonical workflow resources so that broken installations are obvious before later stages fail.
- As a user automating health checks, I want `steel doctor --json` to return structured diagnostics and a failing exit code when blocking issues exist so that CI or scripts can act on the result.

## Functional Requirements

### Command surface

- FR-1: The CLI shall add a new `steel doctor` command.
- FR-2: The command shall support a human-readable default output mode and a machine-readable `--json` output mode.
- FR-3: The command shall be read-only and shall not modify project files, generated surfaces, workflow state, or git history.

### Project and workflow checks

- FR-4: The command shall detect whether the current repository is initialized for Steel-Kit by checking for required `.steel/` project structure and configuration files.
- FR-5: The command shall report whether `.steel/constitution.md` is missing, placeholder-only, or ready for workflow use.
- FR-6: The command shall inspect `.steel/state.json`, current git branch, and active spec directory and report drift or inconsistency between them.
- FR-7: If the current workflow stage implies an active spec, the command shall verify that required stage files for that spec are present and report which files are missing.
- FR-8: The command shall report when workflow state files are absent but committed artifacts or branch context suggest recoverable state, and it shall provide a remediation command or guidance.

### Canonical source and generated surface checks

- FR-9: The command shall verify that canonical workflow sources required for installed agent surfaces exist, including `resources/commands/`, `prompts/`, and `templates/`.
- FR-10: The command shall verify the presence of generated agent surfaces for Claude Code, Gemini CLI, and Codex when the project is initialized.
- FR-11: The command shall detect whether generated agent-surface files are stale relative to canonical sources.
- FR-12: Staleness detection shall identify which generated files are outdated or missing and shall recommend the exact regeneration command.

### Provider checks

- FR-13: The command shall inspect configured Forge and Gauge providers from Steel-Kit configuration and verify whether the corresponding provider CLIs are available on `PATH`.
- FR-14: The command shall be able to report availability status for Codex, Gemini CLI, and Claude Code without assuming only the currently selected provider pair matters.
- FR-15: If lightweight authentication checks are detectable without side effects, the command shall report them as advisory diagnostics rather than mutating state. [NEEDS CLARIFICATION]

### Diagnostic model

- FR-16: Each check shall produce a status of `pass`, `warn`, or `fail`.
- FR-17: Each non-pass diagnostic shall include a concise explanation of the problem.
- FR-18: Each `warn` or `fail` diagnostic shall include an exact remediation command or explicit next step when one exists.
- FR-19: The command shall exit with code `0` when no `fail` diagnostics exist.
- FR-20: The command shall exit with a non-zero code when one or more `fail` diagnostics exist.
- FR-21: The `--json` mode shall return structured diagnostics that preserve, at minimum, check identifier, status, summary, details, and remediation fields.

### Auditability and parity

- FR-22: Diagnostic logic shall be implemented in shared runtime code, not separately per provider surface, so results are consistent across Codex, Gemini CLI, and Claude Code integrations.
- FR-23: Human-readable output shall make it obvious which checks were run, what failed, and how the user can fix the issue.
- FR-24: The command help text and any related docs updates shall clearly describe that `steel doctor` is diagnostic and read-only.

## Non-Functional Requirements

- NFR-1: The command must run on Linux and macOS.
- NFR-2: The command must avoid network-required checks by default; diagnostics should rely on local filesystem, git, process, and environment inspection wherever possible.
- NFR-3: The command output must be understandable without reading source code; each failure should be immediately actionable.
- NFR-4: The implementation must preserve provider parity across Codex, Gemini CLI, and Claude Code.
- NFR-5: The implementation must be testable through unit tests for detection logic and output shaping.
- NFR-6: The command should complete quickly enough for interactive use in a typical local repository.

## Acceptance Criteria

- AC-1: Running `steel doctor` in an uninitialized repository reports initialization failure with a remediation command and exits non-zero.
- AC-2: Running `steel doctor` in an initialized repository with a placeholder constitution reports that the constitution is not ready and suggests `steel constitution` or manual editing.
- AC-3: Running `steel doctor` in an active workflow branch with mismatched `.steel/state.json`, branch name, or spec directory reports drift with enough detail for the user to correct it.
- AC-4: Running `steel doctor` after deleting one generated provider surface reports the specific missing surface and suggests the correct refresh command.
- AC-5: Running `steel doctor` after changing canonical command/prompt/template content without regenerating provider surfaces reports stale generated files.
- AC-6: Running `steel doctor --json` returns structured diagnostics and a non-zero exit code when any `fail` status is present.
- AC-7: Running `steel doctor` does not modify any project file or create commits/tags.
- AC-8: The command behaves consistently regardless of whether the configured providers are Codex, Gemini CLI, or Claude Code.

## Out Of Scope

- Issue 2 provenance metadata and downstream provenance enforcement.
- Issue 3 rename or semantic redesign of `steel update` vs `steel upgrade`.
- Issue 4 introduction of a new `analyze` workflow stage.
- Issue 5 preset or extension systems.
- Issue 6 full branch-aware recovery redesign beyond reporting detectable drift.
- Automatic repair mode such as `steel doctor --fix`.
- Remote API validation or deep online authentication checks.

## Open Questions

- [NEEDS CLARIFICATION] What level of authentication validation is acceptable for provider CLIs without triggering network calls or side effects?
- [NEEDS CLARIFICATION] Should `steel doctor` validate all three provider CLIs on every run, or distinguish between configured providers and optional provider surfaces while still reporting full-surface drift?
- [NEEDS CLARIFICATION] What exact mechanism should be used to determine that a generated agent-surface file is stale versus canonical content: content hashing, embedded metadata, or deterministic regeneration comparison?
