---
name: release-management
description: Use this skill when the user wants to cut a release for a repository, bump versions, create tags, merge release branches or direct release commits, push branches and tags, and optionally publish a GitHub release. Detect whether the repository is hosted on GitHub before attempting any gh release step, and skip GitHub release creation when the repository is not a GitHub repository.
---

# release-management

Use this skill when the user asks to release the latest changes for a repository.

## Safety Rules

- Do not create commits, merges, tags, pushes, or GitHub releases without explicit user approval.
- Before any release action, inspect the repo state and explain the exact release plan.
- If the working tree is dirty, stop and ask how to proceed.
- If version files do not match the latest release tag, call that out before releasing.

## Release Inspection

Check these first:

- current branch
- clean working tree
- local and remote branches
- existing version tags
- version fields such as `package.json`, `pyproject.toml`, or equivalent
- git remote URL

## Interactive Confirmation

This skill must be interactive for the two highest-risk release parameters:

- release branch
- release tag

Detect likely values first, then ask the user to confirm them before creating commits, merges, tags, pushes, or GitHub releases.

## Release Branch Detection

Detect the release branch in this order:

1. explicit user instruction
2. Git Flow config:
   - `git config --get gitflow.branch.master`
3. remote default branch:
   - `git symbolic-ref refs/remotes/origin/HEAD`
4. common branch names present in the repo:
   - `main`
   - `master`
   - `release`

After detection, tell the user what you found and ask for confirmation before proceeding.

If detection is ambiguous, show the candidates and ask the user which branch should be treated as the release branch.

## Release Tag Detection

Detect the proposed release tag in this order:

1. explicit user instruction
2. version files such as `package.json`, `pyproject.toml`, or equivalent
3. latest existing version tag plus the user's requested bump semantics

After detection, tell the user the proposed tag, for example `v0.4.0`, and ask for confirmation before proceeding.

If version files and proposed tag disagree, stop and ask the user which version should be authoritative.

Use the remote URL to decide whether GitHub release creation is applicable:

- If `origin` points to `github.com` or `git@github.com:...`, GitHub release creation may be used.
- If the repo is not a GitHub repo, skip the `gh release` step entirely.
- If GitHub CLI auth is unavailable or invalid, skip the `gh release` step and tell the user why.

## Release Flow

Choose the release flow that matches the repo and the user's stated process.

Common direct release flow:

1. Detect the release branch and ask the user to confirm it.
2. Detect the target release tag and ask the user to confirm it.
3. Confirm which version files should be updated.
4. Update version files.
5. Run the relevant build or validation steps to catch obvious release breakage.
6. Commit the version bump on the source branch.
7. Merge the source branch into the confirmed release branch.
8. Create an annotated tag such as `v0.4.0` on the release commit.
9. If the repo workflow requires it, merge the release branch back into the development branch.
10. Push branches and the new tag to `origin`.
11. Only if the repo is on GitHub and `gh` is available and authenticated, create the GitHub Release from the existing tag.

If the repo uses Git Flow or another explicit release-branch workflow, follow that instead of the direct flow.

## GitHub Release Rule

Create the GitHub release only when all of these are true:

- the repo remote is GitHub
- the tag already exists
- the user asked to publish the GitHub release
- `gh auth status` succeeds

If any of those fail, skip the GitHub release creation step and report the reason.

## Suggested Checks

Use commands like these during inspection:

```bash
git status --short
git branch --all --verbose --no-abbrev
git tag --list --sort=version:refname
git remote -v
```

For GitHub detection and release publication:

```bash
git remote get-url origin
gh auth status
gh release view <tag>
gh release create <tag> --title "<title>" --notes-file <file>
```

## Output Expectations

Before execution, provide:

- detected release flow
- detected release branch and whether the user confirmed it
- proposed target tag and whether the user confirmed it
- whether push will happen
- whether a GitHub release will be attempted or skipped

After execution, provide:

- commit IDs for the version bump and release merges
- created tag
- pushed branches
- GitHub release URL if created
