# T3 — Forge Artifact (iteration 1)

## Files Changed
- `commands/state.test.ts` — added `execSync` import (line 5); added new `describe('cmdStateReset')` block at end of file (4 tests).

## Key Decisions
- New `describe` block has its own `beforeEach`/`afterEach` lifecycle rather than reusing the outer one. The outer block uses both `cwdSpy` and `stdoutSpy`; for `cmdStateReset` only `cwdSpy` is needed (we don't capture stdout). Smaller setup keeps each `it` focused.
- Test #4 (git tags preserved) inlines the git init / config / tag setup rather than reusing `commands/clean.test.ts`'s `initGitRepo` helper. Reasoning: the helper lives in a sibling test file and importing across test files would couple the two; the 5-line inline setup is clearer in context. Per gauge W-3 the choice was either approach — picked inline.
- Test #1 asserts byte-identical equality with `JSON.stringify(createInitialState(), null, 2)` — **no trailing newline**, matching `src/workflow.ts:264`. This was the iter1-gauge B-1 fix point; honored.

## Deviations from Plan
None for the test contents. Minor implementation choice: inline git setup (5 lines) instead of importing `initGitRepo` from `commands/clean.test.ts`. The plan said "Mirror `commands/clean.test.ts:45-52`'s `initGitRepo(dir, branch?)` helper if reusable; otherwise inline the git init." — chose inline. Equivalent outcome.

## Tests Added
4 tests in `describe('cmdStateReset')`:
1. **byte-identical state.json** — writes `JSON.stringify(createInitialState(), null, 2)` exactly (no trailing newline).
2. **specs/<id>/ untouched** — pre-write `specs/001-foo/spec.md` with content; after reset, file exists with original content.
3. **.steel/tasks.json untouched** — pre-write `.steel/tasks.json`; after reset, file exists with original content.
4. **git tags preserved** — git init + commit + tag `steel/001-foo/specification-complete`; after reset, `git tag -l "steel/001-foo/*"` returns the tag.

## Test Results
`npx vitest run commands/state.test.ts` — **13 tests passed (1 file, 0 failures)**.
- 9 pre-existing tests still green.
- 4 new tests all green.

## Covers
NFR-5 row "FR-4" (reset shape, dir/tasks/tags preservation).
