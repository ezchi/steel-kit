# Gauge Review — Planning Iteration 2

## Summary

Iter2 cleanly resolves all three iter1 blockers (B-1 byte format corrected, B-2 FR-7 placement validator added in Phase 5a #3, B-3 FR-5 decline-detection composition test added in Phase 5a #2) and the warnings/notes. However, the W-3 fix (dropping the `--preserve-history` flag from `cmdStateReset` per Phase 2a #3 and Phase 2b) was applied inconsistently: Phase 4a's slash-command body still invokes `steel state reset --preserve-history`, and the Risks section at the bottom still describes `--preserve-history` as a "REQUIRED" flag. An Implement-stage agent following the plan literally would write a CLI with no flag and a slash command that passes that flag, causing Commander.js to error with "unknown option" at the runtime where /steel-specify hits step 0a-y. That single internal contradiction is a new blocker introduced by the iter2 revision.

## Issues

### BLOCKING

- **[B-1] `--preserve-history` flag inconsistency between Phase 2 and Phase 4a / Risks.** Phase 2a #3 explicitly drops the flag ("**No flags.**") and Phase 2b's CLI registration code passes only `cmdStateReset` with no `.option(...)` call. But Phase 4a's `0a-y: preserve-history reset` block instructs the slash command to run literal `steel state reset --preserve-history`, and the Risks section describes the flag as "REQUIRED (no default)." Commander.js errors on unknown options by default (no `allowUnknownOption()` exists in `src/cli.ts`), so the slash-command shellout would fail. Fix: change Phase 4a's body to plain `steel state reset` (no flag) and delete the corresponding Risks bullet, OR re-add the flag as a no-op `.option('--preserve-history', '...')` in Phase 2b. Pick one; current iter2 is not self-consistent.

### WARNING

- **[W-1] Phase 5a #2's mock guidance is ambiguous and risks breaking existing `state.test.ts` tests.** `vi.spyOn` does NOT work on ESM read-only named exports — that path is wrong. Implement should follow ONLY the `vi.mock` pattern (as in `commands/clean.test.ts:7-18`). Additionally, `vi.mock('../src/utils.js')` is hoisted to top-of-file and will affect ALL existing tests in `commands/state.test.ts`. The mock must preserve `die`'s throw behavior. Fix: drop the `vi.spyOn` alternative; explicitly tell Implement to mirror `clean.test.ts:9-18` verbatim including `die: (msg: string) => { throw new Error(msg); }`.

- **[W-2] Phase 5d Option A is technically correct but functionally weak coverage of FR-8.** Plan recommends a one-line `expect(rendered).toContain('A previous workflow')` added to the existing `renderAgentSkill` tests. (a) `renderAgentSkill` only feeds the agent-skills propagation path; the Claude-commands path (`installClaudeCommands` at `src/command-installer.ts:55-67`) uses `copyFile` directly and is not exercised by Option A. AC-8 explicitly mentions "the equivalent Gemini/Codex paths" alongside Claude. (b) The "one-line" framing understates the work — Implement still needs to `readFileSync` the canonical source and pass it to `renderAgentSkill`. Either accept the partial coverage and document it, or upgrade to Option B (temp-dir fixture for `installProjectCommands`).

### NOTE

- **[N-1] Phase 5c enumeration of test files is incomplete.** Plan lists 10 existing test files but omits `src/git-ops.test.ts`. `npm test` runs everything anyway — cosmetic.
- **[N-2] Phase 3b #4 (git tag preservation) is described as "optional" but is one of three NFR-5 FR-4 sub-bullets.** A 5-line check (`git init` + `git tag` + `cmdStateReset()` + `git tag --list` assertion) closes the gap.
- **[N-3] Phase 4a slash-command bash mixes `$()` and `[[ ]]` without naming the shell.** Consistent with existing `steel-specify.md` style; flag only because constitution NFR-4 is silent on shell version.
- **[N-4] Phase 5a #3's `findPreviousSpecIdPlacement` helper lives only in test code.** Plan acknowledges in Risks. If a future `/steel-validate` or doctor wants to verify produced spec.md compliance, the helper should move to `src/`.

## Strengths

- B-1 (byte format) is fixed precisely: Phase 3b #1 cites `src/workflow.ts:264` and matches `JSON.stringify(state, null, 2)` exactly with no trailing newline.
- B-2 (FR-7 placement) is now testable via the `findPreviousSpecIdPlacement` helper in Phase 5a #3 with three explicit cases.
- B-3 (FR-5 decline detection) gets a proper composition test in Phase 5a #2 that mocks `confirm` and asserts state remains byte-identical.
- W-2 (state.test.ts existence) is acknowledged with correct line citations.
- Phase 5b's verbatim-string contracts (5 assertions) directly mirror what Phase 4a inserts into `resources/commands/steel-specify.md`; substring matches all check out.
- All 7 NFR-5 test rows are mapped to phases (FR-1/FR-10 → 3a; FR-3 → 5b#1; FR-4 → 3b#1+#2 / 5a#1; FR-5 → 5a#2; FR-6 → 5b#4; FR-7 → 5a#3; FR-8 → 5d).
- C-1 through C-7 all respected.

## Verdict Reasoning

Iter2 cleanly resolves the three iter1 blockers, but the W-3 fix introduced a self-contradiction across Phase 2 (no flag), Phase 4a (uses `--preserve-history`), and Risks (declares the flag REQUIRED). One small edit (pick one resolution) makes this Implement-ready; without it, the plan is not.

VERDICT: REVISE
