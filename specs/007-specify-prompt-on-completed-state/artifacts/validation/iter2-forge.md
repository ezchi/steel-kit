# Validation Report — 007-specify-prompt-on-completed-state

**Iteration:** 2 (citations refreshed per iter1-gauge feedback; substantive verdicts unchanged)

## Summary
- **PASS:** 24 (10 FRs + 5 NFRs + 9 ACs)
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

- **FR-1 (detect completed workflow):** **PASS.** `src/workflow.ts:53-55` (`isCompletedWorkflow`); slash command consults the same rule via `steel state get --field stages.retrospect.status` literal compare to `complete` in `resources/commands/steel-specify.md:14-19`. Truth-table: `src/workflow.test.ts:368-407` (6 tests).

- **FR-2 (trigger order — between prerequisite and step 1):** **PASS.** `resources/commands/steel-specify.md` step `0a` block at lines 14-40 sits after step `0.` (line 12) and before step `1.` (now at line 44). Verified via `git show HEAD~6 -- resources/commands/steel-specify.md`.

- **FR-3 (prompt content):** **PASS.** Verbatim FR-3 prompt at `resources/commands/steel-specify.md:22`. Re-prompt-on-invalid prose at line 24. Test: `commands/state.test.ts:387-391`. **NOTE per gauge:** canonical wraps the prompt in markdown blockquote double-quotes (`> "A previous workflow..."`); spec FR-3 verbatim is unquoted. Reasonable rendering convention; flagged for retrospect.

- **FR-4 (y-path preserve-history reset):** **PASS.** Slash command invokes `steel state reset` at `resources/commands/steel-specify.md:32-34` → `cmdStateReset` (`commands/state.ts:173-180`) → `createInitialState() + saveState()`. Tests at `commands/state.test.ts`: byte-identical fresh state (lines 201-211), `specs/<id>/` untouched (lines 212-221), `.steel/tasks.json` untouched (lines 223-232), git tags preserved (lines 234-247). 4 green.

- **FR-5 (clean-path with state-diff detection):** **PASS.** Slash-command steps 1-5 of `0a-clean` at `resources/commands/steel-specify.md:36-40` describe the snapshot-then-re-read mechanism. Composition test at `commands/state.test.ts:299-312` mocks `confirm` to false, runs `cmdClean`, asserts `state.specId` unchanged. Green.

- **FR-6 (cancel-path):** **PASS.** Slash-command bullet at `resources/commands/steel-specify.md:28` prints the cancel message verbatim with `<PREV_SPEC_ID>` substitution and stops. Verbatim assertion at `commands/state.test.ts:402-404`.

- **FR-7 (Previous Spec ID line in spec.md):** **PASS.** Placement rule prose at `resources/commands/steel-specify.md:26` ("between **Spec ID:** and **Status:**"). `findPreviousSpecIdPlacement` validator at `commands/state.test.ts:315-374` codifies the rule executably with 4 cases (absent, correct, misplaced-after, misplaced-before). Per C-4 / spec FR-7: when `autoCommit === false`, field is still written; no automatic commit added.

- **FR-8 (canonical-source propagation via `steel update`):** **PASS partial.** Canonical edit only at `resources/commands/steel-specify.md`; per-provider copies inherited via existing `command-installer.ts`. Test at `src/command-installer.test.ts:41-50` reads canonical, runs `renderAgentSkill`, asserts FR-3 prompt survives. **Coverage scope per plan Phase 5d / tasks T7:** agent-skill propagation only; Claude-commands `copyFile` path explicitly out of scope.

- **FR-9 (no per-stage CLI verb added):** **PASS.** No `steel specify` subcommand. `state reset` registration at `src/cli.ts:231-236` is a state-mutation primitive in the same family as `mark`/`init`/`iter`/`advance-stage`. Pre-existing `src/cli.ts:48-52` exclusion comment unchanged.

- **FR-10 (internal TS helper for the rule):** **PASS.** `isCompletedWorkflow` exported from `src/workflow.ts:53-55`. Single source of truth at TS layer; slash command duplicates the literal compare per documented C-1 trade-off. Truth-table tests in `src/workflow.test.ts:368-407`.

