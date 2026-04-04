# Specification: Configurable Git Branching Workflow Support

## Overview

Add configurable git branching support to Steel-Kit so that teams can use their preferred branching strategy (gitflow, GitHub Flow, custom prefixes) instead of the hardcoded `spec/` prefix. This includes workflow presets, explicit `baseBranch`/`branchPrefix` overrides, a `--id` flag for custom spec identifiers (e.g. Jira ticket IDs), and interactive setup during `steel init`.

Currently, `initBranch()` in `src/git-ops.ts` hardcodes `spec/${specId}`, `recoverState()` in `src/workflow.ts` checks `branch.startsWith('spec/')`, and drift checks in `src/doctor.ts` expect the `spec/` prefix. This forces all users into a single branching convention regardless of team workflow.

This specification aligns with the project constitution:
- Automation is subordinate to user control: users choose their branching strategy.
- Behavioral alignment across Codex, Gemini CLI, and Claude Code: git config is provider-agnostic.
- Auditability: branch naming conventions are explicit in config, not hidden in code.
- Self-improvement: the system adapts to team conventions rather than imposing its own.

## User Stories

- As a developer using gitflow, I want Steel-Kit to create feature branches from `develop` with a `feature/` prefix so that my spec branches follow our team's branching convention.
- As a developer using GitHub Flow, I want Steel-Kit to create branches from `main` with a `feature/` prefix so that branches align with our PR workflow.
- As a team using Jira, I want to supply a ticket identifier as the spec ID (e.g. `--id PROJ-21`) so that branch names like `eda-PROJ-21-add-auth` map directly to our issue tracker.
- As an existing Steel-Kit user, I want the default behavior to remain unchanged (`spec/` prefix, auto-increment IDs) so that my current projects work without any migration.
- As a new user running `steel init`, I want to be prompted for my preferred base branch and branch prefix so that config is set up correctly from the start.

## Functional Requirements

### Config schema

- FR-1: The `SteelConfig` interface in `src/config.ts` shall add an optional `git` field of type `GitConfig`.
- FR-2: `GitConfig` shall be defined as an input type with all fields optional:
  ```typescript
  export interface GitConfig {
    workflow?: GitWorkflow;       // preset shortcut, defaults to 'steel'
    branchPrefix?: string;        // e.g. "spec/", "feature/", "eda-"
    baseBranch?: string;          // e.g. "main", "develop"
    developBranch?: string;       // gitflow only, e.g. "develop"
  }
  ```
  All fields are optional because presets fill in omitted values.
- FR-3: `GitWorkflow` shall be a union of three preset names: `'steel' | 'github-flow' | 'gitflow'`. There is no `'custom'` value — users who want non-preset values simply set explicit fields on any preset (or omit `workflow` entirely, which defaults to `'steel'`).
- FR-4: Three built-in presets shall provide default values when `GitConfig` fields are omitted:
  - `steel`: `branchPrefix: "spec/"`, `baseBranch: "main"`
  - `github-flow`: `branchPrefix: "feature/"`, `baseBranch: "main"`
  - `gitflow`: `branchPrefix: "feature/"`, `baseBranch: "develop"`, `developBranch: "develop"`
- FR-5: A `resolveGitConfig(config: SteelConfig)` function shall return a `ResolvedGitConfig`:
  ```typescript
  export interface ResolvedGitConfig {
    workflow: GitWorkflow;
    branchPrefix: string;
    baseBranch: string;
    developBranch?: string;       // present only when gitflow preset is active or explicitly set; reserved for future gitflow merge-back support
  }
  ```
  Resolution precedence: explicit field > preset default > `steel` preset default.
  
  Note: `developBranch` is included in the schema and presets to record the gitflow integration branch. In this specification, no operational requirement consumes `developBranch` at runtime — it is preset metadata reserved for future gitflow merge-back support (which is explicitly out of scope here). It is resolved and stored so that future stages can access it without re-resolving presets.
