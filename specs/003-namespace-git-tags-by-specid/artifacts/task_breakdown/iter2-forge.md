# Tasks: Namespace Git Tags by specId

## Task 1: Extract `resolveSpecId()` into `src/git-config.ts`

**Description**: Extract the branch-detection and specs-directory fallback logic from `recoverState()` (lines 153-173 of `src/workflow.ts`) into a new exported function `resolveSpecId()` in `src/git-config.ts`. Refactor `recoverState()` to call it. This is a pure refactor — no behavioral change.

**Files to modify**:
- `src/git-config.ts` — add `resolveSpecId(projectRoot, config): Promise<string | null>`
- `src/workflow.ts` — refactor `recoverState()` to use `resolveSpecId()`

**Dependencies**: None

**Verification**:
- `npm test` passes (existing recovery tests still pass)
- `npm run build` succeeds
- `resolveSpecId()` is exported from `src/git-config.ts`

---

## Task 2: Add `specId` parameter to `tagStage()` and update call site

**Description**: Add a leading `specId: string` parameter to `tagStage()` in `src/git-ops.ts`. Change the tag format from `steel/${stage}-complete` to `steel/${specId}/${stage}-complete`. Update the single call site in `advanceStage()` to pass `state.specId`.

**Files to modify**:
- `src/git-ops.ts` — modify `tagStage()` signature and tag format (line 92)
- `src/workflow.ts` — update `advanceStage()` call to `tagStage()` (line 290)

**Dependencies**: None

**Verification**:
- `npm run build` succeeds (no type errors from changed signature)
- Grep confirms no other callers of `tagStage()` were missed

---

## Task 3: Scope `getCompletedStagesFromTags()` by specId

**Description**: Add `specId: string` parameter to `getCompletedStagesFromTags()`. Change the git tag glob from `steel/*-complete` to `steel/${specId}/*-complete`. Update the regex from `/^steel\/(.+)-complete$/` to `/^steel\/[^/]+\/(.+)-complete$/`. Update `recoverState()` to pass specId (or skip tags if null).

**Files to modify**:
- `src/workflow.ts` — modify `getCompletedStagesFromTags()` (lines 218-232) and `recoverState()` (line 176)

**Dependencies**: Task 1 (needs `resolveSpecId()` in recoverState)

**Verification**:
- `npm run build` succeeds
- Recovery with known specId uses scoped tag pattern
- Recovery with null specId skips tag-based lookup

---

## Task 4: Scope tag cleanup in `commands/clean.ts`

**Description**: After `loadState()`, if `state.specId` is null, use `resolveSpecId()` for branch/specs-dir fallback. Use the resolved specId to scope tag deletion to `steel/<specId>/*-complete`. Fall back to `steel/*/*-complete` with a warning only if specId remains null. Update user-facing messages.

**Files to modify**:
- `commands/clean.ts` — lines 18-72 (specId resolution, tag pattern, user messages)

**Dependencies**: Task 1 (needs `resolveSpecId()`)

**Verification**:
- With known specId: only that spec's tags are deleted
- With null specId from state but resolvable from branch: scoped deletion
- With unresolvable specId: falls back to `steel/*/*-complete` with warning

---

## Task 5: Scope tag detection in `src/doctor.ts`

**Description**: Update `checkStateRecovery()` to use `resolveSpecId()` for specId-scoped tag pattern. If specId is resolved, check `steel/<specId>/*-complete`; otherwise check `steel/*/*-complete`. Spec-file scanning remains broad (deliberate divergence).

**Files to modify**:
- `src/doctor.ts` — `checkStateRecovery()` (lines 416-459)

**Dependencies**: Task 1 (needs `resolveSpecId()`)

**Verification**:
- Doctor with known specId uses scoped tag pattern
- Doctor with unknown specId uses broad pattern
- Spec-file check unchanged

---

## Task 6: Update and fix existing tests

**Description**: Update existing tests in `src/workflow.test.ts` and `src/doctor.test.ts` that reference the old tag format or are affected by the new function signatures. Fix any tests broken by Tasks 1-5.

**Files to modify**:
- `src/workflow.test.ts`
- `src/doctor.test.ts`

**Dependencies**: Tasks 1-5

**Verification**:
- `npm test` passes with all existing tests updated

---

## Task 7: Add new tests for namespaced tag behavior

**Description**: Add tests covering the new namespaced tag behavior:
- Tag creation produces `steel/<specId>/<stage>-complete` (AC-1)
- Multi-spec tag coexistence: create tags for specId A and specId B, verify both sets persist — `tagStage()` for B does not overwrite A's tags (AC-2)
- Recovery with known specId finds namespaced tags (AC-4)
- Recovery with null specId skips tag-based recovery (AC-5)
- Clean with known specId only deletes scoped tags, other spec's tags remain (AC-3)
- Clean with null specId resolves from branch fallback (AC-13)
- Legacy flat tags coexist with namespaced tags (AC-9)
- Doctor with branch-derived specId uses scoped pattern (AC-11)
- Doctor with no resolvable specId uses broad pattern (AC-12)
- Doctor detects namespaced tags as recoverable (AC-6)

**Files to modify**:
- `src/workflow.test.ts` — tag creation and recovery tests
- `src/doctor.test.ts` — doctor tag detection tests
- `commands/clean.test.ts` (new file) — scoped cleanup tests for `cmdClean()`

**Dependencies**: Tasks 1-5

**Verification**:
- `npm test` passes with all new tests
- Each AC listed above has at least one corresponding test

---

## Task 8: Update canonical command files

**Description**: Update all 8 canonical command files in `resources/commands/` to reference the new `steel/<specId>/<stage>-complete` tag format. Special attention to `steel-retrospect.md` which uses the tag in a `git log` rev range. Update `steel-clean.md` to describe scoped cleanup.

**Files to modify**:
- `resources/commands/steel-specify.md`
- `resources/commands/steel-clarify.md`
- `resources/commands/steel-plan.md`
- `resources/commands/steel-tasks.md`
- `resources/commands/steel-implement.md`
- `resources/commands/steel-validate.md`
- `resources/commands/steel-retrospect.md`
- `resources/commands/steel-clean.md`

**Dependencies**: None (documentation-only)

**Verification**:
- Grep for `steel/.*-complete` in `resources/commands/` returns only namespaced format
- No old flat format remains

---

## Task 9: Sync downstream provider artifacts and update README

**Description**: Run `steel update` to synchronize canonical command files to `.claude/commands/`, `.gemini/commands/`, and `.agents/skills/`. Update `README.md` tag format references.

**Files to modify**:
- `.claude/commands/` (auto-synced)
- `.gemini/commands/` (auto-synced)
- `.agents/skills/` (auto-synced)
- `README.md`

**Dependencies**: Task 8

**Verification**:
- Diff canonical vs downstream files — no old tag format remains
- `README.md` references `steel/<specId>/<stage>-complete`

---

## Task 10: Final verification

**Description**: Run full verification suite: `npm run lint`, `npm test`, `npm run build`. Fix any issues found.

**Files to modify**: Any files with lint/type/test issues

**Dependencies**: Tasks 1-9

**Verification**:
- `npm run lint` passes (AC-8)
- `npm test` passes (AC-7)
- `npm run build` succeeds
