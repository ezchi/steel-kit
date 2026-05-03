# Gauge Review — Task Breakdown Iteration 1

## Summary

Decomposition is well-grounded: cited file paths and line numbers (`src/workflow.ts:264`, `commands/state.test.ts:21-46/48-50/62`, `commands/clean.test.ts:9-18/45-52`, `src/cli.ts:225-228`, `src/command-installer.ts:91`) verify against the actual source. tasks.md and tasks.json are consistent in id/title/files/dependencies. The 8-task DAG is acyclic and minimal, and the strings T5 will assert verbatim are all present in T6's insertion text. Some warnings about test fidelity below, but an Implement agent could work T1..T8 in dependency order and reach a green test suite.

## Issues

### BLOCKING

(none)

### WARNING

- [W-1] T4 #2 says `confirmMock.mockReturnValue(false)` — `clean.ts:41` uses `await confirm(...)`, and `clean.test.ts:77` uses `mockResolvedValue(true)`. `await false === false` so the test still works, but suggest `mockResolvedValue(false)` for parity.
- [W-2] T4 #2 dynamically imports `./clean.js` without specifying a `git-ops` mock. Real `cmdClean` with `confirm` returning `false` returns at `clean.ts:48` before reaching `commitStep`, so unmocked git-ops is harmless **for this test path**. Suggest noting this explicitly so an Implement agent does not drift from clean.test.ts.
- [W-3] T3 #4 mixes `execa` (in description body) and `execSync`-via-`initGitRepo` (referenced from clean.test.ts). The Implement agent needs a single pick. Recommend pinning to `execSync` to match `workflow.test.ts:5` and `clean.test.ts:5`.
- [W-4] T4 hoists `vi.mock('../src/utils.js', ...)` at file scope, silently affecting every existing test in `commands/state.test.ts`. Verified by inspection: existing 9 tests assert on `process.stdout` capture and `readState` output, never on `log` output, so the mock is benign. Worth a note in the task itself rather than a hidden assumption.
- [W-5] AC-7's NFR-5 row ("cancel yields byte-identical state.json and zero new commits") is not directly tested anywhere in T1..T8. T5 #4 only asserts the cancel **message** appears in the canonical source, not behavior. Plan acknowledges LLM-interpreted contracts cannot be fully unit-tested; flagging because the gap is documented and the affected behavior is purely descriptive.

### NOTE

- [N-1] Plan-corrections section accurate. Spot-checked: `src/workflow.ts:264` no trailing newline; `commands/state.test.ts:21-46, 48-50` setupProject/readState as cited; `commands/clean.test.ts:9-18` vi.mock matches; `src/utils.ts:40-42` confirm is async ESM named export.
- [N-2] `commands/state.test.ts:62` uses `vi.spyOn(process, 'cwd')` rather than `process.chdir`. Both route `cmdClean`'s `process.cwd()` to `tempDir`, so T4's reuse works.
- [N-3] T3 #1 byte-identical comparison correctly omits trailing newline.
- [N-4] T6 inserts between current line 12 (`0. Run /clear`) and current line 14 (`1. Read state + config`). Numbering "0a" preserves all later step numbers without renumbering.
- [N-5] T5 #5's verbatim string includes em-dash (U+2014). T6's insertion uses the same character. If an editor normalizes em-dash, T5 would fail. Worth defensive note in T6.
- [N-6] T7 only covers `.agents/skills/` (renderAgentSkill path), not `installClaudeCommands` (copyFile direct). AC-8 partial coverage is spec-acknowledged trade-off.

## Strengths

- Every FR (1-10), every AC (1-8 with AC-9 by T8), every NFR-5 row maps to ≥1 task's `covers` field.
- Dependency graph is minimal and correct (T1/T2 independent; T3→T2; T5/T7→T6).
- Plan-corrections section is thorough; all 7 spot-checks pass against actual source.
- Provider parity (principle 3) satisfied: T6 edits ONLY `resources/commands/steel-specify.md`; T7 smokes propagation.
- Audit trail (principle 4) preserved via FR-7 placement validator in T4 #3.
- tasks.md and tasks.json byte-consistent on id/title/files/dependencies/covers.

## Verdict Reasoning

Decomposition is grounded, traceable, and dependency-correct. Warnings are sloppy edges resolvable through normal code review or by copying clean.test.ts patterns, not blocking issues. AC-7 coverage gap is acknowledged in plan risks. Implement-stage agent working T1..T8 in dependency order will produce a green test suite without rework.

VERDICT: APPROVE
