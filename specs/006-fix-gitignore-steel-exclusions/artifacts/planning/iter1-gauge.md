# Gauge Review — Planning Iteration 1

**BLOCKING:** Step 3 is not portable. The primary commands rely on `xargs -r` (GNU-specific, unavailable on macOS). BSD `xargs` with empty input can still invoke `git rm --cached` with no paths, violating FR-3's no-op requirement. The plan needs one concrete macOS/Linux-safe command sequence, not a Linux-first command plus an optional alternative.

**WARNING:** "Files to Remove from Index" section is incomplete. It names only `.steel/config.json` under `.steel/`, but FR-3 requires removing all tracked `.steel/` files except `.steel/.gitignore` and `.steel/constitution.md`.

**WARNING:** Verification section does not cover AC-4 / NFR-2. It never verifies that non-steel files under `.claude/commands/` and `.agents/skills/` remain tracked if present.

**NOTE:** The clarification about `steel-init` re-run regression is only implied. The plan should state this scope decision directly.

VERDICT: REVISE
