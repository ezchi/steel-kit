# Gauge Review — Clarification Iteration 1

**BLOCKING:** The clarification does not resolve the edge cases around empty repos, repos with no matching tracked steel files, and partial states. Item 2 recommends piping `git ls-files` into `git rm --cached`, but never states how the implementation must behave when that file list is empty or only partially populated. A naive `git rm --cached` invocation can fail or produce a noisy non-zero exit when there is nothing to untrack, which would break the "one-time cleanup" flow.

**WARNING:** The `steel-init` interaction analysis is incomplete. `commands/init.ts` still writes the old `.steel/.gitignore` content (`state.json` / `tasks.json`). A re-init can regress the defense-in-depth behavior from FR-2 if the user allows overwrite, even if root `.gitignore` still protects tracking. This should be called out explicitly as either an accepted out-of-scope limitation or a spec-impacting gap.

**WARNING:** The test-fixture review is too narrow. Both `doctor.test.ts` and `clean.test.ts` repeatedly seed `.steel/.gitignore` with the old single-line content (`state.json`). Even if they currently pass, that is fixture compatibility drift. The repo also still has the old writer in `commands/init.ts`, so compatibility is broader than the clarification claims.

**NOTE:** The `.gitignore` ordering clarification is correct, and the clarification is aligned with the constitution on auditability by keeping `specs/` tracked.

VERDICT: REVISE
