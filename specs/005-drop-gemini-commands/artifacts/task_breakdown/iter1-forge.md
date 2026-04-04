# Tasks: 005-drop-gemini-commands

## Task 1: Remove Gemini TOML pipeline from `src/command-installer.ts`

**FR**: FR-1, FR-2
**Files**: `src/command-installer.ts`
**Dependencies**: None

### Steps:
1. Delete `installGeminiCommands()` function (lines 75-93)
2. Delete `renderGeminiCommandToml()` export (lines 117-130)
3. Delete `adaptMarkdownForGemini()` helper (lines 141-143)
4. Delete `toTomlString()` helper (lines 171-173)
5. Remove `gemini` field from `CommandInstallResult` interface (line 8)
6. Remove the Gemini `attemptInstall()` call from `installProjectCommands()` (lines 33-37)
7. Remove `gemini: geminiCount` from the return object
8. Preserve `extractDescription()` — shared with agent skill renderer (CL-1)

### Done when:
- No Gemini-specific functions remain in the file
- `CommandInstallResult` has only `claude`, `codex`, and `warnings` fields
- TypeScript compiles without errors

---

## Task 2: Make shared surface provider-neutral in `src/command-installer.ts`

**FR**: FR-2
**Files**: `src/command-installer.ts`
**Dependencies**: Task 1

### Steps:
1. Rename `renderCodexSkill()` → `renderAgentSkill()` and update its export
2. Rename `adaptMarkdownForCodexSkill()` → `adaptMarkdownForAgentSkill()`
3. In `adaptMarkdownForAgentSkill()`: remove the `.replace(/\/steel-/g, '$steel-')` line, keep only the `$ARGUMENTS` replacement
4. In `renderAgentSkill()`: update wrapper text from `"Use this skill when the user invokes \`$${stem}\` or asks to run the corresponding Steel-Kit workflow step in Codex."` to `"Use this skill when the user invokes \`/${stem}\` or asks to run the corresponding Steel-Kit workflow step."`

### Done when:
- No `$steel-` references in rendered output
- No "Codex" or "in Codex" in rendered output
- `/steel-` prefixes preserved in output
- TypeScript compiles

---

## Task 3: Add stale file cleanup to `commands/init.ts`

**FR**: FR-3
**Files**: `commands/init.ts`
**Dependencies**: Task 1

### Steps:
1. Remove Gemini count from installation summary log message
2. Remove `.gemini/commands` from `writtenPaths` array
3. Remove any user-facing messaging referencing `.gemini/commands/`
4. Add cleanup: glob for `.gemini/commands/steel-*.toml` in project root, delete matches, log count if > 0

### Done when:
- Init summary does not mention Gemini command counts
- `.gemini/commands` not in writtenPaths
- Stale TOML files are deleted on init

---

## Task 4: Add stale file cleanup to `commands/update.ts`

**FR**: FR-4
**Files**: `commands/update.ts`
**Dependencies**: Task 1

### Steps:
1. Update pre-summary log line — remove "Gemini CLI" from surface list
2. Remove Gemini count from update summary log
3. Add cleanup: glob for `.gemini/commands/steel-*.toml` in project root, delete matches, log count if > 0

### Done when:
- Update log does not mention "Gemini CLI" or Gemini command counts
- Stale TOML files are deleted on update

---

## Task 5: Update doctor health checks in `src/doctor.ts`

**FR**: FR-5
**Files**: `src/doctor.ts`
**Dependencies**: Task 2 (import rename)

### Steps:
1. Remove import of `renderGeminiCommandToml`
2. Update import of `renderCodexSkill` → `renderAgentSkill`
3. Remove the Gemini surface drift check block in `checkSurfaces()` (lines 561-574)
4. Verify Gemini remains in `checkProviders()` and `checkAuth()` arrays

### Done when:
- No `renderGeminiCommandToml` import
- No Gemini surface drift diagnostics emitted
- Gemini still in provider/auth checks
- TypeScript compiles

---

## Task 6: Update canonical resource files and documentation

**FR**: FR-7
**Files**: `resources/commands/*.md`, `README.md`, `docs/*`
**Dependencies**: None (can run in parallel with Tasks 1-5)

### Steps:
1. Search `resources/commands/*.md` for `.gemini/commands/` — update to mention only `.claude/commands/` and `.agents/skills/`
2. Search `resources/commands/*.md` for hardcoded `$steel-` references — replace with `/steel-`
3. Search `README.md` for `.gemini/commands/` — remove as installation target, document `.agents/skills/` as shared surface
4. Search `docs/` for `.gemini/commands/` — update if found

### Done when:
- No `.gemini/commands/` references in `resources/commands/`, `README.md`, or `docs/`
- No `$steel-` references in canonical command sources (except `$ARGUMENTS` which is a different pattern)

---

## Task 7: Update existing tests

**FR**: FR-6
**Files**: `src/command-installer.test.ts`, `commands/init.test.ts`
**Dependencies**: Tasks 1, 2

### Steps:
1. In `src/command-installer.test.ts`: update import `renderCodexSkill` → `renderAgentSkill`
2. Update assertion: expect `/steel-` prefixes in output (not `$steel-`)
3. Add test: `renderAgentSkill()` output contains no "in Codex" or `$steel-` references
4. In `commands/init.test.ts`: update mock return values to remove `gemini` field from `CommandInstallResult`

### Done when:
- All existing tests pass with updated imports/assertions
- New agent skill tests pass

---

## Task 8: Add new tests for cleanup and doctor behavior

**FR**: FR-6
**Files**: `src/command-installer.test.ts`, `commands/init.test.ts`, `commands/update.test.ts` (create)
**Dependencies**: Tasks 3, 4, 5

### Steps:
1. In `src/command-installer.test.ts`: add test that `installProjectCommands()` does NOT create `.gemini/commands/`
2. In `commands/init.test.ts`: add test that init cleans up stale `.gemini/commands/steel-*.toml` files
3. In `commands/init.test.ts`: add test that init summary log does not mention Gemini
4. Create `commands/update.test.ts`:
   - Test that update cleans up stale `.gemini/commands/steel-*.toml` and logs count
   - Test that pre-summary log does not mention "Gemini CLI"
   - Test that summary log does not mention Gemini command counts
5. Add/update doctor test: `runDoctor()` does not emit `surface-missing` or `surface-stale` for `.gemini/commands/`

### Done when:
- All new tests pass
- `npm test` passes

---

## Task 9: Build verification and AC-8 grep

**FR**: AC-6, AC-7, AC-8
**Files**: None (verification only)
**Dependencies**: All previous tasks

### Steps:
1. `npm run build` — verify TypeScript compiles
2. `npm run lint` — verify no lint errors
3. `npm test` — all tests pass
4. Run `grep -r '.gemini/commands/' src/ commands/ resources/commands/ docs/ README.md` — verify zero hits (AC-8)
5. Grep for `gemini` in `src/config.ts` — verify it remains in PROVIDERS array (AC-7)
6. Grep for `gemini` in `src/doctor.ts` `checkProviders()` and `checkAuth()` — verify present (AC-7)

### Done when:
- Build, lint, tests all green
- AC-8 grep returns zero hits
- AC-7 provider verification passes
