# Specification: Prompt User Before Reusing a Completed Workflow State in /steel-specify

**Spec ID:** 007-specify-prompt-on-completed-state
**Status:** Draft
**Created:** 2026-05-03

## Overview

When a Steel-Kit project has finished a full workflow (all seven stages complete, ending at `retrospect`), the next invocation of `/steel-specify` currently hard-fails because `commands/specify.ts` requires `currentStage == 'specification'` AND `specification.status == 'pending'`. The user has to know to run `/steel-clean` first, which is non-obvious and discards prior artifacts/tags they might want to keep.

This spec adds an interactive precondition step (step **0a**) to `/steel-specify` that detects a previously-completed workflow in `.steel/state.json` and asks the user how to proceed: continue with a fresh state (preserving the prior spec dir and its git tags), invoke `/steel-clean` first (full reset), or cancel. The CLI surface (`steel specify ...`) gets equivalent non-interactive flags so all three provider paths (Codex, Gemini CLI, Claude Code) keep behavioral parity per Constitution principle 3.

This is purely a workflow-entry UX change. It does not alter how Forge-Gauge iterations run, how stages advance, or how artifacts/tags are produced.

## User Stories

- **US-1:** As a developer who just finished one feature workflow, I want `/steel-specify "next feature"` to ask me how to continue rather than failing with a stage-mismatch error, so that I do not have to memorize the recovery procedure.
- **US-2:** As a developer who wants to keep the prior spec's directory and `steel/*/*-complete` tags as audit history, I want a "fresh start, preserve history" option, so that starting feature 008 does not erase feature 007.
- **US-3:** As a developer who wants a true clean slate (no leftover artifacts, no prior tags), I want to invoke `/steel-clean` from inside the prompt without re-running another command, so that the workflow restart is one step.
- **US-4:** As a developer running the CLI in a script (`steel specify ...`), I want non-interactive flags equivalent to the slash-command prompt options, so that automation does not block on stdin.
- **US-5:** As a developer who passed `--id <X>` to resume an already-in-progress spec `<X>`, I want `/steel-specify` to NOT prompt me about a separate completed workflow, so that the resume path is not interrupted by an unrelated dialog.

## Functional Requirements

### FR-1: Detect a "previously-completed workflow"

When `/steel-specify` is invoked and `.steel/state.json` already exists, classify the state as **completed** if **either** of the following is true:

1. **All seven stages have `status == "complete"`** (specification, clarification, planning, task_breakdown, implementation, validation, retrospect), OR
2. **`currentStage == "retrospect"` AND `stages.retrospect.status == "complete"`.**

Both conditions are normally equivalent because stages advance sequentially, but the spec must accept either to be robust against manually-edited state.

The classification is computed from the parsed `WorkflowState` (`src/workflow.ts`). No git or filesystem state is consulted for this decision — only `.steel/state.json`.

### FR-2: Trigger order — step 0a sits between prerequisite check and step 1

The new step `0a` runs:

- **After** the prerequisite gate (`.steel/` exists, constitution is real, `state.json` is loadable).
- **Before** step 1 (read state + config) of the existing `/steel-specify` flow.

If state classification (FR-1) returns **not-completed**, step `0a` is a no-op and the existing flow proceeds unchanged. The check must add zero perceptible latency on the common path.

### FR-3: `--id` resume bypass

If the user invoked `/steel-specify` with `--id <X>` AND a spec directory `specs/<X>-*` (or `specs/<X>/` if the ID is already fully qualified) exists AND its corresponding stage tracked in `state.json` is **in_progress** (not complete), step `0a` MUST be skipped — the user is resuming `<X>`, not starting a new workflow.

In all other cases — `--id` not provided, `--id` points at a new (non-existent) spec, or `--id` points at an already-complete spec — step `0a` proceeds.

> [NEEDS CLARIFICATION] Steel-Kit does not currently have an explicit "resume by --id" code path; `commands/specify.ts:41-46` always treats `--id` as a prefix for a NEW spec ID. If resume-by-id is not implemented today, FR-3 reduces to: "skip `0a` only when `--id` is provided" (a simpler escape hatch). Confirm intended scope.

### FR-4: Interactive prompt content (slash-command path)

When `0a` triggers, the slash command MUST present this exact prompt to the user (verbatim, with `<previous specId>` substituted from `state.specId`):

> A previous workflow (`<previous specId>`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]

The three options have the following labels and meanings, presented in this order:

- **y** — "Continue, preserving prior artifacts and tags" (FR-5).
- **clean** — "Invoke `/steel-clean` first (full reset)" (FR-6).
- **cancel** — "Stop and exit" (FR-7).

The Claude Code path SHOULD use `AskUserQuestion` (or the canonical equivalent) with options ordered y / clean / cancel; free-text `Other` is not a valid response and MUST be rejected with the same prompt.

### FR-5: "y" — preserve-history reset

When the user selects **y**:

