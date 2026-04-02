# Steel-Kit Roadmap Issue Drafts

## Issue 1: Add `steel doctor` for environment, workflow, and install health checks

**Title**

`feat: add steel doctor command for workflow, agent-surface, and environment diagnostics`

**Problem**

Steel-Kit now has multiple layers that can drift independently:

- canonical sources in `resources/commands/`, `prompts/`, and `templates/`
- generated agent surfaces in `.claude/commands/`, `.gemini/commands/`, `.agents/skills/`
- workflow state in `.steel/state.json`
- constitution/spec artifacts
- provider CLIs and auth

Today there is no single command that tells the user what is broken or stale.

**Proposal**

Add `steel doctor` to run a read-only health check and print actionable fixes.

**Checks**

- project initialized or not
- constitution ready or still placeholder
- state/spec/branch alignment
- generated Claude/Gemini/Codex surfaces present
- generated surfaces stale vs canonical source hashes
- required prompt/template files exist
- Forge/Gauge provider CLIs available
- optional auth sanity checks if detectable
- active spec files present for current stage

**Output**

- pass/warn/fail per check
- exact remediation command for each failure
- optional `--json` for automation

**Acceptance Criteria**

- `steel doctor` exits non-zero on fail
- `steel doctor --json` returns structured diagnostics
- detects stale generated agent files after canonical source change
- detects missing/placeholder constitution
- works in initialized and uninitialized repos

## Issue 2: Add provenance metadata to workflow artifacts and gate later stages on it

**Title**

`feat: add provenance metadata to generated artifacts and enforce stage gating`

**Problem**

Later stages currently rely mostly on file presence and stage state. That is weak:

- a file may exist but be manually edited into an invalid state
- files may belong to a different spec branch
- state may drift from committed artifacts

**Proposal**

Add machine-readable provenance blocks to generated artifacts:

- `spec.md`
- `clarifications.md`
- `plan.md`
- `tasks.md`
- `validation.md`
- `retrospect.md`

Then gate downstream stages on provenance validation, not only existence.

**Suggested Metadata**

- `specId`
- `stage`
- `iteration`
- `generatedBy: steel-kit`
- `steelVersion`
- `branch`
- `timestamp`
- optional source artifact references

**Validation Rules**

- current file matches current `specId`
- predecessor stage artifact exists and is valid
- branch and state do not conflict
- user edits are allowed, but provenance must remain intact

**Acceptance Criteria**

- downstream commands fail with clear errors when provenance is missing/invalid
- recovery logic uses provenance before falling back to heuristics
- manual edits to content are allowed without breaking the workflow
- provenance format is documented

## Issue 3: Clarify and separate `upgrade` vs `refresh` semantics

**Title**

`feat: separate Steel-Kit CLI upgrade from project surface refresh`

**Problem**

Users need two distinct operations:

- upgrade the globally installed Steel-Kit CLI
- regenerate project-local agent surfaces from canonical sources

That separation exists partially now, but the UX and naming are still muddy.

**Proposal**

Clarify command model:

- `steel upgrade`: update installed package version
- `steel update` or `steel refresh`: regenerate `.claude/commands`, `.gemini/commands`, `.agents/skills`
- document exactly what each command touches

Consider renaming `update` to `refresh`, or adding `refresh` as the preferred alias.

**Acceptance Criteria**

- help text clearly distinguishes package upgrade vs project regeneration
- docs use the same terminology consistently
- `steel doctor` points users to the correct command
- no generated files are modified by `steel upgrade`

## Issue 4: Add pre-implementation cross-artifact analysis stage

**Title**

`feat: add analyze stage before implementation for cross-artifact consistency`

**Problem**

Steel-Kit has strong Forge/Gauge loops per stage, but it lacks a dedicated cross-artifact consistency pass before coding starts.

Common failure modes:

- plan misses spec requirements
- tasks miss plan components
- acceptance criteria are not testable
- constitution conflicts with implementation strategy

**Proposal**

Add a new stage between `tasks` and `implement`:

