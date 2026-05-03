# T4 — Forge Artifact (iteration 1)

## Files Changed
- `commands/state.test.ts` —
  1. Added top-of-file hoisted `vi.mock('../src/utils.js', ...)` block (mirrors `commands/clean.test.ts:9-18` with the union of `log` keys and `die`-throw preservation).
  2. Added 3 new describe blocks at end:
     - `describe('FR-4 reset shape (composition)')` — 1 AC-4 test.
     - `describe('FR-5 decline detection (composition)')` — 1 AC-6 test using mocked `confirm`.
     - `describe('FR-7 Previous Spec ID line placement')` — 4 tests for the placement validator helper.

## Key Decisions
- **Hoisted `vi.mock`:** placed at top-of-file scope so all test imports of `../src/utils.js` (including the dynamic `import('./clean.js')` chain) see the mock. Verified existing 13 tests do not assert on `log` output (only on `captured` from `stdoutSpy`); they pass unchanged.
- **`log` key set:** included `{info, warn, success, debug, step, error}` — union of `clean.test.ts:9-18`'s set and Steel-Kit's actual `log` API (covers gauge iter1 N-1).
- **`die`-throw preservation:** mock's `die: (msg) => { throw new Error(msg) }` matches the real `die`'s exit semantics so any inadvertent validation throw still surfaces.
- **`confirmMock.mockResolvedValue(false)`** (per gauge iter1 W-1; used `mockResolvedValue` rather than `mockReturnValue` for parity with `clean.test.ts:77`).
- **No git-ops mock needed:** `cmdClean` returns at `clean.ts:48` before reaching `commitStep` when `confirm` returns false (per gauge iter1 W-2).
- **`findPreviousSpecIdPlacement` helper:** local to test file (not exported); 4-case test set (absent, correctly placed, misplaced-after, misplaced-before).

## Deviations from Plan
None for the test contents.
- Plan listed 3 placement-validator tests; implemented 4 (added an extra "misplaced-before" case for symmetry with "misplaced-after"). Adds coverage with no scope drift.
- The `FR-4 reset shape (composition)` describe overlaps slightly with T3's tests #1 and #2 (acknowledged in plan: "Some redundancy with T3 is acceptable"). One AC-4-framed test added; not duplicated wholesale.

## Tests Added
6 tests across 3 describe blocks:
1. **FR-4 composition:** AC-4 — reset preserves prior spec dir while writing fresh state.
2. **FR-5 composition:** AC-6 — declined `/steel-clean` leaves `state.specId` unchanged.
3. **FR-7 placement (4 tests):** absent / correctly-placed / misplaced-after / misplaced-before.

## Test Results
`npx vitest run commands/state.test.ts` — **19 tests passed (1 file, 0 failures)**.
- 9 pre-existing tests (state helper subcommands) — green with hoisted `vi.mock`.
- 4 T3 tests (cmdStateReset) — green.
- 6 T4 tests (composition + placement) — green.

## Covers
AC-4, AC-6, NFR-5 rows "FR-4", "FR-5", "FR-7".
