# Implementation Plan: 007-specify-prompt-on-completed-state

## Approach

The change has three surfaces:

1. **TypeScript helper + new state-reset primitive** in `src/workflow.ts` and `commands/state.ts` / `src/cli.ts` — small, self-contained, fully unit-testable.
2. **Canonical slash-command edits** in `resources/commands/steel-specify.md` — adds step `0a` and the FR-5 step 2.5 state-diff detection.
3. **Tests** for the TS helper, the new CLI primitive, and the slash-command behavior contract.

Implementation order: TS-first (helper + CLI primitive + tests), then slash-command edits, then end-to-end behavior tests. This order keeps each commit small, type-checked, and individually testable. No phase touches `commands/clean.ts` (constitution principle: respect FR-5's stated boundary; clean's behavior is unchanged).

The plan respects all clarifications:
- No `steel state classify` subcommand (C-1).
- `Previous Spec ID` only in `spec.md` of the new spec (C-2).
- Existing slug-collision throw is preserved (C-3).
- `autoCommit === false` → field written but no auto-commit (C-4).
- C-7's state-diff is implemented by the slash command using existing `steel state get --field` plus the new `steel state reset --preserve-history` primitive.

## Phase 1: TypeScript helper (`src/workflow.ts`)

**Goal:** Add the FR-1/FR-10 classification rule as a pure helper.

1. In `src/workflow.ts`, after the `WorkflowState` type definition (around line 51), export:
   ```ts
   export function isCompletedWorkflow(state: WorkflowState): boolean {
     return state.stages?.retrospect?.status === 'complete';
   }
   ```
   The optional chaining handles the corrupt-input case (NFR-5 truth-table: missing `state.stages.retrospect` returns false, no throw).

2. No other changes in `src/workflow.ts` (do NOT touch `createInitialState`, `loadState`, `saveState`, `runForgeGaugeLoop`, `STAGE_ORDER`).

## Phase 2: CLI primitive `steel state reset` (`commands/state.ts` + `src/cli.ts`)

**Goal:** Add a state-mutation primitive the slash command can invoke to perform the FR-4 "y" reset. Without this, the slash command would have to write `state.json` via raw shell, which violates the existing pattern (every state mutation goes through a `steel state ...` subcommand).

This is **not** a per-stage workflow verb (which `src/cli.ts:48-52` excludes); it's a state-mutation primitive in the same family as `steel state mark`, `steel state init`, `steel state iter`, `steel state advance-stage`. Adding it is consistent with the existing CLI pattern.

### 2a. `commands/state.ts`

1. Add export:
   ```ts
   export interface StateResetOpts {
     preserveHistory: boolean;
   }

   export async function cmdStateReset(opts: StateResetOpts): Promise<void> {
     const projectRoot = process.cwd();
     const fresh = createInitialState();
     await saveState(projectRoot, fresh);
     log.success(
       opts.preserveHistory
         ? 'State reset to fresh specification:pending (history preserved)'
         : 'State reset to fresh specification:pending',
     );
   }
   ```

2. Add `createInitialState` and `saveState` to the existing imports from `../src/workflow.js` at the top of the file.

