# Implementation Plan — Iteration 1

## Overview

This is a repository configuration change only — no runtime code modifications. The implementation consists of editing two `.gitignore` files, removing tracked files from the git index, and committing.

## Files to Modify

1. **`.gitignore`** (project root) — Add steel-kit exclusion rules
2. **`.steel/.gitignore`** — Replace with wildcard-based pattern

## Files to Remove from Index (not disk)

- `.steel/config.json`
- `.claude/commands/steel-*.md` (all matching files)
- `.agents/skills/steel-*/` (all matching directories and contents)

## Implementation Steps

### Step 1: Update root `.gitignore`

Append to `.gitignore`:

```
# Steel-Kit generated files
.steel/*
!.steel/.gitignore
!.steel/constitution.md
.claude/commands/steel-*
.agents/skills/steel-*/
```

**Critical:** The `!` negation lines must come after `.steel/*`. Append as a block, do not interleave with existing rules.

### Step 2: Update `.steel/.gitignore`

Replace entire file contents with:

```
# Ephemeral working state — do not commit
*
!.gitignore
!constitution.md
```

### Step 3: Remove tracked files from git index

Use `git ls-files` to find currently-tracked files that match the new ignore patterns, then remove them from the index:

```bash
# Find and remove .steel/ files (except .gitignore and constitution.md)
git ls-files .steel/ | grep -v -E '^\.steel/(\.gitignore|constitution\.md)$' | xargs -r git rm --cached

# Find and remove .claude/commands/steel-* files
git ls-files '.claude/commands/steel-*' | xargs -r git rm --cached

# Find and remove .agents/skills/steel-*/ files
git ls-files '.agents/skills/steel-*' | xargs -r git rm --cached
```

**Note:** `xargs -r` ensures `git rm --cached` is not called with empty input (Linux). On macOS, `xargs` without `-r` is safe if the pipe is empty — it just runs with no args and `git rm --cached` with no args fails gracefully. Alternatively, check if output is non-empty before piping.

**Portable approach:** Use a conditional:
```bash
files=$(git ls-files .steel/ | grep -v -E '^\.steel/(\.gitignore|constitution\.md)$')
[ -n "$files" ] && echo "$files" | xargs git rm --cached
```

### Step 4: Commit

```bash
git add .gitignore .steel/.gitignore
git commit -m "chore(gitignore): exclude steel-kit generated files"
```

The staged index removals from step 3 will be included automatically.

## Verification (post-commit)

Run all verification commands from the spec (V-1 through V-9):

```bash
# V-1: .steel/config.json untracked
test -z "$(git ls-files .steel/config.json)"

# V-2: No steel commands tracked
test -z "$(git ls-files .claude/commands/ | grep steel-)"

# V-3: No steel skills tracked
test -z "$(git ls-files .agents/skills/ | grep steel-)"

# V-4: constitution.md still tracked
test "$(git ls-files .steel/constitution.md)" = ".steel/constitution.md"

# V-5: .steel/.gitignore still tracked
test "$(git ls-files .steel/.gitignore)" = ".steel/.gitignore"

# V-6, V-7, V-8: Check ignore patterns
git check-ignore .steel/config.json
git check-ignore .claude/commands/steel-init.md
git check-ignore .agents/skills/steel-init/SKILL.md

# V-9: Tests pass
npm test
```

## Risks and Mitigations

- **Risk:** `xargs -r` not available on macOS (BSD xargs). **Mitigation:** Use conditional check before piping.
- **Risk:** Files on disk deleted. **Mitigation:** Using `--cached` flag ensures only index is affected.
- **Risk:** Non-steel files affected. **Mitigation:** Patterns are specific (`steel-*` prefix, `.steel/*` with negations).

## Dependencies

None. This change has no runtime code dependencies.
