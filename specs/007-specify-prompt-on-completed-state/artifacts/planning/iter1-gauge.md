# Gauge Review — Planning Iteration 1

## Summary

The plan correctly maps the three surfaces (TS helper in `src/workflow.ts`, new `steel state reset --preserve-history` primitive, slash-command insertion of step `0a`) and respects C-1's "no `steel state classify` subcommand" mandate plus C-7's state-diff detection mechanism. Phase ordering (TS → CLI primitive → slash → tests → verify) is sound and minimum-rework. However, the plan contains a factual error about `saveState`'s on-disk byte format that would make a written test fail, and two NFR-5-mandated tests (FR-5 decline detection, FR-7 `Previous Spec ID:` placement) are missing from Phases 3 and 5. An Implement-stage agent following this plan as-written would produce a failing test in Phase 3b and an incomplete test matrix.

## Issues

### BLOCKING

- **[B-1] Phase 3b test #1 cites a wrong byte-format for `state.json`.** Plan states the post-reset file should be byte-identical to `JSON.stringify(createInitialState(), null, 2) + '\n'`. But `saveState` at `src/workflow.ts:264` calls `writeFile(getStatePath(projectRoot), JSON.stringify(state, null, 2))` — no trailing newline appended. An Implement agent following this plan literally will write a failing assertion. Fix: change the expected payload to `JSON.stringify(createInitialState(), null, 2)` (no `+ '\n'`).

- **[B-2] FR-7 placement contract has no concrete test, contradicting NFR-5.** Spec NFR-5 (`spec.md:157`) explicitly requires the `Previous Spec ID:` line placement test. Phase 4b delegates this to "the Forge LLM's responsibility" and Phase 5 provides no test.

- **[B-3] FR-5 decline-detection state-diff test is missing.** Spec NFR-5 (`spec.md:155`) explicitly requires this test. Phase 5a tests successful preserve-history reset; Phase 5b #2 tests cancel; nothing tests the clean-decline state-diff composition. The underlying primitive composition IS testable in TS (mock `confirm` to return `false`, then re-load state and assert `specId === previousSpecId`).

### WARNING

- **[W-1] Phase 5c understates the work for the `command-installer` smoke test.** `src/command-installer.test.ts` currently only imports and tests `renderAgentSkill` (a pure-string function). Asserting `installProjectCommands()` writes the FR-3 prompt to `.claude/commands/steel-specify.md` requires a temp-dir fixture, not a one-line assertion.

- **[W-2] Phase 3b incorrectly says `commands/state.test.ts` may not exist.** It does, with a `setupProject` temp-dir fixture. Direct Implement to extend it.

- **[W-3] Phase 2a's `cmdStateReset` `--preserve-history` flag is dead.** The body branches only on log wording. Either drop the flag or add a real branch.

### NOTE

- **[N-1] Phase 4a line citations are imprecise.** Cite "between line 12 (current step 0) and line 14 (current step 1)" only.
- **[N-2] Phase 3b cites `commands/clean.test.ts:24-54` as fixture source.** Actual span is roughly 30-67. Minor.
- **[N-3] Phase 5b #1's case-insensitive parsing helper test does not actually constrain LLM behavior.** Consider dropping or replacing with a verbatim-string assertion.
- **[N-4] Phase 6 manual smoke is "optional" but covers paths not unit-tested.** With B-2 + B-3 fixed, this becomes redundant.

## Strengths

- Correctly preserves `commands/clean.ts` boundary per FR-5.
- Phase ordering is sound: TS-first → slash command → tests → verify.
- C-1 honored; C-7 implemented at slash-command layer via state-diff.
- Risk section accurately surfaces LLM-interpreted-contract limitation and autoCommit-failure misclassification.
- Out-of-Plan deferrals match spec Out-of-Scope.

## Verdict Reasoning

Three blockers prevent direct execution: a wrong byte-format assertion (B-1), and two missing NFR-5-mandated tests (B-2, B-3). Each is a small fix but as-written the plan is not Implement-ready.

VERDICT: REVISE
