# Gauge Review — Iteration 4

## Issues

BLOCKING: `steel init` persistence semantics are underspecified for re-initialization. FR-24 to FR-26 say init should prompt for `baseBranch` and `branchPrefix` and store them under `git`, but they do not say whether init must merge those values into an existing `.steel/config.json` while preserving `forge`, `gauge`, `maxIterations`, `autoCommit`, and `specsDir`. In the current code, `initConfig()` rewrites the config object, so an implementation could satisfy the written spec while accidentally dropping unrelated settings on re-init.

WARNING: The spec does not state whether `steel init` must validate the free-text `baseBranch` and `branchPrefix` inputs before writing them. NFR-5 requires validation in `resolveGitConfig()`, but that allows `steel init` to persist invalid config and only fail later on load.

NOTE: The iteration 4 changes materially improved clarity. The `/` prohibition for `--id`, the broadened invalid-pattern error language, and the added config-validation ACs close the main issues from iteration 3. Constitution alignment is good.

VERDICT: REVISE
