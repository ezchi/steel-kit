# Gauge Review: Specification 004-commit-only-constitution — Iteration 2

### [BLOCKING] Normalization rules still allow broken `.gitignore` states to survive
- **Section:** FR-4, FR-6, AC-3, AC-5
- **Issue:** The spec now defines legacy-pattern replacement, but it also says "If the correct block is already present (both lines exist), no changes are made" and the doctor check passes when both lines are merely present. Because `.gitignore` is order-sensitive, a repository can still be broken if a later legacy/conflicting rule such as `.steel/`, `.steel`, or `.steel/**` remains elsewhere in the file. In that state, `constitution.md` can still be ignored even though FR-6 would report `pass`.
- **Suggestion:** Define normalization and doctor validation in terms of effective behavior, not simple presence. Require `steel init` to remove all legacy/conflicting `.steel` root rules anywhere in the file, or explicitly define one canonical adjacent block and forbid any additional `.steel` root ignore rules. Update doctor to warn when conflicting `.steel` rules remain.

### [WARNING] Re-init staging behavior for `constitution.md` is still under-specified when no file change occurs
- **Section:** FR-5, AC-4
- **Issue:** The spec says re-init shall "stage `.steel/constitution.md` for commit," but it does not state what should happen if the file already exists and is already tracked with no content changes. That is harmless in git, but the acceptance language reads like a visible staged change is expected.
- **Suggestion:** Clarify that re-init must ensure `.steel/constitution.md` is tracked in the index, not necessarily newly staged as a diff, and that AC-4 is satisfied when the file is already tracked.

VERDICT: REVISE
