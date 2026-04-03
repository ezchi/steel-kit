# Tasks 1-7: Core doctor implementation — Forge Iteration 1

## Files Changed
- `src/command-installer.ts` — modified (exported `renderGeminiCommandToml`)
- `src/doctor.ts` — created (core diagnostic engine with all checks)
- `commands/doctor.ts` — created (CLI entrypoint with human/JSON output)
- `src/cli.ts` — modified (wired doctor command with `--json` option)

## Key Implementation Decisions
- Severity matrix encoded as a `SEVERITY_MATRIX` data structure in `src/doctor.ts` — single source of truth, matches FR-27
- Graceful error handling throughout: `loadConfig` and `state.json` parse wrapped in try/catch, git operations use safe wrappers that return null on failure
- Surface staleness uses line-ending normalization (`\r\n` → `\n`) before byte comparison to avoid false positives
- Pass diagnostics omitted for individual surface files to reduce output noise; only problems reported
- State loaded directly from JSON (not via `loadState`) to avoid triggering recovery side effects — doctor is read-only

## Deviations from Plan
- Tasks 1-7 implemented together rather than sequentially because they're tightly coupled code in a small number of files
- Used `execFile` from `node:child_process` instead of `execa` for `which` and `git` commands in doctor module to avoid coupling to the same process runner used by the workflow

## Tests Added
- None yet — deferred to Task 9
