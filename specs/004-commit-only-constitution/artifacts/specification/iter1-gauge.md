# Gauge Review: Specification 004-commit-only-constitution — Iteration 1

### [BLOCKING] Migration does not define how git index state is corrected
- **Section:** FR-2, FR-4, AC-1, AC-4
- **Issue:** The spec says only `.steel/constitution.md` should be committed and that re-running `steel init` migrates existing repos, but it does not define how already tracked `.steel/.gitignore` is untracked or how `constitution.md` becomes tracked in migrated repositories. Ignore rules alone do not satisfy AC-1 (`git ls-files .steel/` shows only `constitution.md`).
- **Suggestion:** Add explicit migration requirements for git-index behavior during re-init: update root `.gitignore`, remove tracked `.steel/.gitignore` from the index if present, and stage/commit `.steel/constitution.md` when auto-commit is enabled. If that is not intended, relax AC-1 to an untracked-state assertion instead of a tracked-files assertion.

### [BLOCKING] Root `.gitignore` rewrite rules are too ambiguous to implement safely
- **Section:** FR-4
- **Issue:** "If the root `.gitignore` contains the old `.steel/` entry, replace it with the new pattern" is not precise enough. It does not say what to do with duplicate entries, `.steel/` plus comments, `.steel/*` without the negation, `.steel/**`, reordered lines, or no existing `.steel` rule at all. Different implementations could produce different results or damage user-maintained `.gitignore` structure.
- **Suggestion:** Define exact normalization rules: what patterns count as legacy, whether to append the new block when no matching entry exists, whether the two required lines must be adjacent, and how to preserve unrelated `.gitignore` content and comments.

### [WARNING] Doctor check is not testable as written
- **Section:** FR-5, AC-5
- **Issue:** The spec says doctor should verify that root `.gitignore` "contains the correct `.steel/*` + `!.steel/constitution.md` pattern," but it does not define whether this means exact adjacent lines, order-sensitive matching, comment-insensitive matching, or compatibility with extra `.steel` ignore rules elsewhere in the file.
- **Suggestion:** Specify the exact validation rule doctor should enforce, including allowed formatting variants and what summary/remediation it should emit when the rule is missing or malformed.

### [WARNING] Git-based acceptance language is inconsistent
- **Section:** NFR-2, AC-1, AC-2
- **Issue:** NFR-2 says `constitution.md` must "appear as tracked in `git status`," but clean tracked files do not appear in `git status`. AC-1 uses `git ls-files`, while AC-2 uses `git status`, so the spec mixes different concepts without defining the expected repository state.
- **Suggestion:** Rewrite these checks using precise git observables, for example: `git ls-files .steel/` contains only `.steel/constitution.md`, and `git status --short .steel/` does not show `.steel/config.json`, `.steel/state.json`, or `.steel/tasks.json`.

VERDICT: REVISE
