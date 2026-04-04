# Gauge Review — Iteration 2

## Issues

BLOCKING: `--id` is specified as accepting "any non-empty string", which is not feasible for git branch creation. FR-14, FR-15, NFR-6, and AC-4/7 together imply the raw `--id` value is inserted directly into `specId`, then into the branch name via `branchPrefix + specId`. Git branch names cannot contain arbitrary strings; spaces and several special characters are invalid. As written, the spec requires behavior that git cannot support, and it does not define whether invalid values are rejected or transformed. This needs an explicit validation rule and error behavior.

WARNING: `developBranch` is part of `GitConfig`, but the env-var mapping omits it while NFR-4 says all new config fields follow the full cascade. FR-2 includes `developBranch` as a configurable input field, but FR-7 only maps `workflow`, `branchPrefix`, and `baseBranch`. That is either intentional and should be stated, or incomplete and should add `STEEL_GIT_DEVELOP_BRANCH`.

WARNING: The spec does not define when `developBranch` matters, so the field still looks partially vestigial. FR-2 and FR-5 carry `developBranch`, but the operational requirements only use `baseBranch` for branch creation and recovery/doctor only care about `branchPrefix`. If `developBranch` is retained solely as preset metadata, say that explicitly; otherwise define its behavioral role.

NOTE: The four iteration-1 blocking issues appear resolved.

NOTE: The newly added recovery clarification (FR-21) is much better.

VERDICT: REVISE
