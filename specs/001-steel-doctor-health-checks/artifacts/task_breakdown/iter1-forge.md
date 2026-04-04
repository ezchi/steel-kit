# Task Breakdown: steel doctor

## Task 1: Export `renderGeminiCommandToml` from command-installer.ts

**Description**: Add `export` keyword to the existing `renderGeminiCommandToml` function in `src/command-installer.ts` so the doctor module can import it for staleness detection.

**Files to modify**:
- `src/command-installer.ts` (add `export` to function declaration at line 117)

**Dependencies**: None

**Verification**:
- `npm run build` succeeds
- `npm test` passes (existing `command-installer.test.ts` still works)
- `renderGeminiCommandToml` is importable from `src/command-installer.js`

---

## Task 2: Create `src/doctor.ts` with types and diagnostic runner

**Description**: Create the core diagnostic engine with `Diagnostic` and `DoctorResult` types, the severity matrix as a data structure, and the `runDoctor()` function skeleton that orchestrates check functions and aggregates results.

**Files to create**:
- `src/doctor.ts`

**Dependencies**: Task 1 (needs rendering function exports available)

**Verification**:
- Types `Diagnostic`, `DoctorResult` exported
- `runDoctor(projectRoot)` callable and returns a `DoctorResult` with empty diagnostics
- Severity matrix maps all 21 check IDs from FR-27

---

## Task 3: Implement init and constitution checks

**Description**: Implement check functions for FR-4 (`.steel/` dir, `config.json`, `constitution.md`, `.gitignore`, corrupt `state.json`) and FR-5 (placeholder constitution detection). Handle `loadConfig` failures gracefully (emit `init-config` diagnostic, don't crash).

**Files to modify**:
- `src/doctor.ts` (add check functions, wire into `runDoctor`)

**Dependencies**: Task 2

**Verification**:
- In uninitialized repo: returns `fail` diagnostics for missing `.steel/` items
- With placeholder constitution: returns `fail` for `constitution-ready`
- With corrupt `state.json`: returns `fail` for `init-state-corrupt` (not a crash)
- With corrupt `config.json`: returns `fail` for `init-config` (not a crash)

---

## Task 4: Implement drift detection and stage file checks

**Description**: Implement FR-6 (five drift sub-rules for `state.specId`, `state.branch`, git branch, spec directory) and FR-7 (cumulative stage file prerequisites with prior/current severity split). Also implement FR-8 (state recovery detection from git tags and spec files).

**Files to modify**:
- `src/doctor.ts` (add check functions, wire into `runDoctor`)

**Dependencies**: Task 3 (init checks must run first to ensure state is loadable)

**Verification**:
- With `state.specId: '001-example'` on branch `spec/002-other`: `drift-specid-branch` `fail`
- With `state.branch` differing from current git branch: `drift-state-branch` `warn`
- With missing spec directory: `drift-specid-dir` `fail`
- At `planning` stage with `spec.md` missing: `stage-files-prior` `fail`
- At `planning` stage with `plan.md` missing: `stage-files-current` `warn`
- With `state.json` absent but `steel/specification-complete` tag present: `state-recovery` `warn`

---

## Task 5: Implement canonical source and surface staleness checks

**Description**: Implement FR-9 (`resources/commands/` existence, `prompts/` and `templates/` existence), FR-10 (generated surface presence per provider), FR-11/13 (staleness detection via in-memory rendering and byte-for-byte comparison). Normalize line endings before comparison to avoid false positives.

**Files to modify**:
- `src/doctor.ts` (add check functions, wire into `runDoctor`)

**Dependencies**: Task 1 (rendering function exports), Task 2 (runner skeleton)

**Verification**:
- With `resources/commands/` missing: `canonical-commands` `fail`
- With `prompts/` missing: `canonical-prompts` `warn`
- With one Claude command file deleted: `surface-missing` `fail`
- After editing a `resources/commands/*.md` file without running `steel update`: `surface-stale` `warn` for affected surfaces
- All surfaces current: `pass` diagnostics

---

## Task 6: Implement provider and auth checks

**Description**: Implement FR-14/15/16 (CLI availability via `which` for `codex`, `gemini`, `claude`) and FR-17 (env var checks for `ANTHROPIC_API_KEY`, `CODEX_API_KEY`/`OPENAI_API_KEY`, `GEMINI_API_KEY`). Configured providers get `fail` severity for missing CLI; unconfigured get `warn`.

**Files to modify**:
- `src/doctor.ts` (add check functions, wire into `runDoctor`)

**Dependencies**: Task 3 (needs config loaded to know which providers are configured)

**Verification**:
- With configured provider CLI missing: `provider-configured` `fail`
- With unconfigured provider CLI missing: `provider-unconfigured` `warn`
- With `ANTHROPIC_API_KEY` unset for Claude provider: `provider-auth` `warn`

---

## Task 7: Create `commands/doctor.ts` and wire CLI

**Description**: Create the command entrypoint with `cmdDoctor(opts)` supporting `--json` flag. Implement human-readable output formatter (grouped, colored, with summary line) and JSON output formatter. Wire into `src/cli.ts` with `program.command('doctor')`. Set exit code based on `result.status`.

**Files to create**:
- `commands/doctor.ts`

**Files to modify**:
- `src/cli.ts` (import and register doctor command)

**Dependencies**: Task 2 (needs `runDoctor` interface), Task 3-6 (check functions should be in place)

**Verification**:
- `steel doctor` runs and prints human-readable output
- `steel doctor --json` prints valid JSON matching `DoctorResult` schema
- Exit code 0 when no `fail`, exit code 1 when any `fail`
- Does not modify any files (FR-3)

---

## Task 8: Create `resources/commands/steel-doctor.md` and install surfaces

**Description**: Create the canonical command definition for `steel doctor`. Run `steel update` (or equivalent) to generate Claude, Gemini, and Codex surface files from it.

**Files to create**:
- `resources/commands/steel-doctor.md`

**Files generated** (by command installer):
- `.claude/commands/steel-doctor.md`
- `.gemini/commands/steel-doctor.toml`
- `.agents/skills/steel-doctor/SKILL.md`

**Dependencies**: Task 7 (command should work before creating the surface file)

**Verification**:
- Surface files are generated and match canonical source
- `steel doctor` itself reports no stale surfaces after installation

---

## Task 9: Write tests

**Description**: Write unit tests for `src/doctor.ts` check functions and integration tests for `commands/doctor.ts`. Test each severity matrix row. Test JSON output schema. Test error handling (corrupt state, missing config, git unavailable).

**Files to create**:
- `src/doctor.test.ts`

**Dependencies**: Tasks 1–8 (all implementation complete)

**Verification**:
- `npm test` passes
- Coverage of all 21 check IDs from the severity matrix
- JSON output schema validation test
- Corrupt state/config tests verify diagnostics, not crashes

---

## Task 10: Build, lint, and final verification

**Description**: Run `npm run build`, `npm run lint`, and `npm test` to verify everything compiles, passes lint, and passes tests. Verify `steel doctor` works end-to-end in the current project.

**Files to modify**: None (fix any issues found)

**Dependencies**: Task 9

**Verification**:
- `npm run build` succeeds
- `npm run lint` passes
- `npm test` passes
- `steel doctor` in current project produces correct output
- `steel doctor --json` produces valid JSON
