# Clarifications: Namespace Git Tags by specId

## C-1: Full inventory of files referencing old tag format [SPEC UPDATE]

**Ambiguity**: FR-8 names only `steel-specify.md` and `steel-clean.md` in `resources/commands/`, with a catch-all "any other" clause. The actual scope is much larger.

**Resolution**: The complete inventory of files requiring updates is:

### Source code (4 files) — covered by FR-1 through FR-6:
- `src/git-ops.ts:96`
- `src/workflow.ts:219, 228`
- `src/doctor.ts:423`
- `commands/clean.ts:29, 57`

### Canonical command files in `resources/commands/` (8 files):
- `steel-specify.md:70` — `tag 'steel/specification-complete'`
- `steel-clarify.md:70` — `tag 'steel/clarification-complete'`
- `steel-plan.md:50` — `tag 'steel/planning-complete'`
- `steel-tasks.md:52` — `tag 'steel/task_breakdown-complete'`
- `steel-implement.md:103` — `tag 'steel/implementation-complete'`
- `steel-validate.md:144` — `tag 'steel/validation-complete'`
- `steel-retrospect.md:22, 108` — `git log` range and `tag 'steel/retrospect-complete'`
- `steel-clean.md:14, 22` — tag listing and cleanup

### Downstream provider artifacts (3 directories, auto-generated from canonical):
- `.claude/commands/` — 8 matching .md files
- `.gemini/commands/` — 8 matching .toml files
- `.agents/skills/` — 8 matching SKILL.md files

### Documentation:
- `README.md:260`

**Total: 41 distinct references across 33 files.**

FR-8 must be updated to enumerate all 8 canonical command files (not just 2), and explicitly note the `steel-retrospect.md` case which uses the tag in a `git log` range expression (`steel/specification-complete..HEAD`) — this needs special handling since the specId must be interpolated at runtime.

## C-2: Retrospect git-log range uses tag as a rev reference [SPEC UPDATE]

**Ambiguity**: `steel-retrospect.md` uses `git log --oneline steel/specification-complete..HEAD` as a rev range. This is not just a documentation string — it's a functional git command that must resolve an actual tag. With namespacing, this becomes `steel/<specId>/specification-complete..HEAD`.

**Resolution**: The command files instruct the LLM agent (not the TypeScript runtime) to run this git command. The LLM must substitute the specId at execution time. The canonical command file must be updated to use `steel/<specId>/specification-complete..HEAD` and note that specId comes from `state.json`. This is a command-file change only — no TypeScript code change needed.

## C-3: `steel update` regeneration is sufficient for downstream sync [NO SPEC CHANGE]

**Assumption**: FR-8 says "regenerate or synchronize downstream provider artifacts." The mechanism for this is the existing `steel update` command, which copies canonical `resources/commands/` files to `.claude/commands/`, `.gemini/commands/`, and `.agents/skills/`. After updating canonical sources, running `steel update` handles synchronization. No new sync tooling is needed.

## C-4: specId characters are safe for git tag paths [NO SPEC CHANGE]

**Assumption**: specId values like `003-namespace-git-tags-by-specid` contain only alphanumeric characters and hyphens. The format `steel/<specId>/<stage>-complete` produces valid git tag names. This is guaranteed by the existing specId generation logic (auto-increment + slugified name), so no additional validation is needed in `tagStage()`.

## C-5: `git tag -f` behavior preserved for re-runs [NO SPEC CHANGE]

**Assumption**: The `-f` (force) flag on `git tag` in `tagStage()` is kept. If a stage is re-run (e.g., after a failed advancement that was retried), the tag is silently overwritten for the same specId. This is correct behavior — the tag points to the latest completion of that stage for that spec.

## C-6: Clean command user-facing message update scope [NO SPEC CHANGE]

**Assumption**: FR-5 says "update the user-facing log message to include the specId when available." This refers to two messages in `commands/clean.ts`:
1. Line 29: `log.info('  - All steel/*-complete git tags (local only)')` → should show `steel/<specId>/*-complete` when specId is known
2. Line 71: `log.info(`Removed ${tags.length} git tag(s)`)` → could optionally include specId

No spec change needed — FR-5 already covers this.

## C-7: Test file updates [NO SPEC CHANGE]

**Assumption**: Existing tests in `tests/` that exercise tag creation, recovery, or clean behavior will need to be updated to expect the new namespaced format. This is implicitly covered by AC-7 (`npm test` passes) but is worth noting for implementation planning. The spec does not need a separate FR for test updates — tests follow the code.