- FR-6: `mergeConfig()` shall deep-merge the `git` sub-object across the config cascade (defaults → YAML → JSON → env vars).
- FR-7: Environment variable overrides shall map to nested `git` fields as follows:
  - `STEEL_GIT_WORKFLOW` → `config.git.workflow` (must be a valid `GitWorkflow` value; invalid values are ignored with a warning)
  - `STEEL_GIT_BRANCH_PREFIX` → `config.git.branchPrefix`
  - `STEEL_GIT_BASE_BRANCH` → `config.git.baseBranch`
  - `STEEL_GIT_DEVELOP_BRANCH` → `config.git.developBranch`

  These overrides are applied after loading defaults, YAML, and JSON, but before `resolveGitConfig()` computes final values.

### Branch creation

- FR-8: `initBranch()` in `src/git-ops.ts` shall accept a `gitConfig: ResolvedGitConfig` parameter instead of constructing the branch name from the hardcoded `spec/` prefix.
- FR-9: `initBranch()` shall use `gitConfig.branchPrefix + specId` to construct the branch name.
- FR-10: `initBranch()` shall checkout `gitConfig.baseBranch` before creating the new branch, ensuring the branch is created from the correct base.
- FR-11: `initBranch()` shall call `ensureClean()` before switching branches to guard against uncommitted work.
- FR-12: `initBranch()` shall validate that `baseBranch` exists as a local branch. If it does not exist locally but `origin/<baseBranch>` exists as a remote-tracking branch, `initBranch()` shall create a local tracking branch from it automatically. If neither exists, it shall fail with a clear error message naming the missing branch.
- FR-13: `initBranch()` shall return the created branch name string so callers do not need to reconstruct it.

### Custom spec ID (`--id` flag)

