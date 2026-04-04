# Specification: Configurable Git Branching Workflow Support

## Overview

Add configurable git branching support to Steel-Kit so that teams can use their preferred branching strategy (gitflow, GitHub Flow, custom prefixes) instead of the hardcoded `spec/` prefix. This includes workflow presets, explicit `baseBranch`/`branchPrefix` overrides, a `--id` flag for custom spec numbers (e.g. Jira ticket IDs), and interactive setup during `steel init`.

Currently, `initBranch()` in `src/git-ops.ts` hardcodes `spec/${specId}`, `recoverState()` in `src/workflow.ts` checks `branch.startsWith('spec/')`, and drift checks in `src/doctor.ts` expect the `spec/` prefix. This forces all users into a single branching convention regardless of team workflow.

This specification aligns with the project constitution:
- Automation is subordinate to user control: users choose their branching strategy.
- Behavioral alignment across Codex, Gemini CLI, and Claude Code: git config is provider-agnostic.
- Auditability: branch naming conventions are explicit in config, not hidden in code.
- Self-improvement: the system adapts to team conventions rather than imposing its own.

## User Stories

- As a developer using gitflow, I want Steel-Kit to create feature branches from `develop` with a `feature/` prefix so that my spec branches follow our team's branching convention.
- As a developer using GitHub Flow, I want Steel-Kit to create branches from `main` with a `feature/` prefix so that branches align with our PR workflow.
- As a team using Jira, I want to supply a ticket number as the spec ID (e.g. `--id 21`) so that branch names like `eda-21-add-auth` map directly to our issue tracker.
- As an existing Steel-Kit user, I want the default behavior to remain unchanged (`spec/` prefix, auto-increment IDs) so that my current projects work without any migration.
- As a new user running `steel init`, I want to be prompted for my preferred base branch and branch prefix so that config is set up correctly from the start.

## Functional Requirements

### Config schema

- FR-1: The `SteelConfig` interface in `src/config.ts` shall add an optional `git` field of type `GitConfig`.
- FR-2: `GitConfig` shall define the following fields:
  - `workflow?: GitWorkflow` — preset shortcut (`'steel' | 'github-flow' | 'gitflow' | 'custom'`), defaults to `'steel'`
  - `branchPrefix: string` — e.g. `"spec/"`, `"feature/"`, `"eda-"`
  - `baseBranch: string` — e.g. `"main"`, `"develop"`
  - `developBranch?: string` — gitflow only, e.g. `"develop"`
- FR-3: Three built-in presets shall provide default values when `GitConfig` fields are omitted:
  - `steel`: `branchPrefix: "spec/"`, `baseBranch: "main"`
  - `github-flow`: `branchPrefix: "feature/"`, `baseBranch: "main"`
  - `gitflow`: `branchPrefix: "feature/"`, `baseBranch: "develop"`, `developBranch: "develop"`
- FR-4: A `resolveGitConfig(config: SteelConfig): Required<GitConfig>` function shall resolve the final git config using this precedence: explicit field > preset default > `steel` preset default.
- FR-5: `mergeConfig()` shall deep-merge the `git` sub-object across the config cascade (defaults → YAML → JSON → env vars).
- FR-6: Environment variable overrides shall be supported: `STEEL_GIT_WORKFLOW`, `STEEL_GIT_BRANCH_PREFIX`, `STEEL_GIT_BASE_BRANCH`.

### Branch creation

- FR-7: `initBranch()` in `src/git-ops.ts` shall accept a `gitConfig` parameter instead of constructing the branch name from the hardcoded `spec/` prefix.
- FR-8: `initBranch()` shall use `gitConfig.branchPrefix + specId` to construct the branch name.
- FR-9: `initBranch()` shall checkout `gitConfig.baseBranch` before creating the new branch, ensuring the branch is created from the correct base.
- FR-10: `initBranch()` shall call `ensureClean()` before switching branches to guard against uncommitted work.
- FR-11: `initBranch()` shall validate that `baseBranch` exists locally (clear error message when e.g. `develop` is missing).
- FR-12: `initBranch()` shall return the created branch name string so callers do not need to reconstruct it.

### Custom spec ID (`--id` flag)

- FR-13: The `specify` command in `src/cli.ts` shall accept an optional `--id <number>` option for supplying a custom spec number.
- FR-14: When `--id` is provided, `generateSpecId()` shall use the supplied value as the numeric part instead of auto-incrementing. User-supplied IDs shall not be zero-padded.
- FR-15: When `--id` is omitted, `generateSpecId()` shall continue to auto-increment with 3-digit zero-padding (current behavior).
- FR-16: The `specify` command shall call `resolveGitConfig(config)` and pass the resolved config to `initBranch()`.
- FR-17: The `specify` command shall use the branch name returned by `initBranch()` instead of reconstructing `spec/${specId}`.

