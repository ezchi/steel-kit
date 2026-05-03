# T7 — Forge Artifact (iteration 1)

## Files Changed
- `src/command-installer.test.ts` — added `readFileSync` and `resolve` imports (lines 2-3); added one new test in the existing `describe('renderAgentSkill')` block (lines 39-48).

## Key Decisions
- Single test reads the actual canonical source (not a synthetic fixture), passes through `renderAgentSkill('steel-specify.md', canonical)`, and asserts the FR-3 prompt string survives. This proves the agent-skill MD adaptation does NOT mangle the prompt text.
- Did not pursue Option B (temp-dir fixture for `installProjectCommands`) — explicitly out of scope per plan Phase 5d / tasks T7's coverage acknowledgment.
- Kept the assertion to one substring; covering more strings would just duplicate T5's coverage of the canonical source itself.

## Deviations from Plan
None.

## Tests Added
1 test:
- `preserves the FR-3 prompt string from steel-specify.md (FR-8 propagation)` — reads canonical source, runs `renderAgentSkill`, asserts FR-3 prompt is preserved.

## Test Results
`npx vitest run src/command-installer.test.ts` — **4 tests passed (1 file, 0 failures)**.
- 3 pre-existing tests still green.
- 1 new test green.

## Covers
AC-8 (partial — `.agents/skills/` propagation path), NFR-5 row "FR-8" (partial). The Claude-commands path (`installClaudeCommands` via `copyFile`) is out of scope per tasks T7 / plan Phase 5d.
