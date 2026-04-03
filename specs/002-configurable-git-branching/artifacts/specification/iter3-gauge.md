# Gauge Review — Iteration 3

## Issues

BLOCKING: `branchPrefix` validation is still too weak. NFR-5 says any non-empty string is valid, but `branchPrefix` is used directly in branch creation (`branchPrefix + specId`). That permits config/env values that can never produce a valid git branch name, such as prefixes containing `..`, `?`, `*`, `@{`, a trailing `.lock`, or other ref-format violations. The spec needs an explicit validation rule for `branchPrefix` (and ideally `baseBranch`/`developBranch`), plus acceptance criteria for rejection behavior.

WARNING: FR-14 is not fully self-consistent about what counts as a valid `--id`. The forbidden-character list does not mention `/`, and `git check-ref-format --allow-onelevel` is a refname-oriented rule, not a clean "component" definition. The spec should explicitly say whether `/` is allowed in `--id`.

WARNING: FR-14's required error shape is too narrow for all invalid cases. "List the invalid characters found" works for spaces or `~`, but not for structural failures like `..`, trailing `.lock`. The requirement should instead say the error must identify the offending character(s) or pattern(s).

## Resolved From Iteration 2
- Prior BLOCKING on unsafe --id values: resolved.
- Prior WARNING on missing STEEL_GIT_DEVELOP_BRANCH: resolved.
- Prior WARNING on developBranch ambiguity: resolved.

VERDICT: REVISE
