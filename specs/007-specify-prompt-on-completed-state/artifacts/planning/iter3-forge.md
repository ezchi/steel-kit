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
- C-7's state-diff is implemented by the slash command using existing `steel state get --field` plus the new `steel state reset` primitive (no flags).

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
   export async function cmdStateReset(): Promise<void> {
     const projectRoot = process.cwd();
     const fresh = createInitialState();
     await saveState(projectRoot, fresh);
     log.success('State reset to fresh specification:pending (prior specs/, tasks.json, and git tags are NOT touched)');
   }
   ```

2. Add `createInitialState` and `saveState` to the existing imports from `../src/workflow.js` at the top of the file.

3. **No flags.** The previous draft had a `--preserve-history` flag that was a documentation-only no-op (gauge W-3); dropping it keeps the API honest. The fact that this command does NOT touch `specs/`, `.steel/tasks.json`, or git tags is documented in the success message and the `--description` text. Future expansion (e.g., `--also-tasks` to clear tasks.json) can be added non-breakingly.

### 2b. `src/cli.ts`

Add after the existing `state advance-stage` subcommand registration (~line 228):

```ts
stateCmd
  .command('reset')
  .description('Reset state.json to a fresh specification:pending shape (does NOT touch specs/, tasks.json, or git tags — see /steel-clean for full reset)')
  .action(cmdStateReset);
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

### 3b. `commands/state.test.ts` (extend the existing file)

`commands/state.test.ts` already exists with a `setupProject(dir)` fixture (lines 21-46) that writes `.steel/config.json` and a populated `.steel/state.json` to a temp directory, plus a `readState(dir)` helper (lines 48-50). The `describe('state helper subcommands')` block (line 52) sets up `process.cwd()` mocking via `cwdSpy`. Reuse this scaffolding.

Add a new `describe('cmdStateReset')` block:

1. **Reset writes fresh state, byte-identical to `createInitialState()` JSON.** Given the populated state.json from `setupProject` (specId='001-foo', currentStage='planning', etc.), after `cmdStateReset()`, the on-disk `state.json` content is exactly `JSON.stringify(createInitialState(), null, 2)` — **no trailing newline** (per `src/workflow.ts:264` which calls `writeFile(getStatePath(...), JSON.stringify(state, null, 2))` with no `\n`).
2. **Existing `specs/<id>/` is untouched.** Pre-write `specs/001-foo/spec.md` with arbitrary content via the existing `writeFile` helper (line 15). After `cmdStateReset()`, `existsSync('specs/001-foo/spec.md')` is true and content is unchanged.
3. **Existing `.steel/tasks.json` is untouched.** Pre-write `.steel/tasks.json` with `'{"foo":1}'`. After `cmdStateReset()`, content is unchanged.
4. **Git tags are preserved across reset.** Required by NFR-5 FR-4 row ("`git tag --list 'steel/<previousSpecId>/*'` returns the same set before vs after"). Initialize the temp dir as a git repo (`execa('git', ['init'], { cwd: tempDir })` plus `git config user.email`/`user.name` for commit identity), commit a placeholder file so HEAD exists, create the tag (`git tag steel/001-foo/specification-complete`), run `cmdStateReset()`, then assert `execa('git', ['tag', '-l', 'steel/001-foo/*'], { cwd: tempDir }).stdout.trim()` equals `'steel/001-foo/specification-complete'`. Mirror the git-init helper pattern from `commands/clean.test.ts` if that file already provides one; otherwise keep this test self-contained.

### 3c. `commands/init.test.ts` (no changes expected)

Init does not touch state-reset surface. Verify by running `npm test` — no failures expected.

## Phase 4: Slash-command edits (`resources/commands/steel-specify.md`)

**Goal:** Insert step `0a` between the existing prerequisite block and step 1, and amend FR-5's "clean" path with state-diff detection (step 2.5).

### 4a. Insert step `0a` after the existing prerequisite block