- `steel analyze`
- checks constitution/spec/clarifications/plan/tasks for alignment
- emits an analysis report with blocking/warning findings
- may require approval before entering implementation

**Checks**

- requirement coverage
- task coverage
- contradictions
- missing test strategy
- constitution violations
- over-engineering or unjustified architecture

**Acceptance Criteria**

- analysis report is saved as a committed artifact
- implementation cannot start if blocking findings remain
- `next` and `run-all` include the analyze stage
- Gauge prompt for analyze is distinct from plan/task review

## Issue 5: Introduce presets and extensions for customization

**Title**

`feat: add preset and extension system for customizable workflows`

**Problem**

Teams will want to customize Steel-Kit without forking core files:

- terminology changes
- domain-specific prompts/templates
- extra workflow stages
- organization-specific standards

Right now customization is ad hoc.

**Proposal**

Introduce two customization layers:

- `presets`: override existing prompts/templates/command text
- `extensions`: add new commands, stages, prompts, and templates

**Possible Layout**

- `.steel/presets/<id>/...`
- `.steel/extensions/<id>/...`
- package-provided presets/extensions in `resources/`

**Precedence**

1. project overrides
2. presets
3. extensions
4. core defaults

**Acceptance Criteria**

- presets can override Forge/Gauge prompts and output templates
- extensions can add at least one new workflow command
- precedence rules are documented and test-covered
- installed agent surfaces can be regenerated with preset/extension content applied

## Issue 6: Improve branch-aware state recovery and drift detection

**Title**

`feat: make workflow state recovery branch-aware and detect branch/state drift`

**Problem**

Steel-Kit tracks state in `.steel/state.json`, but git branch, spec directory, and committed artifacts can diverge.

**Proposal**

Strengthen recovery and runtime validation:

- infer active spec from `spec/<specId>` branch naming
- warn when branch and `state.specId` disagree
- prefer committed artifacts plus provenance over raw state
- make `status` show drift explicitly

**Acceptance Criteria**

- `steel status` warns on branch/state/spec mismatch
- `steel doctor` reports drift clearly
- recovery prefers provenance-backed artifacts
- switching branches does not silently operate on the wrong spec

## Issue 7: Add template/install drift inspection tooling

**Title**

`feat: add drift inspection for canonical sources, installed agent surfaces, and local overrides`

**Problem**

Once users customize prompts/templates or canonical sources evolve, it becomes hard to know:

- whether installed agent surfaces are stale
- whether local overrides still match the current core structure
- what changed between project files and core defaults

**Proposal**

Add a command such as:

- `steel diff-templates`
- or `steel refresh --check`

It should compare:

- `resources/commands` vs installed `.claude/commands`, `.gemini/commands`, `.agents/skills`
- core `prompts/` and `templates/` vs `.steel/...` overrides

**Acceptance Criteria**

- reports stale generated agent surfaces
- reports overridden prompt/template files
- optional unified diff output
- non-zero exit for `--check` when drift exists

## Issue 8: Formalize project-local override layers

**Title**

`feat: formalize project-local override layers for prompts, templates, and commands`

**Problem**

Steel-Kit already has some override capability for prompts/templates, but it is implicit and incomplete. Commands/skills need the same model.

**Proposal**

Define a supported override system for:

- Forge prompts
- Gauge prompts
- output templates
- canonical command definitions

**Suggested Paths**

- `.steel/prompts/forge/`
- `.steel/prompts/gauge/`
- `.steel/templates/`
- `.steel/commands/`

**Acceptance Criteria**

- overrides apply deterministically
- docs define precedence and intended use
- `steel doctor` and drift tooling can detect overrides
- `steel refresh` regenerates installed agent surfaces from overridden command sources when present

## Sources

- `spec-kit` repo: <https://github.com/github/spec-kit>
- installation guide: <https://github.github.com/spec-kit/installation.html>
- upgrade guide: <https://github.github.com/spec-kit/upgrade.html>
- quickstart: <https://github.github.com/spec-kit/quickstart.html>
- provenance and drift discussion: <https://github.com/github/spec-kit/issues/682>