3. The `--preserve-history` flag is currently a no-op at the CLI level (the function does the same thing whichever way it's set), but it makes the slash-command call site explicit about intent and leaves room for a future `--with-clean` flag without a breaking change. The flag MUST be required — there is no implicit default — because the slash command always passes it explicitly and we want a future caller to make a deliberate choice.

### 2b. `src/cli.ts`

Add after the existing `state advance-stage` subcommand registration (~line 228):

```ts
stateCmd
  .command('reset')
  .description('Reset state.json to a fresh specification:pending shape')
  .requiredOption(
    '--preserve-history',
    'Acknowledge that prior specs/, tags, and tasks.json are NOT touched (FR-4)',
  )
  .action((opts: { preserveHistory: boolean }) => cmdStateReset(opts));
```

Import `cmdStateReset` from `../commands/state.js` at the top of the file.

## Phase 3: Tests for Phase 1 + Phase 2

### 3a. `src/workflow.test.ts`

Add a new `describe('isCompletedWorkflow')` block:

1. `retrospect.status === 'complete'` → returns `true`.
2. `retrospect.status === 'in_progress'` → returns `false`.
3. `retrospect.status === 'pending'` → returns `false`.
4. State without `stages.retrospect` (manually-constructed object) → returns `false` (no throw).
5. State without `stages` field at all (extreme corruption) → returns `false` (no throw).
6. Multiple stages complete EXCEPT retrospect (e.g., validation complete, retrospect pending) → returns `false`. Ensures the rule keys on retrospect specifically, not "all stages complete".

Use `createInitialState()` plus targeted mutations to build inputs.

### 3b. `commands/state.test.ts`

If the file does not exist, create it (alongside `commands/clean.test.ts` as a sibling). Add `describe('cmdStateReset')`:

1. Given a populated state.json (specId, branch, completed stages, skillsUsed) → after `cmdStateReset({ preserveHistory: true })`, the on-disk `state.json` is byte-identical to `JSON.stringify(createInitialState(), null, 2) + '\n'` (matches `saveState`'s format).
2. Given existing `specs/<id>/` directory → after reset, the directory and its files exist unchanged (the helper does NOT touch the filesystem outside `state.json`).
3. Given existing `steel/<id>/specification-complete` git tag → after reset, the tag still exists (the helper does NOT shell out to git).
4. Given an existing `.steel/tasks.json` → after reset, the file exists unchanged.

Use the same isolated-temp-dir fixture pattern as `commands/clean.test.ts:24-54`.

### 3c. `commands/init.test.ts` (no changes expected)

Init does not touch state-reset surface. Verify by running `npm test` — no failures expected.

## Phase 4: Slash-command edits (`resources/commands/steel-specify.md`)

**Goal:** Insert step `0a` between the existing prerequisite block and step 1, and amend FR-5's "clean" path with state-diff detection (step 2.5).

### 4a. Insert step `0a` after the existing prerequisite block

Current canonical source (`resources/commands/steel-specify.md`) has:
- Lines 1-9: `## Prerequisites` block.
- Line 12: `0. Run /clear ...`.
- Line 14+: `1. Read state + config: ...`.

Insert a new block between line 12 (current step 0) and line 14 (current step 1):

```markdown
0a. **Detect a previously-completed workflow.** Before reading state for step 1, check whether the project's `.steel/state.json` shows a finished prior workflow:

   - `RETRO_STATUS=$(steel state get --field stages.retrospect.status)`
   - `PREV_SPEC_ID=$(steel state get --field specId)`
   - If `RETRO_STATUS != "complete"`, this step is a no-op — proceed to step 1.

   If `RETRO_STATUS == "complete"`, ask the user verbatim (substituting `$PREV_SPEC_ID`):

   > "A previous workflow (`<previous specId>`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]"

   Read the user's response (case-insensitive, leading/trailing whitespace stripped). Any value other than exactly `y`, `clean`, or `cancel` MUST cause the prompt to be re-displayed verbatim until a valid response is given.

   - **y** — preserve-history reset (step 0a-y below), then proceed to step 1. The new spec.md MUST include a `**Previous Spec ID:** <PREV_SPEC_ID>` line in its header block, placed between `**Spec ID:**` and `**Status:**`. Append this line ONLY when the y-path was taken; otherwise the line is absent.
   - **clean** — invoke `/steel-clean` then detect outcome (step 0a-clean below).
   - **cancel** — print `"Cancelled. Previous workflow <PREV_SPEC_ID> is still recorded as complete. Run /steel-clean or /steel-specify when ready."` and stop. No state changes, no commits, no branch.

   ### 0a-y: preserve-history reset

   `steel state reset --preserve-history`. This rewrites `.steel/state.json` to `createInitialState()` output. Prior `specs/<PREV_SPEC_ID>/` directory, `.steel/tasks.json`, and `steel/<PREV_SPEC_ID>/*-complete` git tags are NOT touched.

   Proceed to step 1.

   ### 0a-clean: invoke /steel-clean and detect outcome

   1. Snapshot: `PREV_SPEC_ID_BEFORE=$(steel state get --field specId)` (already captured above; reuse).
   2. Invoke `/steel-clean` end-to-end, including its own confirmation prompt. Do NOT bypass that confirmation.
   3. After `/steel-clean` returns, re-read state: `POST_SPEC_ID=$(steel state get --field specId)`.
   4. If `POST_SPEC_ID` is empty (state.json now has no `specId` field, equivalent to `createInitialState()` output), `/steel-clean` ran to completion — proceed to step 1.
   5. If `POST_SPEC_ID == PREV_SPEC_ID_BEFORE` (state unchanged), `/steel-clean` was declined or failed before resetting state — print `"/steel-clean did not complete — re-run /steel-specify when ready."` and stop. No branch, no commits.
```

The renumbering does NOT affect existing steps 1-10 — they remain unchanged.

### 4b. No edits to step 1 or later

Steps 1-10 of the existing canonical source already handle: state read, spec ID generation, branching, forge-gauge loop, human approval gate, skills tracking, summary. The y-path's `Previous Spec ID:` field appears in the spec.md the Forge writes in step 6c — this is the Forge LLM's responsibility per FR-7's "appended only when y-path was taken" contract, and is captured by the existing forge commit at step 6e (when `autoCommit === true`) or sits in the working tree (when `autoCommit === false`, per C-4).

No template change is required (`templates/spec.md` does not contain header fields).

## Phase 5: End-to-end behavior tests

These tests assert the slash-command contract. They run against the canonical source MD by simulating the steps as a TS test (the slash command itself is interpreted by an LLM, not directly executable, so tests target the underlying primitives' composition).

### 5a. `commands/state.test.ts` — extend with composition test

Add a `describe('FR-4 reset shape (composition test)')` block:

1. Set up a workflow state representing a fully-completed prior workflow (specId='001-prior', currentStage='retrospect', retrospect.status='complete', specification.status='complete', etc., plus `skillsUsed` populated).
2. Create `specs/001-prior/spec.md` with arbitrary content; create git tag `steel/001-prior/specification-complete`.
3. Run `cmdStateReset({ preserveHistory: true })`.
4. Assert: `loadState()` returns a state byte-identical to `createInitialState()`; `specs/001-prior/spec.md` still exists with original content; `git tag --list 'steel/001-prior/*'` returns the tag.

This covers AC-4's structural assertions (the slash-command interactive bits are tested via the contract assertions in 5b).

### 5b. Slash-command behavior contract test

The Steel-Kit codebase does not have an LLM-driven integration test for slash commands themselves (they are markdown). Instead, assert the **primitives' composition** can produce the documented behavior. Add to `commands/state.test.ts`:

1. **AC-3 valid-input parsing:** a small standalone helper in tests that mimics the slash command's response normalization (`trim().toLowerCase()`) and checks: `'y'`, `' Y '`, `'CLEAN'`, `'cancel'` accepted; `'yes'`, `'c'`, `''`, `'other'`, `'  '` rejected. Helper exists in tests only — slash-command logic is in MD; this test guards against documentation drift in FR-3's "case-insensitive, leading/trailing whitespace ignored" rule by codifying the rule in a test fixture that the canonical source is expected to honor.
2. **AC-7 cancel preserves state:** snapshot `state.json` bytes before; verify cancel path (no calls) leaves state.json byte-identical.
3. **AC-1 prompt verbatim text:** assert that the literal string `"A previous workflow (\`<previous specId>\`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]"` appears in `resources/commands/steel-specify.md` after the changes (a `readFile` + `includes` check). This guards against accidental wording drift.
4. **AC-9 existing tests unchanged:** `npm test` runs all of `commands/clean.test.ts`, `src/workflow.test.ts`, `src/git-config.test.ts`, `src/spec-id.test.ts`. No assertion changes expected. If any of those tests fail, treat as a regression (per AC-9's softened wording, intentional snapshot updates require explicit review against this spec).

### 5c. `command-installer` smoke test for FR-8

Verify the canonical update propagates correctly:

1. In `src/command-installer.test.ts` (existing file), add a test asserting that after `installProjectCommands()`, the rendered `.claude/commands/steel-specify.md` contains the verbatim FR-3 prompt string. This is a one-line assertion on top of the existing installer tests.

If `src/command-installer.test.ts` does not test specific MD content patterns today, this is a new style of assertion — keep the test minimal (single `expect(content).toContain(...)`).

## Phase 6: Build, lint, manual smoke

1. `npm run build` — verify `cmdStateReset` exports cleanly through `src/cli.ts`, `commands/state.ts` boundary; no TypeScript errors.
2. `npm run lint` — verify no lint errors. The codebase uses 2-space indentation, single quotes, semicolons (per constitution coding standards) — match existing style.
3. `npm test` — all tests pass, including the new ones from Phases 3, 5.
4. Manual smoke (optional, not gated on CI):
   - In a scratch project: `steel-init`, run `/steel-specify` through to retrospect-complete, then re-run `/steel-specify "feature 002"` and verify the prompt appears.
   - Pick **y** and verify new `spec.md` has `**Previous Spec ID:**` line and prior `specs/001-*/` is intact.
   - Pick **clean** in a separate run, decline the inner confirmation, and verify abort.
   - Pick **cancel** and verify state.json bytes unchanged.

## Risks and Mitigations

- **Risk: AC-3's normalization rule (`trim().toLowerCase()`) is documented in FR-3 but enforced only by the LLM interpreting the slash command.** The Phase 5b test #1 assertion is a fixture-only guard — it does not actually constrain the LLM. **Mitigation:** the verbatim-string assertion in Phase 5b #3 ensures the canonical source's prompt language is stable; the normalization rule is part of the same canonical text and any drift would be visible in code review. We accept that LLM-interpreted contracts cannot be fully unit-tested.

- **Risk: `steel state reset --preserve-history` is a new CLI surface that might be misused (e.g., a user runs it to wipe in-progress state without going through `/steel-clean`).** **Mitigation:** the `--preserve-history` flag is REQUIRED (no default), forcing the caller to be explicit. The command's `--description` makes its narrow purpose clear ("reset state.json to a fresh specification:pending shape"). We document it as a slash-command helper, not an end-user verb.

- **Risk: state-diff detection in step 0a-clean misclassifies an autoCommit failure (post-state-write) as success.** Acknowledged in spec FR-5 step 3 already (per gauge note N-2). **Mitigation:** the user-visible outcome (fresh state, artifacts removed) IS the intended success state regardless of whether the autoCommit step succeeded; treating it as "proceed" is correct.

- **Risk: introducing the new helper changes the public TS surface of `src/workflow.ts`.** **Mitigation:** `isCompletedWorkflow` is purely additive (no signature changes to existing exports). Downstream consumers (other Steel-Kit modules, internal tests) cannot break.

## Testing Strategy

- **Unit tests** (Phases 3a, 3b): isolated, fast, deterministic. Cover the TS helper truth table and the CLI primitive's filesystem/state contract.
- **Integration tests** (Phase 5a): exercise the helper-plus-primitive composition for AC-4's structural assertions.
- **Contract tests** (Phase 5b): verbatim-string assertions guard against documentation drift in the canonical slash-command source (FR-3, FR-7).
- **Smoke** (Phase 5c): one-line `command-installer` test ensures FR-8 propagation works for the new prompt content.
- **Manual** (Phase 6 step 4): optional end-to-end verification in a scratch project. Not blocking — covered structurally by 5a + 5b.

All tests use the existing Vitest harness and the `commands/clean.test.ts` temp-dir fixture pattern. No new test infrastructure required.

## Out of Plan (deferred to other specs)

- Adding `steel clean --yes` for non-interactive cleaning (per spec Out-of-Scope).
- Adding `steel specify` as a user-facing CLI verb (per spec Out-of-Scope, FR-9).
- Pre-emptive slug-collision detection in step 0a (per C-3 / spec Out-of-Scope).
- A "rename and archive" option (per spec Out-of-Scope).
- Replicating `Previous Spec ID:` to downstream artifacts (per C-2).
