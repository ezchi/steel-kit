# Tasks: 007-specify-prompt-on-completed-state

**Spec:** [spec.md](spec.md)
**Plan:** [plan.md](plan.md)
**Clarifications:** [clarifications.md](clarifications.md)

Plan-vs-repo cross-check (per `/steel-tasks` step 3b): every file path and function reference in `plan.md` was verified against `git ls-tree HEAD` and `grep -n` against the cited line ranges. **No corrections required.** Notable verifications:
- `src/workflow.ts:264` — `saveState` writes `JSON.stringify(state, null, 2)` with no trailing newline. ✓
- `commands/state.test.ts:21-46, 48-50` — `setupProject` and `readState` helpers exist as cited. ✓
- `commands/clean.test.ts:9-18` — `vi.mock('../src/utils.js', ...)` block matches the plan's mock pattern verbatim, including `die: (msg: string) => { throw new Error(msg); }`. ✓
- `commands/clean.test.ts:45-52` — `initGitRepo(dir, branch?)` exists. ✓
- `src/command-installer.ts:55, 91, 120` — `installClaudeCommands` (private), `renderAgentSkill` (exported), `adaptMarkdownForAgentSkill` (private — gauge N-2 was correct). ✓
- `src/command-installer.test.ts` — exists, tests only `renderAgentSkill`. ✓
- `src/utils.ts` — `confirm` is an ESM named export (the plan correctly says `vi.spyOn` will not work). ✓

Base branch (per `state.baseBranch`): **`develop`**. No verification gates in plan.md reference a base branch directly — Phase 6 `npm run build` / `npm run lint` / `npm test` are branch-agnostic.

---

## Execution order summary

```
T1 (workflow helper) ──┐
                       ├── T8 (build/lint/test)
T2 (CLI primitive) ────┼── T3 (CLI primitive tests)
                       ├── T4 (composition tests, depends on T2)
T6 (slash command) ────┼── T5 (canonical-source verbatim tests, depends on T6)
                       └── T7 (FR-8 propagation smoke, depends on T6)
```

T1 and T2 are independent. T3 depends on T2. T4 depends on T2 (uses `cmdStateReset`). T5 and T7 depend on T6 (the canonical source must contain the strings being asserted). T8 depends on everything.

---

## T1 — Add `isCompletedWorkflow` helper to `src/workflow.ts` and tests

**Plan reference:** Phase 1, Phase 3a.
**Files:**
- modify `src/workflow.ts` (add export)
- modify `src/workflow.test.ts` (add `describe('isCompletedWorkflow')` block)

**Description:**

