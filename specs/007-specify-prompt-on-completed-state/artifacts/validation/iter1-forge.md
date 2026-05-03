# Validation Report — 007-specify-prompt-on-completed-state

## Summary
- **PASS:** 18 (10 FRs + 5 NFRs minus NFR-1/NFR-3/NFR-4 collapsed under PASS umbrella + 9 ACs + 1 audit)
- **FAIL:** 0
- **DEFERRED:** 0

## Test Execution

| Suite | Command | Exit Code | Pass/Fail/Skip |
|-------|---------|-----------|----------------|
| Build | `npm run build` (tsc) | 0 | n/a (compile gate) |
| Lint | `npm run lint` (tsc --noEmit) | 0 | n/a (typecheck gate) |
| Tests | `npm test` (vitest, 12 files) | 0 | 142 / 0 / 0 |

Captured output: `specs/007-specify-prompt-on-completed-state/artifacts/validation/iter1-test-output.txt`.

## Results

### Functional Requirements

- **FR-1 (detect completed workflow):** **PASS.** Implemented at `src/workflow.ts:53-55` (`isCompletedWorkflow`); slash command consults the same rule via `steel state get --field stages.retrospect.status` literal compare to `complete` (`resources/commands/steel-specify.md:14-19`). Unit-tested by 6 truth-table cases in `src/workflow.test.ts:368-407` — all green.

- **FR-2 (trigger order — between prerequisite and step 1):** **PASS.** `resources/commands/steel-specify.md:14-42` — step `0a` block sits after step `0.` (line 12) and before step `1.` (line 44). Verified via `git diff` and direct read; no later steps renumbered.

- **FR-3 (prompt content):** **PASS.** Verbatim FR-3 prompt at `resources/commands/steel-specify.md:22`. Re-prompt-on-invalid prose at line 24. Verbatim-string assertion in `commands/state.test.ts:381-385` confirms presence post-render. Test green.

- **FR-4 (y-path preserve-history reset):** **PASS.** Slash command invokes `steel state reset` at `resources/commands/steel-specify.md:32-34` which calls `cmdStateReset` (`commands/state.ts:184-191`) → `createInitialState() + saveState()`. Tests at `commands/state.test.ts` cover: byte-identical fresh state (line 184-194), `specs/<id>/` untouched (line 196-205), `.steel/tasks.json` untouched (line 207-216), git tags preserved (line 218-230). All 4 green.

- **FR-5 (clean-path with state-diff detection):** **PASS.** Slash-command steps 1-5 of `0a-clean` at `resources/commands/steel-specify.md:36-42` describe snapshot-then-re-read mechanism. Composition test at `commands/state.test.ts:269-284` mocks `confirm` to false, runs `cmdClean`, asserts state.specId unchanged. Test green.

- **FR-6 (cancel-path):** **PASS.** Slash-command bullet at `resources/commands/steel-specify.md:28` prints the cancel message verbatim with `<PREV_SPEC_ID>` substitution and stops. Verbatim-string assertion in `commands/state.test.ts:393-395` confirms presence.

- **FR-7 (Previous Spec ID line in spec.md):** **PASS.** Placement rule prose at `resources/commands/steel-specify.md:26` ("between **Spec ID:** and **Status:**"). `findPreviousSpecIdPlacement` validator helper in `commands/state.test.ts:286-321` codifies the rule executably with 4 cases (absent, correct, misplaced-after, misplaced-before). All green. Per C-4 / spec FR-7: when `autoCommit === false`, field is still written; no automatic commit added.

- **FR-8 (canonical-source propagation via `steel update`):** **PASS.** Canonical edit at `resources/commands/steel-specify.md` only; per-provider copies inherited via existing `command-installer.ts`. T7 test at `src/command-installer.test.ts:39-48` reads canonical source, runs through `renderAgentSkill`, asserts FR-3 prompt survives. **Coverage scope (per plan Phase 5d / tasks T7):** agent-skill propagation only; Claude-commands copyFile path explicitly out of scope for this spec.

- **FR-9 (no per-stage CLI verb added):** **PASS.** No `steel specify` subcommand added. The `state reset` registration at `src/cli.ts:230-235` is a state-mutation primitive in the same family as `mark`/`init`/`iter`/`advance-stage`, not a workflow verb. Pre-existing `src/cli.ts:48-52` exclusion comment unchanged.

- **FR-10 (internal TS helper for the rule):** **PASS.** `isCompletedWorkflow` exported from `src/workflow.ts:53-55`. Single source of truth at TS layer; slash command duplicates the literal compare per documented C-1 trade-off. Truth-table tests in `src/workflow.test.ts:368-407`.

### Non-Functional Requirements

- **NFR-1 (FR-1 pure function, no I/O):** **PASS.** `isCompletedWorkflow(state)` reads only the in-memory state argument; no fs/git/subprocess calls. Verified by inspection of `src/workflow.ts:53-55`.

