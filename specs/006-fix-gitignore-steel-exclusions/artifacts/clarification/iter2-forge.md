# Clarification — Iteration 2

## Ambiguity Analysis

### 1. Order of `.gitignore` entries matters for negation patterns

**Resolution:** The `!` negation patterns must appear after `.steel/*`. FR-1 lists them correctly. No spec change needed.

### 2. `git rm --cached` with empty file lists (edge cases)

**Question:** What happens when `git ls-files` returns no matching files for `git rm --cached`?

**Resolution:** If the repository has no tracked steel-generated files (e.g., a fresh clone after this change is merged, or a repo that never ran `steel-init`), `git ls-files` filtering will return an empty list. The implementation MUST handle this gracefully:
- If no files match the filter, skip the `git rm --cached` step entirely (no-op).
- Do NOT pass an empty argument list to `git rm --cached` (it would error).
- Partial matches are fine — only untrack what exists in the index.

**Spec impact:** FR-3 should be clarified: "If no tracked files match the patterns, this step is a no-op." Adding to spec.

### 3. `steel-init` re-run regresses `.steel/.gitignore` content

**Question:** `commands/init.ts:54-60` writes the old `.steel/.gitignore` content (`state.json\ntasks.json`). If a user re-runs `steel-init` and allows overwrite, this regresses FR-2's defense-in-depth.

**Resolution:** This is a real concern but is **accepted as out-of-scope** for this spec. Rationale:
- This spec's scope is `.gitignore` rules only, not `steel-init` behavior changes.
- The root `.gitignore` (FR-1) is the primary defense and is not affected by `steel-init` re-runs (init doesn't modify root `.gitignore`).
- `.steel/.gitignore` (FR-2) is defense-in-depth — even if regressed, root `.gitignore` still prevents tracking.
- A follow-up spec should update `commands/init.ts` to write the new wildcard-based `.steel/.gitignore` content.

**Spec impact:** Adding explicit note to Out of Scope section.

### 4. Test fixtures seeding old `.steel/.gitignore` content

**Question:** `doctor.test.ts` and `clean.test.ts` both seed `.steel/.gitignore` with `'state.json'` in their temp directories. Will changing production `.steel/.gitignore` break these tests?

**Resolution:** These test fixtures create isolated temp directories and write their own `.steel/.gitignore` content. They don't read from the repo's actual `.steel/.gitignore`. The tests verify doctor/clean behavior in controlled environments — the fixture content is the test's own setup, not a mirror of production.

However, the fixture content (`'state.json'`) doesn't match the new production content. This is **not a breaking change** because:
- No test asserts that `.steel/.gitignore` has specific content matching production.
- The doctor check (`src/doctor.ts:192`) only verifies the file _exists_, not its content.
- Tests will pass without changes.

If a future test validates `.steel/.gitignore` content parity with production, that test would need updating. But no such test exists today.

**Spec impact:** Updating V-9 to be more precise about test fixture expectations.

### 5. Specs directory files

**Resolution:** `specs/` is intentionally tracked per constitution auditability requirements. No change needed.

## Spec Changes

The following targeted changes are applied to `spec.md`:

1. **FR-3**: Add graceful handling clause for empty file lists.
2. **Out of Scope**: Add note about `steel-init` `.gitignore` writer regression.
3. **V-9**: Clarify that test fixtures are independent of production content and tests pass without changes.
