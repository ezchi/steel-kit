# Gauge Review — Planning Iteration 1

### [BLOCKING] Shared surface still inherits Codex-specific `$steel-` text from canonical sources
- **Location**: Phase 3
- **Issue**: The plan removes the automatic `/steel-` → `$steel-` rewrite, but does not update canonical command content that already contains `$steel-*`. `resources/commands/steel-init.md` line 15 hardcodes `$steel-constitution`. After the renderer change, that text will flow unchanged into SKILL.md.
- **Suggestion**: Add step to rewrite provider-specific command text in canonical resources to `/steel-*` wording.

### [BLOCKING] Test plan does not identify where `cmdUpdate()` behavior will be verified
- **Location**: Phase 4
- **Issue**: No existing `commands/update.test.ts` exists. Plan doesn't specify which test file will host update cleanup and logging tests.
- **Suggestion**: Add steps to create `commands/update.test.ts` and extend `commands/init.test.ts`.

### [WARNING] FR-7/AC-8 verification scope is underspecified
- **Location**: Phase 3
- **Issue**: Phase 3 only covers resource/doc files but AC-8 requires zero hits across `src/`, `commands/` too. Those references are removed by Phases 1-2 but should have an explicit verification step.
- **Suggestion**: Add a final verification step with exact AC-8 grep scope.

### [NOTE] Current line references are accurate
- No change needed.

VERDICT: REVISE