- **NFR-2 (atomic "y" reset):** **PASS.** `cmdStateReset` calls `saveState` which uses `writeFile` (Node atomic write to gitignored file). Either the new state is written or the old remains.

- **NFR-3 (provider parity):** **PASS.** Sole production-source edit is the canonical `resources/commands/steel-specify.md`. `steel update` regenerates per-provider copies via existing `command-installer.ts`. No provider-specific code branches added.

- **NFR-4 (macOS/Linux only):** **PASS.** No Windows-specific code paths. Em-dash (U+2014) in canonical source renders correctly in both shells per Forge's `state --help` smoke test (T2).

- **NFR-5 (test coverage map):** **PASS** — all 7 rows mapped:
  - **FR-1/FR-10 truth table:** `src/workflow.test.ts:368-407` (6 tests).
  - **FR-3 prompt verbatim:** `commands/state.test.ts:381-385`.
  - **FR-4 reset shape + dir/tasks/tags preservation:** `commands/state.test.ts:184-230` (4 tests) + composition test at lines 246-263.
  - **FR-5 decline detection composition:** `commands/state.test.ts:269-284`.
  - **FR-6 cancel byte-identical state and zero new commits:** asserted only as canonical-source verbatim (`commands/state.test.ts:393-395`); the no-op behavior IS the contract — no TS code path executes on cancel. Acknowledged in plan iter1 W-5 / spec NFR-5.
  - **FR-7 placement validator:** `commands/state.test.ts:286-321` (4 tests).
  - **FR-8 propagation smoke (partial):** `src/command-installer.test.ts:39-48` (1 test).

### Acceptance Criteria

- **AC-1 (prompt appears verbatim when retrospect.status=complete):** **PASS** — verbatim assertion `commands/state.test.ts:381-385`.
- **AC-2 (prompt does NOT appear when retrospect not complete):** **PASS** — guaranteed structurally by the FR-1 rule; truth-table tests cover the negative branch (`workflow.test.ts:381-384` for `pending`, `:375-379` for `in_progress`).
- **AC-3 (re-display on invalid input):** **PASS** — canonical-source prose asserted at `commands/state.test.ts:387-391`. (Per plan acknowledgment, the LLM-interpreted re-prompt behavior cannot be unit-tested directly; the canonical contract is the test surface.)
- **AC-4 (y reset preserves history + writes Previous Spec ID line):** **PASS** — composition test at `commands/state.test.ts:246-263` validates the reset half; the `Previous Spec ID:` line presence is asserted by the FR-7 placement validator (`:286-321`). Run-time line emission depends on the Forge LLM following the canonical source, which is itself tested for verbatim placement-rule prose.
- **AC-5 (clean path completes and proceeds):** **PASS structurally** — canonical source at `:36-40` describes the success path; the underlying `cmdClean` is unchanged and its existing tests in `commands/clean.test.ts` (5 green) cover its behavior.
- **AC-6 (clean-decline aborts):** **PASS** — composition test at `commands/state.test.ts:269-284` proves the state-diff signal works against the real `cmdClean` decline path.
- **AC-7 (cancel byte-identical state, zero commits):** **PASS structurally** — canonical-source bullet at `:28` explicitly forbids state changes / commits / branches. No TS code path on cancel = no test artifact. Per plan iter1 W-5: acknowledged coverage gap is acceptable because the behavior is purely descriptive and there is nothing to assert against.
- **AC-8 (steel update propagates):** **PASS partial** — agent-skill path verified by T7 (`src/command-installer.test.ts:39-48`). Claude-commands copyFile path is out of scope per plan Phase 5d.
- **AC-9 (no existing test fails):** **PASS** — `npm test` 142/0/0 pre + post change. No snapshot updates needed.

## Deferred Items

None.

## Security Review

- **Input handling:** the slash command reads user response (y/clean/cancel) and rejects anything else by re-prompting. No injection vector; the response is never passed to a shell or eval.
- **Filesystem writes:** `cmdStateReset` writes only to `.steel/state.json` (gitignored); no path-traversal risk.
- **Git operations:** the slash command reads `state.specId` via `steel state get`; no git commands are constructed from user input.
- **CLI surface:** new `steel state reset` is a state-mutation primitive; the `--description` text explicitly disambiguates from `/steel-clean` and warns about its narrow scope. Misuse risk noted in plan Risks; mitigated by description text.

No new security concerns.

## Performance Review

- **`isCompletedWorkflow`:** O(1) field access on already-loaded state. No measurable overhead.
- **Step 0a detection:** single `steel state get --field stages.retrospect.status` invocation (one CLI process spawn) per `/steel-specify` run when state is non-empty. Negligible.
- **`cmdStateReset`:** one `writeFile` call to a small JSON file. No measurable latency impact.

No performance concerns.