### State recovery

- FR-18: `recoverState()` in `src/workflow.ts` shall use `config.git.branchPrefix` (resolved via `resolveGitConfig()`) when detecting spec branches from the current branch name.
- FR-19: As a backward-compatibility fallback, if the configured prefix is not `spec/` but the current branch starts with `spec/`, recovery shall still detect the branch as a spec branch (legacy compatibility).

### Doctor drift checks

- FR-20: `checkDrift()` in `src/doctor.ts` shall use the resolved `gitConfig.branchPrefix` instead of the hardcoded `spec/` prefix when computing expected branch names.
- FR-21: If the configured prefix differs from `spec/` but the current branch uses the `spec/` prefix, the doctor shall emit a `warn` diagnostic noting the legacy prefix mismatch.

### Interactive setup

- FR-22: `steel init` in `commands/init.ts` shall prompt the user for base branch and branch prefix as free-text input using `@inquirer/prompts` `input()`.
- FR-23: The base branch prompt shall default to `"main"` and the branch prefix prompt shall default to `"spec/"`.
- FR-24: User-supplied values shall be stored in `.steel/config.json` under the `git` key (fields: `baseBranch`, `branchPrefix`).

### Config template

- FR-25: `steel.config.yaml` shall include a commented `git:` section documenting available fields and their defaults.

## Non-Functional Requirements

- NFR-1: Backward compatibility — existing projects with no `git` config shall behave identically to current behavior (`spec/` prefix, `main` base, auto-increment IDs). Zero migration required.
- NFR-2: The `resolveGitConfig()` function shall be the single source of truth for git branching config resolution. No other code shall hardcode branch prefixes or base branches.
- NFR-3: Provider parity — git branching config is provider-agnostic and shall work identically across Codex, Gemini CLI, and Claude Code.
- NFR-4: All new config fields shall follow the existing config cascade precedence: defaults → YAML → JSON → env vars.
- NFR-5: Branch prefix validation shall accept any non-empty string, including prefixes without trailing slashes (e.g. `eda-`).
- NFR-6: The `--id` flag shall accept any string value, not just numbers, to support arbitrary ticket identifiers (e.g. `PROJ-21`).

## Acceptance Criteria

- AC-1: `resolveGitConfig({})` returns `{ workflow: 'steel', branchPrefix: 'spec/', baseBranch: 'main' }`.
- AC-2: `resolveGitConfig({ git: { workflow: 'gitflow' } })` returns `{ workflow: 'gitflow', branchPrefix: 'feature/', baseBranch: 'develop', developBranch: 'develop' }`.
- AC-3: `resolveGitConfig({ git: { workflow: 'gitflow', branchPrefix: 'eda-' } })` returns `branchPrefix: 'eda-'` (explicit overrides preset).
- AC-4: `generateSpecId` with `--id 21` and description `"add auth"` produces `21-add-auth`.
- AC-5: `generateSpecId` without `--id` and description `"add auth"` with one existing spec produces `002-add-auth`.
- AC-6: With `branchPrefix: 'feature/'`, `steel specify "test"` creates branch `feature/001-test` from `baseBranch`.
- AC-7: With `branchPrefix: 'eda-'` and `--id 21`, `steel specify "add auth"` creates branch `eda-21-add-auth`.
- AC-8: Existing project with no `git` config: `steel specify "test"` creates `spec/001-test` (unchanged behavior).
- AC-9: State recovery detects `feature/002-add-auth` as a spec branch when `branchPrefix` is `feature/`.
- AC-10: State recovery detects `spec/001-doctor` as a spec branch even when `branchPrefix` is `feature/` (legacy fallback).
- AC-11: Doctor drift check with `feature/` config and `feature/002-test` branch passes.
- AC-12: Doctor drift check with `feature/` config and `spec/002-test` branch produces legacy-prefix warning.
- AC-13: `steel init` prompts for base branch (default: `main`) and branch prefix (default: `spec/`), stores in config.
- AC-14: Env var `STEEL_GIT_BRANCH_PREFIX=eda-` overrides config file values.
- AC-15: `npm run build` compiles without errors; `npm test` passes; `npm run lint` type-checks.

## Out of Scope

- Post-workflow actions (PR creation, merge-back logic)
- Release branch management (handled by `release-management` skill)
- Hotfix branch support in gitflow
- Remote branch tracking or push behavior
- Branch protection rules or CI integration
- Workflow presets beyond `steel`, `github-flow`, `gitflow` (users can use `custom` with explicit fields)

## Open Questions

None at this time.