1. In `src/workflow.ts`, after the `WorkflowState` interface (around line 51, before `STAGE_ORDER`), add:
   ```ts
   export function isCompletedWorkflow(state: WorkflowState): boolean {
     return state.stages?.retrospect?.status === 'complete';
   }
   ```
   The optional chaining handles corrupt input (FR-1's "no throw" requirement).

2. In `src/workflow.test.ts`, add a `describe('isCompletedWorkflow')` block with 6 tests:
   - `retrospect.status === 'complete'` → `true`.
   - `retrospect.status === 'in_progress'` → `false`.
   - `retrospect.status === 'pending'` → `false`.
   - State without `stages.retrospect` (manually-constructed object missing the field) → `false` (no throw).
   - State without `stages` field at all → `false` (no throw).
   - All earlier stages complete EXCEPT retrospect → `false`. (Confirms the rule keys on retrospect specifically, not "all stages complete".)

   Use `createInitialState()` plus targeted mutations to build inputs.

**Dependencies:** none.

**Verification:**
- `npm run build` passes (new export type-checks).
- `npm test src/workflow.test.ts` passes; `isCompletedWorkflow` describe block runs all 6 tests green.

**Covers:** FR-1, FR-10, NFR-5 row "FR-1/FR-10".

---

## T2 — Add `cmdStateReset` and register `steel state reset`

**Plan reference:** Phase 2a, Phase 2b.
**Files:**
- modify `commands/state.ts` (add export `cmdStateReset`)
- modify `src/cli.ts` (register `steel state reset` subcommand)

**Description:**

1. In `commands/state.ts`:
   - Add `createInitialState` and `saveState` to the existing import from `../src/workflow.js` at the top.
   - Add export:
     ```ts
     export async function cmdStateReset(): Promise<void> {
       const projectRoot = process.cwd();
       const fresh = createInitialState();
       await saveState(projectRoot, fresh);
       log.success('State reset to fresh specification:pending (prior specs/, tasks.json, and git tags are NOT touched)');
     }
     ```
   - **No flags.** The function takes no parameters.

2. In `src/cli.ts`:
   - Add `cmdStateReset` to the existing import from `../commands/state.js` at the top of the file.
   - After the `state advance-stage` subcommand registration (~line 226-228), insert:
     ```ts
     stateCmd
       .command('reset')
       .description('Reset state.json to a fresh specification:pending shape (does NOT touch specs/, tasks.json, or git tags — see /steel-clean for full reset)')
       .action(cmdStateReset);
     ```

**Dependencies:** none (T2 is independent of T1; both touch different exports).

**Verification:**
- `npm run build` passes.
- `node dist/cli.js state reset` (after build) executes the function in the current cwd. Manual smoke only — automated verification is in T3.

**Covers:** FR-4 (the reset primitive), FR-9 (no per-stage CLI verb added — `reset` is a state-mutation primitive, not a workflow verb).

---

## T3 — Add tests for `cmdStateReset`

**Plan reference:** Phase 3b.
**Files:**
- modify `commands/state.test.ts` (add `describe('cmdStateReset')` block, reusing existing `setupProject`, `readState`, `cwdSpy` fixtures from lines 21-46, 48-50, 62)

**Description:**

Add a new `describe('cmdStateReset')` block. Use the existing `beforeEach` / `afterEach` lifecycle that already sets up `tempDir`, `cwdSpy`, `stdoutSpy`, and calls `setupProject(tempDir)`. Tests:

1. **Reset writes fresh state, byte-identical to `createInitialState()` JSON.** After calling `cmdStateReset()`, `readFileSync(resolve(tempDir, '.steel/state.json'), 'utf-8')` equals `JSON.stringify(createInitialState(), null, 2)` — **no trailing newline** (matches `src/workflow.ts:264`).
2. **Existing `specs/<id>/` is untouched.** Pre-write `specs/001-foo/spec.md` with arbitrary content via the existing `writeFile` helper (line 15-19). After `cmdStateReset()`, `existsSync(resolve(tempDir, 'specs/001-foo/spec.md'))` is true and `readFileSync(...)` returns the original content.
3. **Existing `.steel/tasks.json` is untouched.** Pre-write `.steel/tasks.json` with `'{"foo":1}'`. After `cmdStateReset()`, content is unchanged.
4. **Git tags are preserved across reset.** Required by NFR-5 FR-4 row. Use `execa('git', ['init'], { cwd: tempDir })` plus `git config user.email/user.name` for commit identity, commit a placeholder file so HEAD exists, create the tag with `git tag steel/001-foo/specification-complete`, run `cmdStateReset()`, then assert `(await execa('git', ['tag', '-l', 'steel/001-foo/*'], { cwd: tempDir })).stdout.trim()` equals `'steel/001-foo/specification-complete'`. Mirror `commands/clean.test.ts:45-52`'s `initGitRepo(dir, branch?)` helper if reusable; otherwise inline the git init.

**Dependencies:** T2 (imports `cmdStateReset`).

**Verification:**
- `npm test commands/state.test.ts` passes; new `describe('cmdStateReset')` block has all 4 tests green.
- No regression in existing 9 tests in `commands/state.test.ts`.

**Covers:** NFR-5 row "FR-4" (reset shape, dir/tasks/tags preservation).

---

## T4 — Add FR-4, FR-5, FR-7 composition tests to `commands/state.test.ts`

**Plan reference:** Phase 5a (3 describe blocks).
**Files:**
- modify `commands/state.test.ts`

**Description:**

Add three new `describe` blocks. The first reuses T3's setup; the second mocks `confirm` and exercises `cmdClean`; the third adds an in-test parser helper.

1. **`describe('FR-4 reset shape (composition)')`** — covers AC-4 structurally. Same as T3's tests #1 and #2 but composed end-to-end: populated state → pre-write spec.md → `cmdStateReset()` → assert `readState(tempDir)` deep-equals `createInitialState()` AND spec.md still exists. (Some redundancy with T3 is acceptable; this block frames the assertions per the AC, not per the function.)

2. **`describe('FR-5 decline detection (composition)')`** — covers AC-6 / NFR-5 FR-5 row. **Critical: requires hoisted `vi.mock`.**
   - Add at the top of `commands/state.test.ts` (alongside existing imports), mirroring `commands/clean.test.ts:9-18` verbatim:
     ```ts
     const confirmMock = vi.fn();
     vi.mock('../src/utils.js', () => ({
       log: {
         info: vi.fn(),
         warn: vi.fn(),
         success: vi.fn(),
         debug: vi.fn(),
         step: vi.fn(),
         error: vi.fn(),
       },
       confirm: (...args: any[]) => confirmMock(...args),
       die: (msg: string) => { throw new Error(msg); },
     }));
     ```
     The `log` keys are the union of clean.test.ts's `{info, warn, success, debug}` and state.test.ts's likely needs — covers all callers safely.
   - **Do NOT use `vi.spyOn`** — `confirm` is an ESM read-only named export; `spyOn` cannot reassign it.
   - **The `vi.mock` is hoisted** to top-of-file and affects every test in the file. Existing 9 tests in `commands/state.test.ts` do not assert on `log` output, so they tolerate the mock; verify by running the full file before declaring the task done.
   - In the new describe block: set up populated state via `setupProject` (auto-runs in `beforeEach`); capture `previousSpecId = readState(tempDir).specId` (= `'001-foo'`); set `confirmMock.mockReturnValue(false)`; dynamically `import('./clean.js')` and call `cmdClean()`. Assert `readState(tempDir).specId === previousSpecId` (state unchanged); `existsSync(resolve(tempDir, '.steel/state.json'))` is true.

3. **`describe('FR-7 Previous Spec ID line placement')`** — covers AC-4 placement assertion / NFR-5 FR-7 row.
   - Add a parser helper inside the test file (not exported):
     ```ts
     function findPreviousSpecIdPlacement(specMd: string): 'after-spec-id-before-status' | 'present-but-misplaced' | 'absent' {
       const lines = specMd.split('\n');
       const specIdIdx = lines.findIndex((l) => l.startsWith('**Spec ID:**'));
       const prevIdx = lines.findIndex((l) => l.startsWith('**Previous Spec ID:**'));
       const statusIdx = lines.findIndex((l) => l.startsWith('**Status:**'));
       if (prevIdx < 0) return 'absent';
       if (specIdIdx < prevIdx && prevIdx < statusIdx) return 'after-spec-id-before-status';
       return 'present-but-misplaced';
     }
     ```
   - Three test cases:
     - Synthetic spec.md with no `**Previous Spec ID:**` line → `'absent'`.
     - Synthetic spec.md with the line correctly placed → `'after-spec-id-before-status'`.
     - Synthetic spec.md with the line BEFORE `**Spec ID:**` or AFTER `**Status:**` → `'present-but-misplaced'`.

**Dependencies:** T2 (uses `cmdStateReset`), T6 is not required because these tests do not depend on the canonical-source contents — they exercise primitives + a local parser.

**Verification:**
- `npm test commands/state.test.ts` passes.
- All existing tests in the file still pass (the hoisted `vi.mock` does not regress them).

**Covers:** AC-4, AC-6 (composition side), NFR-5 rows "FR-4", "FR-5", "FR-7".

---

## T5 — Add canonical-source verbatim-string assertions to `commands/state.test.ts`

**Plan reference:** Phase 5b (5 assertions).
**Files:**
- modify `commands/state.test.ts`

**Description:**

Add a new `describe('canonical source contracts')` block. Each test reads `resources/commands/steel-specify.md` once via `readFileSync(resolve(__dirname, '..', 'resources/commands/steel-specify.md'), 'utf-8')` (or equivalent path resolution) and asserts substrings:

1. **AC-1 prompt verbatim:** content includes `A previous workflow (\`<previous specId>\`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]`.
2. **AC-3 normalization rule prose:** content includes `case-insensitive` AND `whitespace stripped` (or `whitespace-stripped`).
3. **FR-7 placement rule prose:** content includes `between **Spec ID:** and **Status:**`.
4. **FR-6 cancel message:** content includes `Cancelled. Previous workflow`.
5. **FR-5 step 4 abort message:** content includes `/steel-clean did not complete — re-run /steel-specify when ready.`.

These five assertions enforce that the canonical source remains the contract surface. Future edits that accidentally reword any of these will fail their corresponding test.

**Dependencies:** T6 (the canonical source must contain the strings — T6 inserts step `0a` which contains them all).

**Verification:**
- `npm test commands/state.test.ts` passes.
- If T5 runs before T6 it will fail — that's intentional. T8's full-suite run after T6 must be green.

**Covers:** AC-1, AC-3, NFR-5 rows "FR-3", "FR-6".

---

## T6 — Insert step `0a` into `resources/commands/steel-specify.md`

**Plan reference:** Phase 4a, Phase 4b.
**Files:**
- modify `resources/commands/steel-specify.md`

**Description:**

Insert the step `0a` block between current line 12 (`0. Run /clear ...`) and current line 14 (`1. Read state + config: ...`) of `resources/commands/steel-specify.md`. The exact insert (matching the plan's Phase 4a wording, with strings tuned to satisfy T5's verbatim-string assertions):

```markdown
0a. **Detect a previously-completed workflow.** Before reading state for step 1:

   - `RETRO_STATUS=$(steel state get --field stages.retrospect.status)`
   - `PREV_SPEC_ID=$(steel state get --field specId)`
   - If `RETRO_STATUS != "complete"`, this step is a no-op — proceed to step 1.

   If `RETRO_STATUS == "complete"`, ask the user verbatim (substituting `$PREV_SPEC_ID`):

   > "A previous workflow (`<previous specId>`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]"

   Read the user's response (case-insensitive, leading/trailing whitespace stripped). Any value other than exactly `y`, `clean`, or `cancel` MUST cause the prompt to be re-displayed verbatim until a valid response is given.

   - **y** — preserve-history reset (step 0a-y below), then proceed to step 1. The new spec.md MUST include a `**Previous Spec ID:** <PREV_SPEC_ID>` line in its header block, placed between **Spec ID:** and **Status:**. Append this line ONLY when the y-path was taken; otherwise the line is absent.
   - **clean** — invoke `/steel-clean` then detect outcome (step 0a-clean below).
   - **cancel** — print `"Cancelled. Previous workflow <PREV_SPEC_ID> is still recorded as complete. Run /steel-clean or /steel-specify when ready."` and stop. No state changes, no commits, no branch.

   ### 0a-y: preserve-history reset

   `steel state reset`. This rewrites `.steel/state.json` to `createInitialState()` output. Prior `specs/<PREV_SPEC_ID>/` directory, `.steel/tasks.json`, and `steel/<PREV_SPEC_ID>/*-complete` git tags are NOT touched. Proceed to step 1.

   ### 0a-clean: invoke /steel-clean and detect outcome

   1. Snapshot: `PREV_SPEC_ID_BEFORE=$PREV_SPEC_ID` (already captured above; reuse).
   2. Invoke `/steel-clean` end-to-end, including its own confirmation prompt. Do NOT bypass that confirmation.
   3. After `/steel-clean` returns, re-read state: `POST_SPEC_ID=$(steel state get --field specId)`.
   4. If `POST_SPEC_ID` is empty (state.json now has no `specId` field), `/steel-clean` ran to completion — proceed to step 1.
   5. If `POST_SPEC_ID == PREV_SPEC_ID_BEFORE` (state unchanged), `/steel-clean` was declined or failed before resetting state — print `"/steel-clean did not complete — re-run /steel-specify when ready."` and stop. No branch, no commits.
```

Steps 1-10 of the existing canonical source remain unchanged.

**Dependencies:** T2 (slash command invokes `steel state reset`).

**Verification:**
- `grep -c "A previous workflow" resources/commands/steel-specify.md` returns ≥1.
- `grep -c "case-insensitive" resources/commands/steel-specify.md` returns ≥1.
- `grep -c "whitespace stripped" resources/commands/steel-specify.md` returns ≥1.
- `grep -c "between \*\*Spec ID:\*\* and \*\*Status:\*\*" resources/commands/steel-specify.md` returns ≥1.
- `grep -c "Cancelled. Previous workflow" resources/commands/steel-specify.md` returns ≥1.
- `grep -c "/steel-clean did not complete — re-run /steel-specify when ready" resources/commands/steel-specify.md` returns ≥1.
- After T8 runs, T5's tests pass.

**Covers:** FR-1 (slash-command invocation of the rule), FR-2 (trigger order), FR-3 (prompt content), FR-4 (y-path orchestration), FR-5 (clean-path orchestration including step 2.5 detection), FR-6 (cancel-path orchestration), FR-7 (placement rule prose).

---

## T7 — FR-8 propagation smoke test

**Plan reference:** Phase 5d.
**Files:**
- modify `src/command-installer.test.ts`

**Description:**

Add a new test inside the existing `describe('renderAgentSkill')` block:

```ts
it('preserves the FR-3 prompt string from steel-specify.md (FR-8)', () => {
  const canonical = readFileSync(resolve(__dirname, '..', 'resources/commands/steel-specify.md'), 'utf-8');
  const rendered = renderAgentSkill('steel-specify.md', canonical);
  expect(rendered).toContain('A previous workflow');
});
```

Add `readFileSync` to the `node:fs` import and `resolve` to the `node:path` import at the top of the file.

**Coverage scope (acknowledged):** this exercises only the `.agents/skills/` propagation path. The Claude-commands path (`installClaudeCommands` at `src/command-installer.ts:55`) uses `copyFile` directly — if `copyFile` is correct (production-validated), the canonical source's FR-3 string flows through verbatim to `.claude/commands/steel-specify.md` without adaptation. End-to-end fixture coverage of `installProjectCommands` is **out of scope for this spec** per Plan Phase 5d acknowledgment.

**Dependencies:** T6 (canonical source must contain the string).

**Verification:**
- `npm test src/command-installer.test.ts` passes; new test green.

**Covers:** AC-8 (partial — agent-skill path), NFR-5 row "FR-8" (partial).

---

## T8 — Build, lint, full test suite

**Plan reference:** Phase 6.
**Files:** none modified (verification only).

**Description:**

Run the full verification gates in order. Stop and fix on first failure:

1. `npm run build` — TypeScript compiles cleanly. Specifically verifies the `cmdStateReset` import in `src/cli.ts` resolves through the `commands/state.ts` boundary.
2. `npm run lint` — passes. The codebase uses 2-space indentation, single quotes, semicolons (per constitution coding standards). New code from T1-T7 must match.
3. `npm test` — full suite passes, including:
   - New tests from T1, T3, T4, T5, T7.
   - All existing tests in `commands/clean.test.ts`, `src/workflow.test.ts`, `src/git-config.test.ts`, `src/spec-id.test.ts`, `src/command-installer.test.ts`, `commands/init.test.ts`, `src/forge.test.ts`, `src/doctor.test.ts`, `src/config.test.ts`, `commands/render-prompt.test.ts`, `src/git-ops.test.ts`. Per AC-9 (clarified): no existing test fails unless the failure is a deliberate snapshot update reviewed against this spec.

**Dependencies:** T1, T2, T3, T4, T5, T6, T7 (everything).

**Verification:**
- All three commands exit 0.
- If `npm test` reports any failure, identify whether it is (a) a regression introduced by this change (fix it) or (b) a pre-existing flake unrelated to spec 007 (document and re-run). Do not silently mark complete if any test fails.

**Covers:** AC-9 (no-regression), validation gate before stage advance.

---

## Out of tasks (explicit deferrals)

- Manual end-to-end smoke test against a scratch project (Plan Phase 6 step 4) — explicitly optional per plan; T1-T8 cover the test matrix structurally.
- Adding `Previous Spec ID:` to `tasks.md`, `plan.md`, etc. (per C-2).
- Adding `steel clean --yes` (per spec Out-of-Scope).
- Adding `steel specify` user-facing CLI verb (per spec Out-of-Scope, FR-9).
- Pre-emptive slug-collision detection (per C-3 / spec Out-of-Scope).
- Upgrading T7 to a temp-dir fixture for `installProjectCommands` end-to-end (per Plan Phase 5d explicit follow-up).
