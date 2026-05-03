# T5 — Forge Artifact (iteration 1)

## Files Changed
- `commands/state.test.ts` — added new `describe('canonical source contracts (resources/commands/steel-specify.md)')` block at end of file (5 tests).

## Key Decisions
- **Single-read-per-test pattern** via `beforeEach` that loads the canonical source once into `canonical: string`. Cheap (file is ~1.5 KB) and keeps each `it` focused on one assertion.
- **`readFileSync` + `__dirname` + `resolve('..')`** to locate `resources/commands/steel-specify.md` from the test file's location. Vitest provides `__dirname` in the test runtime even with `"type": "module"` in package.json.
- Used `expect(canonical).toContain(...)` — substring check, not regex — because the contract is verbatim wording, not pattern matching.
- For AC-3, asserted both `case-insensitive` AND `whitespace stripped` because they're both load-bearing parts of the normalization rule, and the canonical source has them on the same line.

## Deviations from Plan
None. 5 tests = 5 verbatim assertions per plan Phase 5b.

## Tests Added
5 tests in `describe('canonical source contracts (resources/commands/steel-specify.md)')`:
1. **AC-1** — contains the FR-3 prompt verbatim.
2. **AC-3** — contains both `case-insensitive` and `whitespace stripped`.
3. **FR-7** — contains `between **Spec ID:** and **Status:**`.
4. **FR-6** — contains `Cancelled. Previous workflow`.
5. **FR-5 step 4** — contains the abort message with em-dash (U+2014).

## Test Results
`npx vitest run commands/state.test.ts` — **24 tests passed (1 file, 0 failures)**.
- 9 pre-existing tests + 4 T3 + 6 T4 + 5 T5 = 24.

## Covers
AC-1, AC-3, NFR-5 rows "FR-3", "FR-6". Indirectly guards FR-5 abort message and FR-7 placement-rule prose against documentation drift.