- FR-14: The `specify` command in `src/cli.ts` shall accept an optional `--id <value>` option for supplying a custom spec identifier. The value must be a valid git-ref component: no spaces, ASCII control characters, or characters `~`, `^`, `:`, `?`, `*`, `[`, `\`, `..`, or names ending with `.lock`. If the value fails validation, the command shall reject it with a clear error listing the invalid characters found. Validation shall use `git check-ref-format --allow-onelevel` or equivalent logic.
- FR-15: When `--id` is provided, `generateSpecId()` shall use the supplied value verbatim as the identifier prefix instead of auto-incrementing. The value is not zero-padded or otherwise transformed. The resulting specId is `<value>-<semantic-name>` (e.g. `PROJ-21-add-auth`).
- FR-16: When `--id` is omitted, `generateSpecId()` shall continue to auto-increment with 3-digit zero-padding (current behavior).
- FR-17: The `specify` command shall call `resolveGitConfig(config)` and pass the resolved config to `initBranch()`.
- FR-18: The `specify` command shall use the branch name returned by `initBranch()` instead of reconstructing `spec/${specId}`.

### State recovery

- FR-19: `recoverState()` in `src/workflow.ts` shall use `resolvedGitConfig.branchPrefix` when detecting spec branches from the current branch name.
- FR-20: As a backward-compatibility fallback, if the configured prefix is not `spec/` but the current branch starts with `spec/`, recovery shall still detect the branch as a spec branch (legacy compatibility).
- FR-21: Recovery and drift checks do not parse specIds to extract the identifier portion. The specId is treated as an opaque string. Branch detection relies solely on prefix matching (`branchPrefix + specId`), and specId is stored verbatim in `state.json`.

### Doctor drift checks

- FR-22: `checkDrift()` in `src/doctor.ts` shall use the resolved `gitConfig.branchPrefix` instead of the hardcoded `spec/` prefix when computing expected branch names.
- FR-23: If the configured prefix differs from `spec/` but the current branch uses the `spec/` prefix, the doctor shall emit a `warn` diagnostic noting the legacy prefix mismatch, with remediation suggesting the user update the branch or config.

### Interactive setup

- FR-24: `steel init` in `commands/init.ts` shall prompt the user for base branch and branch prefix as free-text input using `@inquirer/prompts` `input()`. These prompts capture raw override values, not preset selection. Presets are a config-file-level concept and are not surfaced during interactive init.
- FR-25: The base branch prompt shall default to `"main"` and the branch prefix prompt shall default to `"spec/"`.
- FR-26: User-supplied values shall be stored in `.steel/config.json` under the `git` key (fields: `baseBranch`, `branchPrefix`).

### Config template

- FR-27: `steel.config.yaml` shall include a commented `git:` section documenting available fields, presets, and their defaults.

## Non-Functional Requirements

- NFR-1: Backward compatibility — existing projects with no `git` config shall behave identically to current behavior (`spec/` prefix, `main` base, auto-increment IDs). Zero migration required.
- NFR-2: The `resolveGitConfig()` function shall be the single source of truth for git branching config resolution. No other code shall hardcode branch prefixes or base branches.
- NFR-3: Provider parity — git branching config is provider-agnostic and shall work identically across Codex, Gemini CLI, and Claude Code.
- NFR-4: All new config fields shall follow the existing config cascade precedence: defaults → YAML → JSON → env vars.
- NFR-5: Branch prefix validation shall accept any non-empty string, including prefixes without trailing slashes (e.g. `eda-`). An empty string shall be rejected with a clear error.
- NFR-6: The `--id` flag shall accept any non-empty string value that is valid as a git branch name component (per `git check-ref-format` rules). Invalid values shall be rejected with a clear error before any branch or file creation occurs.

## Acceptance Criteria

- AC-1: `resolveGitConfig({})` returns `{ workflow: 'steel', branchPrefix: 'spec/', baseBranch: 'main' }` (no `developBranch` key).
- AC-2: `resolveGitConfig({ git: { workflow: 'gitflow' } })` returns `{ workflow: 'gitflow', branchPrefix: 'feature/', baseBranch: 'develop', developBranch: 'develop' }`.
- AC-3: `resolveGitConfig({ git: { workflow: 'gitflow', branchPrefix: 'eda-' } })` returns `branchPrefix: 'eda-'` (explicit overrides preset).
- AC-4: `generateSpecId` with `--id PROJ-21` and description `"add auth"` produces `PROJ-21-add-auth`.
- AC-5: `generateSpecId` without `--id` and description `"add auth"` with one existing spec produces `002-add-auth`.
- AC-6: With `branchPrefix: 'feature/'`, `steel specify "test"` creates branch `feature/001-test` from `baseBranch`.
- AC-7: With `branchPrefix: 'eda-'` and `--id PROJ-21`, `steel specify "add auth"` creates branch `eda-PROJ-21-add-auth`.
- AC-8: Existing project with no `git` config: `steel specify "test"` creates `spec/001-test` (unchanged behavior).
- AC-9: State recovery detects `feature/002-add-auth` as a spec branch when `branchPrefix` is `feature/`.
- AC-10: State recovery detects `spec/001-doctor` as a spec branch even when `branchPrefix` is `feature/` (legacy fallback).
- AC-11: Doctor drift check with `feature/` config and `feature/002-test` branch passes.
- AC-12: Doctor drift check with `feature/` config and `spec/002-test` branch produces legacy-prefix warning.
- AC-13: `steel init` prompts for base branch (default: `main`) and branch prefix (default: `spec/`), stores in config under `git` key.
- AC-14: Env var `STEEL_GIT_BRANCH_PREFIX=eda-` overrides config file values.
- AC-15: Env var `STEEL_GIT_WORKFLOW=invalid` is ignored with a warning; default preset applies.
- AC-16: `initBranch()` with `baseBranch: 'develop'` where `develop` doesn't exist locally but `origin/develop` does → creates local tracking branch and succeeds.
- AC-17: `initBranch()` with `baseBranch: 'develop'` where neither local nor remote exists → fails with clear error naming the missing branch.
- AC-18: Empty `branchPrefix` (via config or env var) is rejected with a clear error.
- AC-19: `--id "hello world"` is rejected with an error citing the space character.
- AC-20: `--id "feat~1"` is rejected with an error citing the `~` character.
- AC-21: `--id "PROJ-21"` passes validation and produces specId `PROJ-21-add-auth`.
- AC-22: `npm run build` compiles without errors; `npm test` passes; `npm run lint` type-checks.

## Out of Scope

- Post-workflow actions (PR creation, merge-back logic)
- Release branch management (handled by `release-management` skill)
- Hotfix branch support in gitflow
- Remote branch tracking or push behavior beyond FR-12's auto-tracking
- Branch protection rules or CI integration
- Preset selection during `steel init` (presets are config-file-only)

## Open Questions

None at this time.