Insert a new block between line 12 (current step 0: "Run /clear ...") and line 14 (current step 1: "Read state + config: ..."):

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

   `steel state reset`. This rewrites `.steel/state.json` to `createInitialState()` output. Prior `specs/<PREV_SPEC_ID>/` directory, `.steel/tasks.json`, and `steel/<PREV_SPEC_ID>/*-complete` git tags are NOT touched (documented in the command's `--description` and success message).

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

## Phase 5: End-to-end behavior and contract tests

These tests assert the slash-command contract. The slash command itself is interpreted by an LLM (markdown instructions), so tests target (a) the underlying primitives' composition, (b) the canonical source's verbatim contract surface, and (c) a small TS-level placement validator that codifies FR-7's structural rule.

### 5a. `commands/state.test.ts` — composition tests

Reusing the existing `setupProject` / `readState` fixture (lines 21-50) and `cwdSpy` mock (line 62), add three new `describe` blocks:

1. **`describe('FR-4 reset shape (composition)')`** — covers AC-4 structurally.
   1. Set up populated state via `setupProject` (already specId='001-foo', currentStage='planning', etc.).
   2. Pre-write `specs/001-foo/spec.md` with arbitrary content.
   3. Run `cmdStateReset()`.
   4. Assert: `readState(tempDir)` deep-equals `createInitialState()`; `existsSync('specs/001-foo/spec.md')` is true; content matches the pre-written value.

2. **`describe('FR-5 decline detection (composition)')`** — covers AC-6 / NFR-5 FR-5 row. **This is the test missing from iter 1 (gauge B-3).**
   1. Set up populated state via `setupProject`. Capture `previousSpecId = readState(tempDir).specId` (= `'001-foo'`).
   2. **Mock `src/utils.js` using `vi.mock` hoisted at the top of the test file**, mirroring `commands/clean.test.ts:9-18` verbatim. The mock MUST preserve `die`'s throw semantics (the clean.test.ts pattern is `die: (msg: string) => { throw new Error(msg); }`). Without that, `cmdClean`'s validation paths will silently no-op instead of throwing, and unrelated existing tests in this file may regress. Do NOT use `vi.spyOn` — `confirm` is an ESM read-only named export and `spyOn` cannot reassign it. If the existing tests in `commands/state.test.ts` rely on real `log` output assertions (verify by reading the file), confirm the mocked `log` is structurally compatible (`log.success`, `log.warn`, `log.info`, `log.step`, `log.error` all need to be present as `vi.fn()` no-ops).
   3. Run `cmdClean()` (the existing exported function from `commands/clean.ts`). With `confirm` mocked to return `false`, `cmdClean` returns at line 48 without modifying state.
   4. Assert: `readState(tempDir).specId === previousSpecId` (state unchanged); `existsSync('.steel/state.json')` is true; the pre-existing populated state remains intact.
   5. This proves the FR-5 step 2.5 state-diff classification logic works against the real `cmdClean` decline path. The slash command's bash `$(steel state get --field specId)` returning the unchanged value IS the decline signal.

3. **`describe('FR-7 Previous Spec ID line placement')`** — covers AC-4's `Previous Spec ID:` requirement and NFR-5 FR-7 row. **This is the test missing from iter 1 (gauge B-2).**
   1. Add a small parser helper to the test file: `function findPreviousSpecIdPlacement(specMd: string): 'after-spec-id-before-status' | 'present-but-misplaced' | 'absent'`. Logic: split lines, find the indices of lines starting with `**Spec ID:**`, `**Previous Spec ID:**`, and `**Status:**`. Return `'absent'` if no Previous Spec ID line. Return `'after-spec-id-before-status'` if `specIdIdx < prevIdx < statusIdx`. Otherwise `'present-but-misplaced'`.
   2. Test cases:
      - Input with no `Previous Spec ID:` line at all → `'absent'`. (Validates the "y-path was not taken" branch.)
      - Input with the line correctly placed between `**Spec ID:**` and `**Status:**` → `'after-spec-id-before-status'`. (Validates the y-path output.)
      - Input with the line BEFORE `**Spec ID:**` or AFTER `**Status:**` → `'present-but-misplaced'`. (Negative case, would catch LLM regression.)
   3. The helper itself is the contract: it documents the placement rule executably. Implement-stage agents (and any future Forge LLM) producing spec.md content can be evaluated against this helper.

### 5b. Canonical-source verbatim-string assertions

Add to `commands/state.test.ts` a new `describe('canonical source contracts')` block. These tests `readFileSync('resources/commands/steel-specify.md', 'utf-8')` and assert critical strings are present. They guard against accidental wording drift.

1. **AC-1 prompt verbatim:** the file contains the exact substring `A previous workflow (\`<previous specId>\`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]` (modulo the bash-style `<previous specId>` placeholder).
2. **AC-3 input-normalization rule prose:** the file contains the substring `case-insensitive` and `whitespace stripped` (or equivalent) so the contract is documented in the canonical source.
3. **FR-7 placement rule prose:** the file contains the substring `between **Spec ID:** and **Status:**` (or equivalent placement rule wording).
4. **FR-6 cancel message verbatim:** the file contains the cancel message starting with `Cancelled. Previous workflow`.
5. **FR-5 step 4 abort message verbatim:** the file contains `/steel-clean did not complete — re-run /steel-specify when ready.`

These five string-presence assertions enforce that the canonical source remains the contract surface; if a future edit accidentally rewords FR-3, the test fails.

### 5c. AC-9 regression check (no new test code)

`npm test` MUST still pass for all existing test files: `commands/clean.test.ts`, `src/workflow.test.ts`, `src/git-config.test.ts`, `src/spec-id.test.ts`, `src/command-installer.test.ts`, `commands/init.test.ts`, `src/forge.test.ts`, `src/doctor.test.ts`, `src/config.test.ts`, `commands/render-prompt.test.ts`. Per AC-9 (clarified), no existing test fails unless the failure is a deliberate snapshot update reviewed against this spec.

### 5d. FR-8 propagation smoke (scope-aware, partial coverage)

`src/command-installer.test.ts` currently tests `renderAgentSkill` (a pure-string function) — not `installProjectCommands` end-to-end. **Required scope for this spec:** add a 2-3 line test in `src/command-installer.test.ts` that:

1. `readFileSync('resources/commands/steel-specify.md', 'utf-8')` — read the canonical source.
2. Pass it through `renderAgentSkill` (or `adaptMarkdownForAgentSkill`, whichever is the public-test entry point).
3. `expect(rendered).toContain('A previous workflow')` — assert the FR-3 prompt survives the agent-skill MD adaptation.

**Coverage acknowledgment:** this exercises only the `.agents/skills/` propagation path. The Claude-commands path (`installClaudeCommands` at `src/command-installer.ts:55-67`) uses `copyFile` directly — if `copyFile` is correct (which it has been in production), the canonical source's FR-3 string will appear verbatim in `.claude/commands/steel-specify.md` without any adaptation. Asserting that path requires a temp-dir fixture (mkdir for `.steel/config.json`, mkdir for `.claude/commands/`, run `installProjectCommands(tempDir)`, read the output file, teardown) and is **out of scope for this spec** — accept the partial coverage and document the assumption that `copyFile` is unchanged. AC-8's "equivalent Gemini/Codex paths" likewise inherit from the canonical source via the existing installer mechanism; verifying their output is the installer's contract, not this spec's.

If a future spec wants to harden FR-8 with end-to-end `installProjectCommands` fixture coverage, that is an explicit follow-up.

## Phase 6: Build, lint, smoke

1. `npm run build` — verify `cmdStateReset` exports cleanly through `src/cli.ts`, `commands/state.ts` boundary; no TypeScript errors.
2. `npm run lint` — verify no lint errors. The codebase uses 2-space indentation, single quotes, semicolons (per constitution coding standards) — match existing style.
3. `npm test` — all tests pass, including the new tests from Phases 3 and 5. With Phase 5b's verbatim-string assertions and Phase 5a #2/#3's composition + placement tests, the unit-test matrix covers every NFR-5 row; manual smoke is no longer load-bearing.
4. Manual smoke (truly optional, no longer required for coverage): in a scratch project, run a complete workflow to retrospect, re-invoke `/steel-specify`, and exercise each of y / clean-decline / cancel. Skip if Phase 5 is green.

## Risks and Mitigations

- **Risk: AC-3's normalization rule (`trim().toLowerCase()`) is documented in FR-3 but enforced only by the LLM interpreting the slash command.** The Phase 5b test #1 assertion is a fixture-only guard — it does not actually constrain the LLM. **Mitigation:** the verbatim-string assertion in Phase 5b #3 ensures the canonical source's prompt language is stable; the normalization rule is part of the same canonical text and any drift would be visible in code review. We accept that LLM-interpreted contracts cannot be fully unit-tested.

- **Risk: `steel state reset` is a new CLI surface that might be misused (e.g., a user runs it to wipe in-progress state without going through `/steel-clean`).** **Mitigation:** the command's `--description` (registered in `src/cli.ts`) makes its narrow purpose explicit, including the parenthetical "does NOT touch specs/, tasks.json, or git tags — see /steel-clean for full reset". We document it as a slash-command helper, not an end-user verb. Future safety guards (e.g., a `--yes` confirmation for non-slash-command callers) can be added non-breakingly.

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
