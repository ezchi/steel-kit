# Clarifications: Configurable Git Branching Workflow Support

## CLR-1: Semantic name slugification rules for `--id` mode [NO SPEC CHANGE]

**Ambiguity:** FR-15 states that when `--id` is provided, the specId becomes `<value>-<semantic-name>` (e.g. `PROJ-21-add-auth`). However, the spec does not define how the description is converted to a semantic name. The current `generateSpecId()` in `commands/specify.ts:82-87` uses a specific slugification algorithm: lowercase, strip non-alphanumeric characters, collapse whitespace to hyphens, truncate to 40 characters.

**Resolution:** The existing slugification logic shall be reused for `--id` mode. The `--id` value replaces only the numeric prefix portion; the semantic name derivation is unchanged. This is already implied by FR-15's example (`PROJ-21` + `"add auth"` → `PROJ-21-add-auth`) matching the existing slug behavior, but making it explicit avoids ambiguity during implementation.

---

## CLR-2: Spec directory naming with `--id` and collision handling [SPEC UPDATE]

**Ambiguity:** The spec directory is created under `specs/<specId>/`. With `--id PROJ-21` and description `"add auth"`, the directory would be `specs/PROJ-21-add-auth/`. The spec does not address what happens if this directory already exists — which is more likely with user-supplied IDs than auto-incremented numbers (e.g., a user accidentally re-runs with the same `--id`).

**Resolution:** If `specs/<specId>/` already exists when `--id` is provided, `generateSpecId()` shall fail with a clear error: `"Spec directory 'specs/PROJ-21-add-auth' already exists. Use a different --id or remove the existing spec."` No branch creation shall occur. This is consistent with the spec's "fail early with clear errors" pattern (FR-14) and the constitution's emphasis on user control over automation.

---

## CLR-3: Branch prefix separator convention [NO SPEC CHANGE]

**Ambiguity:** The spec allows arbitrary `branchPrefix` values like `feature/`, `spec/`, or `eda-`. A user could set `branchPrefix: 'feature'` (missing trailing separator), resulting in branches like `feature001-test`. Should the system enforce a trailing separator?

**Resolution:** No enforcement. The prefix is used verbatim (FR-9: `branchPrefix + specId`). This is a deliberate design choice — some teams use `eda-` (no `/`), others use `feature/` (with `/`). Enforcing a separator character would be overly opinionated and violate the constitution's principle that automation is subordinate to user control. The built-in preset values (`spec/`, `feature/`) serve as documentation of common conventions. NFR-5 validation ensures the composed branch name is a valid git ref, which is sufficient.

---

## CLR-4: Config cascade interaction with presets [NO SPEC CHANGE]

**Ambiguity:** FR-5 states resolution precedence as "explicit field > preset default > steel preset default." FR-6 states deep-merge across defaults → YAML → JSON → env vars. The interaction between these two mechanisms needs clarification: does merging happen first, then preset resolution?

**Resolution:** Yes. The config cascade (FR-6) merges all sources into a single `GitConfig` object first. Then `resolveGitConfig()` (FR-5) applies preset defaults to fill any remaining gaps. Example: if YAML sets `workflow: 'gitflow'` and env var sets `STEEL_GIT_BRANCH_PREFIX=eda-`, the merged config is `{ workflow: 'gitflow', branchPrefix: 'eda-' }`. Resolution then fills `baseBranch: 'develop'` and `developBranch: 'develop'` from the gitflow preset, yielding `{ workflow: 'gitflow', branchPrefix: 'eda-', baseBranch: 'develop', developBranch: 'develop' }`. This two-phase approach (merge then resolve) is the only interpretation consistent with both FR-5 and FR-6.

---

## CLR-5: `generateSpecId()` function location after refactor [SPEC UPDATE]

**Ambiguity:** `generateSpecId()` currently lives in `commands/specify.ts:64-90` as a local function. The spec adds `--id` handling (FR-14–FR-16) and collision detection (CLR-2) to this function, making it more complex. The spec references it as if it's a well-known function but doesn't specify whether it should be extracted.

**Resolution:** `generateSpecId()` shall be extracted to `src/spec-id.ts` as an exported function. This enables direct unit testing of ID generation, validation, and collision detection without invoking the full `specify` command — consistent with the constitution's preference for testable, composable functions and the coding standard "small composable functions." The `specify` command will import and call it.

---

## CLR-6: Dual validation points for git config values [NO SPEC CHANGE]

**Ambiguity:** NFR-5 says validation occurs in `resolveGitConfig()` after resolution. FR-26 says `steel init` validates before writing config. These appear to be two different validation points for the same values.

**Resolution:** Both validation points are intentional and serve different purposes:
1. **`steel init` validation (FR-26):** Interactive feedback loop — re-prompt the user immediately if they enter an invalid value. Prevents writing bad config.
2. **`resolveGitConfig()` validation (NFR-5):** Catches invalid values from non-interactive sources (YAML edits, env vars, JSON hand-edits). This is the safety net.

Both should use the same underlying validation function to avoid divergence. This is an implementation detail (not a spec requirement), but it's the natural design.

---

## CLR-7: `initBranch()` behavior when offline and remote check fails [NO SPEC CHANGE]

**Ambiguity:** FR-12 says if `baseBranch` doesn't exist locally but `origin/<baseBranch>` exists as a remote-tracking branch, create a local tracking branch. But remote-tracking refs (`origin/develop`) are local metadata from the last fetch — this check doesn't require network access. The spec is already correct.

**Resolution:** No change needed. `origin/<baseBranch>` is checked via `git rev-parse --verify origin/<baseBranch>`, which reads local refs only. If the user has never fetched, the remote-tracking ref won't exist, and FR-12's fallback to "fail with clear error" applies. This is the correct behavior — the system should not silently fetch from remote, which aligns with the constitution's principle that automation is subordinate to user control.

---

## CLR-8: `recoverState()` specId extraction with non-`spec/` prefixes [NO SPEC CHANGE]

**Ambiguity:** FR-19 says recovery uses `resolvedGitConfig.branchPrefix` for detection. The current code does `branch.slice(5)` to extract specId from `spec/` prefix. With variable-length prefixes, the extraction logic changes to `branch.slice(branchPrefix.length)`.

**Resolution:** This is straightforward — `recoverState()` shall use `branch.slice(resolvedGitConfig.branchPrefix.length)` when the branch matches the configured prefix, and `branch.slice('spec/'.length)` for the legacy fallback (FR-20). FR-21 already confirms specId is treated as an opaque string, so no further parsing is needed. No spec change required — this is an implementation detail fully covered by existing requirements.
