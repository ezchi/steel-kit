# Gauge Review — Iteration 1

## Issues

BLOCKING: `GitConfig` is internally inconsistent. FR-2 declares `branchPrefix` and `baseBranch` as required fields, but FR-3 and FR-4 depend on those fields being omittable so presets can fill them in. As written, `{ git: { workflow: 'gitflow' } }` would be invalid at the type level even though AC-2 requires it to work.

BLOCKING: `resolveGitConfig()` return type is inconsistent with the spec. FR-4 requires `Required<GitConfig>`, but FR-2 makes `developBranch` optional and AC-1 does not include it. If `Required<GitConfig>` is literal, `developBranch` must always exist; if not, the return type needs to be something narrower and explicitly defined.

BLOCKING: The `custom` workflow preset is underspecified. FR-2 allows `workflow: 'custom'`, but FR-3 defines defaults only for `steel`, `github-flow`, and `gitflow`. FR-4 says resolution is `explicit field > preset default > steel preset default`, which would silently make `custom` fall back to Steel defaults instead of behaving as a real custom mode. The spec needs explicit validation/rules for `custom` or should remove it.

BLOCKING: The `--id` contract is contradictory. FR-13 says `--id <number>`, FR-14 says "numeric part," but NFR-6 says it must accept any string such as `PROJ-21`. Those cannot all be true simultaneously. The option shape, validation rules, and slug/formatting behavior for arbitrary string IDs need one clear definition.

WARNING: The spec does not define how arbitrary string IDs interact with branch recovery and doctor drift checks. For example, if `--id PROJ-21` produces `feature/PROJ-21-add-auth`, what logic distinguishes the ID from the slug later, and is any parsing required at all? If parsing is unnecessary, say so explicitly.

WARNING: FR-5 says `mergeConfig()` shall deep-merge `git` across defaults, YAML, JSON, and env vars, but env vars are scalar overrides, not objects. The mapping from `STEEL_GIT_*` into the nested `git` object is not specified precisely enough to implement without inference.

WARNING: The overview says the feature includes "interactive setup during steel init" and "workflow presets," but FR-22 through FR-24 only prompt for free-text `baseBranch` and `branchPrefix`. If presets are first-class user-facing behavior, `init` should either prompt for the workflow preset or the spec should explicitly state that `init` only captures raw overrides.

WARNING: FR-11 requires validating that `baseBranch` exists locally, but the UX for repositories that only have `origin/develop` is unspecified. If local-only existence is intentional, that should be called out because it will surprise gitflow users on fresh clones.

NOTE: Constitution alignment is generally good. The proposal improves user control, keeps branching provider-agnostic, and makes branch naming auditable via config rather than hardcoded logic.

NOTE: Testability is mostly solid, but acceptance criteria are missing explicit cases for `custom` workflow behavior, invalid/empty `branchPrefix`, missing `baseBranch`, and non-numeric `--id` values if NFR-6 remains.

VERDICT: REVISE