1. Mutate `.steel/state.json` in place to a fresh-start shape:
   - `currentStage = "specification"`
   - `iteration = 1`
   - For every stage: `status = "pending"` and clear any `startedAt` / `completedAt` / per-stage `iteration` fields.
   - Clear `specId`, `branch`, `baseBranch`, `description`, and `skillsUsed`.
2. Do **NOT** delete or modify any `specs/<previous specId>/` directory.
3. Do **NOT** remove any git tags (including `steel/<previous specId>/*-complete`).
4. Do **NOT** delete `.steel/tasks.json`.
5. Proceed to step 1 of `/steel-specify` (which will then generate a new spec ID and branch from the user's new description).

The reset must be persisted to disk (via `saveState`) before step 1 reads it.

### FR-6: "clean" — invoke /steel-clean first

When the user selects **clean**:

1. Invoke the existing `/steel-clean` command end-to-end, including its own confirmation prompt (`steel-clean.md` step 4: "This will remove iteration artifacts for spec `<specId>` and reset workflow state. Continue?"). The `/steel-specify` flow MUST NOT bypass that confirmation — the user has already opted into "clean", but the destructive action still requires acknowledgment.
2. If `/steel-clean` runs to completion (state reset to specification:pending, prior artifacts deleted, prior `steel/<specId>/*-complete` tags removed, clean commit landed), proceed to step 1 of `/steel-specify`.
3. If `/steel-clean` fails or its inner confirmation is declined, abort `/steel-specify` with a message: `/steel-clean did not complete — re-run /steel-specify when ready.` Do not silently fall back to "y" or any other option.

### FR-7: "cancel" — stop

When the user selects **cancel**:

1. Make no changes to `.steel/state.json`, no commits, no branch creation.
2. Print: `Cancelled. Run /steel-clean or /steel-specify when ready.`
3. Exit.

### FR-8: CLI parity — non-interactive flags on `steel specify`

The CLI command `steel specify <description> [--id <X>]` (in `commands/specify.ts` / wired via `src/cli.ts`) MUST gain two mutually-exclusive flags so scripts and provider paths without an interactive prompt can express the same three intents:

- `--reset-completed` — equivalent to selecting "y" (FR-5). Performs the preserve-history reset before proceeding.
- `--clean-completed` — equivalent to selecting "clean" (FR-6). Runs `steel clean` (the non-interactive CLI form, which MUST exist or be added in this scope) before proceeding.
- (No flag) — equivalent to "cancel" (FR-7). When state classifies as completed (FR-1) and neither flag is set, the CLI MUST exit non-zero with: `A previous workflow (<previous specId>) is fully complete. Re-run with --reset-completed (preserve history) or --clean-completed (full reset).` The current hard-fail message in `commands/specify.ts:32-34` is replaced by this clearer guidance when the failure cause is a completed workflow specifically.

When `state.json` is in a non-completed but non-pending state (e.g., mid-workflow), the existing hard-fail behavior is unchanged — the new flags only activate the new path under FR-1's classification.

> [NEEDS CLARIFICATION] Does `steel clean` exist as a non-interactive CLI command today, or is `/steel-clean` only a slash command? The `commands/clean.ts` file exists; confirm whether it accepts a `--yes` / `--force` flag (or add one as part of this spec's scope).

### FR-9: Canonical-source update

The change MUST be applied to the canonical command source `resources/commands/steel-specify.md` (not to the per-provider installed copies under `.claude/commands/`, `.agents/skills/`, or `.gemini/`). Installed copies are regenerated by `steel-init` and `command-installer.ts` from the canonical source per Constitution principle 3.

Step `0a` text in the canonical source MUST clearly mark itself as a precondition step that runs after the existing prerequisite block and before step 1.

### FR-10: Audit trail

The new behavior MUST be auditable per Constitution principle 4:

- A "y" reset MUST emit a single git commit (or be made part of the next forge commit's preamble) with message `steel(specify): reset state from completed workflow <previous specId> (preserved artifacts and tags)`. The commit touches only `.steel/state.json`.
- A "clean" path produces commits via `/steel-clean` itself; no additional commit is required from `/steel-specify`.
- A "cancel" path produces no commits and leaves no diff.

## Non-Functional Requirements

- **NFR-1:** Detection (FR-1) MUST be a pure function of `WorkflowState`; no I/O beyond the existing `loadState` call.
- **NFR-2:** The "y" reset (FR-5) MUST be atomic from the user's perspective: either the new state is fully written and committed, or `state.json` is unchanged. Partial writes (e.g., currentStage reset but stages still containing completed timestamps) are not acceptable.
- **NFR-3:** Behavior parity across Codex, Gemini CLI, and Claude Code provider paths is required. The slash-command prompt and CLI flags MUST yield observably identical state.json/disk results given the same user choice.
- **NFR-4:** Supported OSes remain macOS and Linux only; no Windows-specific assumptions in any new prompt or shell-out.
- **NFR-5:** Tests MUST cover: FR-1 classification (truth table), FR-3 `--id` bypass, FR-5 reset shape (snapshot of resulting state.json), FR-6 propagation of `/steel-clean` failure, FR-7 no-op behavior, FR-8 CLI flag parity. Per the constitution, anything that changes Forge/Gauge interaction (entry conditions are part of that interaction) requires tests proving observable behavior.

## Acceptance Criteria

- **AC-1:** With `state.json` showing all seven stages complete, running `/steel-specify "feature X"` displays the prompt from FR-4 verbatim and does NOT proceed until a valid choice is made.
- **AC-2:** With `state.json` showing `currentStage == "retrospect"` and `retrospect.status == "complete"` (other stages also complete), the same prompt appears.
- **AC-3:** With `state.json` showing `currentStage == "implementation"` (mid-workflow), the prompt does NOT appear and the existing precondition error is preserved.
- **AC-4:** Selecting **y** results in `state.json` matching the FR-5 shape; `specs/<previous-specId>/` is intact; `git tag --list 'steel/<previous-specId>/*'` returns the prior tags unchanged; the new branch is created and step 1 proceeds.
- **AC-5:** Selecting **clean** invokes `/steel-clean`, prompts for its inner confirmation, on confirm produces the clean commit, removes prior tags and artifacts, and then proceeds to step 1. Declining the inner confirmation aborts `/steel-specify` per FR-6.
- **AC-6:** Selecting **cancel** leaves `state.json` byte-identical, creates no commits, no branch, no tag operations, and prints the FR-7 message.
- **AC-7:** Running `steel specify "feature X"` (CLI) on a completed-state repo with no flags exits non-zero with the FR-8 error message.
- **AC-8:** Running `steel specify "feature X" --reset-completed` performs FR-5 and proceeds. Running with `--clean-completed` performs FR-6 (non-interactive form) and proceeds.
- **AC-9:** Running `steel specify "feature X" --id PROJ-21` when `specs/PROJ-21-*` is in_progress skips the FR-1 check entirely (FR-3) and resumes that spec.
- **AC-10:** All existing tests in `commands/clean.test.ts`, `src/workflow.test.ts`, `src/git-config.test.ts`, and `src/spec-id.test.ts` continue to pass without modification.
- **AC-11:** The canonical source `resources/commands/steel-specify.md` contains the new step `0a`. Per-provider installed copies (`.claude/commands/steel-specify.md`, `.agents/skills/steel-specify/SKILL.md`) reflect the canonical change after a re-run of `steel-init` (or whatever sync mechanism `command-installer.ts` provides).

## Out of Scope

- Auto-detecting completed workflows from git tags alone (without `state.json`). State recovery from tags is `commands/state.ts`-territory and is unaffected here.
- Adding a "resume by --id" feature where the CLI looks up an in-progress spec dir and re-attaches state. FR-3 only describes the bypass condition; if the resume mechanism does not exist, the open question in FR-3 will reduce the bypass to "any --id present".
- Changing the behavior of `/steel-clean` itself.
- Changing how `steel-init` regenerates per-provider installed copies (the canonical-source update in FR-9 only modifies the source; sync is the existing mechanism's job).
- A "rename and archive" option that moves `specs/<previous>/` to `specs/archive/<previous>/`. If desired, that is a separate spec.
- Migration of pre-existing partially-corrupt state.json files. The change assumes the file is loadable by current `loadState`; corrupt state remains a `/steel-doctor` problem.

## Open Questions

- **OQ-1:** Does Steel-Kit currently support resuming an in-progress spec by `--id`? If not, FR-3's bypass collapses to "skip 0a whenever `--id` is present" (the current `--id` semantics is "construct a new spec ID with this prefix"). [marked NEEDS CLARIFICATION inside FR-3].
- **OQ-2:** Does `commands/clean.ts` have (or need) a `--yes`/`--force` non-interactive flag for FR-6's CLI parity? [marked NEEDS CLARIFICATION inside FR-8].
- **OQ-3:** Should step `0a` also fire when `state.json` is **missing** entirely (e.g., user ran `/steel-clean` and re-invoked `/steel-specify` in the same session)? Current proposal says no — `0a` requires `state.json` to exist AND classify as completed. If `state.json` is absent, the existing init flow re-creates it as fresh-pending and proceeds normally.
- **OQ-4:** When the user selects "y", should the audit-trail commit (FR-10) include the prior `specId` in `state.json` as a `previousSpecId` field for cross-reference, or is the git history sufficient? Constitution principle 4 favors readable artifacts; a `previousSpecId` field would be cheap and useful.
- **OQ-5:** What is the exact rendering of the prompt under each provider — `AskUserQuestion` (Claude), Gemini's interactive prompt, Codex `exec`? Codex `exec` is non-interactive by design; FR-8's CLI flags cover that, but it is worth confirming Codex callers always go through the CLI path and never hit the slash-command prompt.
