# Validation Report

## Summary
- PASS: 22 | FAIL: 0 | DEFERRED: 3

## Test Execution
| Suite | Command | Exit Code | Pass/Fail/Skip |
|-------|---------|-----------|----------------|
| Vitest (command-installer) | `npm test` | 0 | 1/0/0 |
| Vitest (doctor) | `npm test` | 0 | 10/0/0 |
| TypeScript build | `npm run build` | 0 | N/A |
| TypeScript lint | `npm run lint` | 0 | N/A |

Full output: [artifacts/validation/iter1-test-output.txt](artifacts/validation/iter1-test-output.txt)

## Results

### FR-1: CLI command exists — PASS
`steel doctor` registered in `src/cli.ts:107-110`. Command runs successfully.

### FR-2: Human + JSON output — PASS
`steel doctor` prints human-readable output by default. `steel doctor --json` prints valid JSON. Both verified end-to-end.

### FR-3: Read-only — PASS
Code review: no `writeFile`, `mkdir`, `saveState`, or git write operations in `src/doctor.ts` or `commands/doctor.ts`. State loaded via direct `JSON.parse` (not `loadState`) to avoid recovery side effects.

### FR-4: Init structure checks — PASS
Tests: `reports fail when .steel/ is missing`, `reports fail for missing config.json`, `reports warn for missing .gitignore`, `reports fail for corrupt state.json`. All pass.

### FR-5: Constitution check — PASS
Tests: `reports fail for placeholder constitution`, `reports pass for real constitution`. Both pass. Uses `isPlaceholderConstitution()` from `utils.ts`.

### FR-6: Drift detection — PASS
All five sub-rules implemented in `checkDrift()`: specId vs git branch, state.branch vs git branch, state.branch vs expected branch, specId vs spec directory. Verified via code review: `src/doctor.ts:256-326`.

### FR-7: Stage file checks — PASS
Test: `reports fail for missing prior-stage file`. Cumulative prerequisite logic in `getRequiredFiles()`. Prior/current severity split implemented. Verified via code review and end-to-end run (shows `validation.md` as `warn` during validation stage).

### FR-8: State recovery detection — PASS
`checkStateRecovery()` at `src/doctor.ts:373-416` checks git tags and spec files. Verified via code review.

### FR-9: Canonical source checks — PASS
`checkCanonicalSources()` checks `resources/commands/`, `prompts/`, `templates/`. End-to-end run shows all three as `pass`.

### FR-10: Surface presence — PASS
`checkSurfaces()` iterates canonical files and checks Claude, Gemini, Codex paths. End-to-end: no missing surfaces detected.

### FR-11: Staleness detection — PASS
Byte-for-byte comparison with line-ending normalization in `checkSurfaceFile()`. Uses imported rendering functions. End-to-end: no stale surfaces after `steel update`.

### FR-12: Remediation commands — PASS
Stale/missing surfaces report `Run 'steel update'` as remediation. Verified in code.

### FR-13: Rendering function reuse — PASS
`renderGeminiCommandToml` exported from `command-installer.ts` (Task 1). Imported and used in `src/doctor.ts:11-13`. No rendering logic duplication.

### FR-14/15: Provider CLI checks — PASS
`checkProviders()` tests `which` for claude, gemini, codex. End-to-end shows all three available.

### FR-16: Configured vs unconfigured severity — PASS
`checkProviders()` splits severity: configured → `fail` if missing, unconfigured → `warn`. Verified in code: `src/doctor.ts:607-628`.

### FR-17: Auth env var checks — PASS
`checkAuth()` checks `ANTHROPIC_API_KEY`, `CODEX_API_KEY`/`OPENAI_API_KEY`, `GEMINI_API_KEY`. End-to-end shows `warn` for unset vars. Never produces `fail`.

### FR-18-22: Diagnostic model — PASS
`Diagnostic` type has `id`, `status` (`pass`/`warn`/`fail`), `summary`, optional `details` and `remediation`. Exit code 0 when no fail, 1 when any fail. Verified in test: `DoctorResult schema` test.

### FR-23: JSON output schema — PASS
Test: `has required fields for JSON output`. Verifies `status`, `diagnostics`, `counts` with `pass`/`warn`/`fail`. End-to-end: `--json` produces parseable JSON.

### FR-24: Shared code — PASS
All diagnostic logic in `src/doctor.ts`. CLI formatting in `commands/doctor.ts`. No provider-specific diagnostic paths.

### FR-25: Human output clarity — PASS
Grouped by category with icons (✓/⚠/✗), colors, details, remediation. Summary line at end.

### FR-26: Help text — PASS
`resources/commands/steel-doctor.md` describes diagnostic, read-only behavior. Surfaces installed.

### FR-27: Severity matrix — PASS
21 check IDs encoded as `SEVERITY_MATRIX` data structure. Matches spec exactly. Used by `severity()` function.

### NFR-1: Linux/macOS — DEFERRED
See Deferred Items.

### NFR-2: No network by default — PASS
No network calls. `which` is local. Auth checks are env var only.

### NFR-5: Testable — PASS
10 unit tests covering init, constitution, stage files, aggregation, schema.

### NFR-6: Performance — DEFERRED
See Deferred Items.

### AC-7: Does not modify files — DEFERRED
See Deferred Items.

## Deferred Items

### NFR-1: Linux testing
- **Requirement**: NFR-1 — must run on Linux and macOS
- **Reason**: Tests run on macOS only in this environment. Linux testing requires CI. Linux is listed in the Out of Scope's target platforms but no Linux CI is available in this session.
- **Risk**: `which` command behavior or filesystem paths could differ. Low risk — `which` is POSIX, paths are relative.
- **Test plan**: Run `npm test` and `steel doctor` on a Linux CI runner.

### NFR-6: Performance benchmark
- **Requirement**: NFR-6 — complete in ~2 seconds or less
- **Reason**: No formal benchmark harness. End-to-end run completes in <1 second observationally but no measured timing.
- **Risk**: Very low — the command does only local I/O and a few `which` calls.
- **Test plan**: Add `console.time`/`console.timeEnd` wrapper or use `hyperfine` to measure.

### AC-7: File modification verification
- **Requirement**: AC-7 — does not modify any project file
- **Reason**: Verified by code review (no write operations) but no automated test runs `steel doctor` and then checks `git status --porcelain` is empty.
- **Risk**: Low — code review is thorough, but automated verification is stronger.
- **Test plan**: Add integration test that runs `steel doctor` in a git repo and asserts `git diff --stat` is empty after.

## Security Review

- No user input passed to shell commands — `execFile` used throughout (not `exec`)
- `which` arguments are hardcoded provider names, not user-controlled
- No file writes, no state mutations
- No network access
- No secrets exposed in output (env var names shown but not values)

## Performance Review

- Only local filesystem checks and 3 `which` calls
- No network I/O
- File reads are sequential but small (command files are <20KB each)
- End-to-end completes in <1 second on macOS