### Non-Functional Requirements

- **NFR-1 (FR-1 pure function, no I/O):** **PASS.** `isCompletedWorkflow(state)` reads only the in-memory state argument; no fs/git/subprocess calls. Verified at `src/workflow.ts:53-55`.

- **NFR-2 (atomic "y" reset):** **PASS.** `cmdStateReset` calls `saveState` which uses `writeFile` (Node atomic write to gitignored file). Either the new state is written or the old remains.

- **NFR-3 (provider parity):** **PASS.** Sole production-source edit is the canonical `resources/commands/steel-specify.md`. `steel update` regenerates per-provider copies via existing `command-installer.ts`. No provider-specific code branches added.

- **NFR-4 (macOS/Linux only):** **PASS.** No Windows-specific code paths. Em-dash (U+2014) renders correctly per Forge T2 smoke (`state --help`).

- **NFR-5 (test coverage map):** **PASS** — all 7 rows mapped:
  - **FR-1/FR-10 truth table:** `src/workflow.test.ts:368-407` (6 tests).
  - **FR-3 prompt verbatim:** `commands/state.test.ts:387-391`.
  - **FR-4 reset shape + dir/tasks/tags preservation:** `commands/state.test.ts:201-247` (4 tests) + composition test at lines 266-278.
  - **FR-5 decline detection composition:** `commands/state.test.ts:299-312`.
  - **FR-6 cancel byte-identical state and zero new commits:** asserted as canonical-source verbatim only (`commands/state.test.ts:402-404`); no-op behavior IS the contract — no TS code path executes on cancel. Acknowledged in plan iter1 W-5 / spec NFR-5.
  - **FR-7 placement validator:** `commands/state.test.ts:315-374` (4 tests).
  - **FR-8 propagation smoke (partial):** `src/command-installer.test.ts:41-50` (1 test).

### Acceptance Criteria

- **AC-1 (prompt appears verbatim when retrospect.status=complete):** **PASS** — verbatim assertion `commands/state.test.ts:387-391`.
- **AC-2 (prompt does NOT appear when retrospect not complete):** **PASS** — guaranteed structurally by FR-1 rule; truth-table tests cover negative branches (`workflow.test.ts:381-384` for `pending`, `:375-379` for `in_progress`).
- **AC-3 (re-display on invalid input):** **PASS** — canonical-source prose asserted at `commands/state.test.ts:393-396`. (Per plan acknowledgment, the LLM-interpreted re-prompt behavior cannot be unit-tested directly; the canonical contract is the test surface.)
- **AC-4 (y reset preserves history + writes Previous Spec ID line):** **PASS** — composition test at `commands/state.test.ts:266-278` validates the reset half; `Previous Spec ID:` line presence is asserted by the FR-7 placement validator (`:315-374`). Run-time line emission depends on the Forge LLM following the canonical source, which is itself tested for verbatim placement-rule prose.
- **AC-5 (clean path completes and proceeds):** **PASS structurally** — canonical source at `:36-40` describes the success path; underlying `cmdClean` is unchanged and its existing tests in `commands/clean.test.ts` (5 green) cover its behavior.
- **AC-6 (clean-decline aborts):** **PASS** — composition test at `commands/state.test.ts:299-312` proves the state-diff signal works against the real `cmdClean` decline path.
- **AC-7 (cancel byte-identical state, zero commits):** **PASS structurally** — canonical-source bullet at `:28` explicitly forbids state changes / commits / branches. No TS code path on cancel = no test artifact. Per plan iter1 W-5: acknowledged coverage gap is acceptable because the behavior is purely descriptive and there is nothing to assert against.
- **AC-8 (steel update propagates):** **PASS partial** — agent-skill path verified by `src/command-installer.test.ts:41-50`. Claude-commands `copyFile` path out of scope per plan Phase 5d.
- **AC-9 (no existing test fails):** **PASS** — `npm test` 142/0/0 pre+post change. No snapshot updates needed.

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
