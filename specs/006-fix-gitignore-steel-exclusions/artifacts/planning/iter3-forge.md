# Implementation Plan — Iteration 3

## Overview

This is a repository configuration change only — no runtime code modifications. `commands/init.ts` is intentionally not changed in this spec; root `.gitignore` (FR-1) is the primary defense against tracking generated files, and it is unaffected by `steel-init` re-runs.

## Files to Modify

1. **`.gitignore`** (project root) — Add steel-kit exclusion rules
2. **`.steel/.gitignore`** — Replace with wildcard-based pattern

## Files to Remove from Index (not disk)

All currently-tracked files matching the new ignore patterns:
- All tracked files under `.steel/` **except** `.steel/.gitignore` and `.steel/constitution.md` (currently: `.steel/config.json`, but any other tracked `.steel/` files would also be removed)
- All tracked files matching `.claude/commands/steel-*` (currently 14 command files)
- All tracked files and directories matching `.agents/skills/steel-*/` (currently 14 skill directories)

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

**Critical:** The `!` negation lines must come after `.steel/*`. Append as a block.

### Step 2: Update `.steel/.gitignore`

Replace entire file contents with:

```
# Ephemeral working state — do not commit
*
!.gitignore
!constitution.md
```

### Step 3: Remove tracked files from git index (portable, macOS + Linux)

Use `git ls-files` with conditional checks to avoid passing empty args to `git rm --cached`:

```bash
# Remove .steel/ files (except .gitignore and constitution.md)
files=$(git ls-files .steel/ | grep -v -E '^\.steel/(\.gitignore|constitution\.md)$')
if [ -n "$files" ]; then
  echo "$files" | xargs git rm --cached
fi

# Remove .claude/commands/steel-* files
files=$(git ls-files '.claude/commands/steel-*')
if [ -n "$files" ]; then
  echo "$files" | xargs git rm --cached
fi

# Remove .agents/skills/steel-*/ files
files=$(git ls-files '.agents/skills/steel-*')
if [ -n "$files" ]; then
  echo "$files" | xargs git rm --cached
fi
```

This approach:
- Works on both macOS (BSD) and Linux (GNU) — no `xargs -r` dependency
- Handles empty file lists gracefully (no-op per FR-3)
- Uses `git ls-files` for pattern matching rather than hard-coded file lists
- Only removes files from the index (`--cached`), preserving disk copies (NFR-1)

### Step 4: Commit

```bash
git add .gitignore .steel/.gitignore
git commit -m "chore(gitignore): exclude steel-kit generated files"
```

The staged index removals from step 3 are included automatically.

## Verification (post-commit)

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

# AC-4 / NFR-2: Non-steel files remain tracked (if any exist)
# Record non-steel tracked files before the change, then verify they survive.
# Before implementation: capture baseline
#   before_commands=$(git ls-files .claude/commands/ | grep -v steel-)
#   before_skills=$(git ls-files .agents/skills/ | grep -v steel-)
# After commit: verify same files are still tracked
#   after_commands=$(git ls-files .claude/commands/ | grep -v steel-)
#   after_skills=$(git ls-files .agents/skills/ | grep -v steel-)
#   test "$before_commands" = "$after_commands"
#   test "$before_skills" = "$after_skills"
# If no non-steel files exist (both empty), both tests pass trivially.

# V-9: Tests pass
npm test
```

## Scope Notes

- **No runtime code changes.** This is a `.gitignore`-only fix per NFR-4.
- **`commands/init.ts` not modified.** It still writes the old `.steel/.gitignore` content. A re-init with overwrite regresses FR-2's defense-in-depth, but root `.gitignore` (FR-1) remains the primary defense and is unaffected. This is an accepted out-of-scope limitation (see spec Out of Scope).

## Risks and Mitigations

- **Risk:** Files deleted from disk. **Mitigation:** `--cached` flag ensures only index is affected.
- **Risk:** Non-steel files affected. **Mitigation:** Patterns are specific (`steel-*` prefix, `.steel/*` with negations). AC-4 before/after comparison confirms.
- **Risk:** Empty `git rm --cached` args. **Mitigation:** Conditional `[ -n "$files" ]` check before xargs.

## Dependencies

None. This change has no runtime code dependencies.
