# Implementation Plan: 005-drop-gemini-commands

## Approach

This is a removal-first change. The implementation order prioritizes removing Gemini-specific code first, then adapting the shared surface, then updating consumers, then adding tests. This order minimizes the chance of leaving stale references.

## Phase 1: Core Removal (`src/command-installer.ts`)

**Goal**: Remove all Gemini TOML rendering code and adapt the shared surface.

1. Delete `installGeminiCommands()` function (lines 75-93)
2. Delete `renderGeminiCommandToml()` export (lines 117-130)
3. Delete `adaptMarkdownForGemini()` helper (lines 141-143)
4. Delete `toTomlString()` helper (lines 171-173)
5. Remove `gemini` field from `CommandInstallResult` interface (line 8)
6. Remove the Gemini `attemptInstall()` call from `installProjectCommands()` (lines 33-37)
7. Preserve `extractDescription()` (shared with agent skill renderer)
8. In `adaptMarkdownForCodexSkill()` → rename to `adaptMarkdownForAgentSkill()`:
   - Remove the `/steel-` → `$steel-` replacement (line 168)
   - Keep the `$ARGUMENTS` → `the user-provided input` replacement
9. Rename `renderCodexSkill()` → `renderAgentSkill()`:
   - Update wrapper text from `"Use this skill when the user invokes \`$${stem}\` or asks to run the corresponding Steel-Kit workflow step in Codex."` to `"Use this skill when the user invokes \`/${stem}\` or asks to run the corresponding Steel-Kit workflow step."`
10. Update the export of `renderCodexSkill` → `renderAgentSkill` (used by doctor.ts)

## Phase 2: Consumer Updates

### 2a. `commands/init.ts`

1. Remove Gemini count from summary log (line 236)
2. Remove `.gemini/commands` from `writtenPaths` (line 248)
3. Update user-facing messaging that references `.gemini/commands/`
4. Add cleanup function: glob `.gemini/commands/steel-*.toml`, delete matches, log count

### 2b. `commands/update.ts`

1. Update pre-summary log line — remove "Gemini CLI" (line 13)
2. Remove Gemini count from summary log (line 16)
3. Add same cleanup function as init (or extract shared helper)

### 2c. `src/doctor.ts`

1. Remove import of `renderGeminiCommandToml` (line 12)
2. Update import of `renderCodexSkill` → `renderAgentSkill`
3. Remove Gemini surface drift check block in `checkSurfaces()` (lines 561-574)
4. Keep Gemini in `checkProviders()` and `checkAuth()` (provider is still supported)

## Phase 3: Resource and Documentation Updates (FR-7)

1. Search `resources/commands/*.md` for `.gemini/commands/` references — update to mention only `.claude/commands/` and `.agents/skills/`
2. Search `README.md` — remove `.gemini/commands/` references, document `.agents/skills/` as shared surface
3. Search `docs/` — update any `.gemini/commands/` references

## Phase 4: Tests (FR-6)

### Existing test updates:
1. `src/command-installer.test.ts` — update import of `renderCodexSkill` → `renderAgentSkill`, update assertion for `$steel-` → `/steel-`
2. Init/update test mocks — remove `gemini` field from `CommandInstallResult`

### New tests:
1. `installProjectCommands()` does not create `.gemini/commands/`
2. `renderAgentSkill()` output preserves `/steel-` prefixes
3. `renderAgentSkill()` output contains no Codex-specific guidance ("in Codex", `$steel-`)
4. Cleanup behavior: init deletes stale `.gemini/commands/steel-*.toml`
5. Cleanup behavior: update deletes stale `.gemini/commands/steel-*.toml` and logs count
6. Doctor does not emit Gemini surface diagnostics
7. Init/update log output has no Gemini command counts

## Phase 5: Build Verification

1. `npm run build` — verify TypeScript compiles (interface change)
2. `npm run lint` — verify no lint errors
3. `npm test` — all tests pass

## Risk Mitigation

- **Risk**: Codex LLM may echo `/steel-plan` literally instead of `$steel-plan`
  - **Mitigation**: Manual smoke-test after implementation (per CL-4). This is cosmetic, not functional.
- **Risk**: Stale `.gemini/commands/` references missed in resource files
  - **Mitigation**: AC-8 repo-wide grep verification as final gate.

## File Change Summary

| File | Action |
|------|--------|
| `src/command-installer.ts` | Remove 4 functions, rename 2, update interface |
| `commands/init.ts` | Remove Gemini logging, add cleanup |
| `commands/update.ts` | Remove Gemini logging, add cleanup |
| `src/doctor.ts` | Remove Gemini surface check, update import |
| `src/command-installer.test.ts` | Update existing, add new tests |
| `resources/commands/*.md` | Remove `.gemini/commands/` references |
| `README.md` | Update installation surface docs |
| `docs/*` | Update if applicable |
