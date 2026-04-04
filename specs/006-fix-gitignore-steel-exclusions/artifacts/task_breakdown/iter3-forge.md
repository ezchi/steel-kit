# Task Breakdown — Iteration 3

## Execution Note

All tasks are executed sequentially within the implementation stage by the Forge agent. Tasks 1-6 run in the same shell context. However, for robustness, AC-4 baselines are persisted to temp files rather than relying on shell variable lifetime.

## Tasks

### Task 1: Capture pre-change baseline for AC-4 verification
**File:** N/A (shell commands only)
**Description:** Record non-steel tracked files under `.claude/commands/` and `.agents/skills/` to temp files before any changes.
**Commands:**
```bash
git ls-files .claude/commands/ | grep -v steel- > /tmp/steel-006-before-commands.txt || true
git ls-files .agents/skills/ | grep -v steel- > /tmp/steel-006-before-skills.txt || true
```
**Note:** `|| true` prevents non-zero exit from `grep -v` when no non-steel files exist.
**Acceptance:** Baseline files created (may be empty if no non-steel files exist).

### Task 2: Update root `.gitignore` (FR-1)
**File:** `.gitignore`
**Description:** Append steel-kit exclusion block to root `.gitignore`.
**Change:** Append:
```
# Steel-Kit generated files
.steel/*
!.steel/.gitignore
!.steel/constitution.md
.claude/commands/steel-*
.agents/skills/steel-*/
```
**Acceptance:** File contains the new block. Negation lines come after `.steel/*`.

### Task 3: Update `.steel/.gitignore` (FR-2)
**File:** `.steel/.gitignore`
**Description:** Replace contents with wildcard-based pattern.
**Change:** Replace entire file with:
```
# Ephemeral working state — do not commit
*
!.gitignore
!constitution.md
```
**Acceptance:** File contains only the new content.

### Task 4: Remove tracked generated files from index (FR-3)
**File:** N/A (git index operations)
**Description:** Use `git ls-files` + conditional `git rm --cached` to remove steel-generated files from the index while keeping them on disk.
**Commands:**
```bash
# Remove .steel/ files (except .gitignore and constitution.md)
files=$(git ls-files .steel/ | grep -v -E '^\.steel/(\.gitignore|constitution\.md)$' || true)
if [ -n "$files" ]; then echo "$files" | xargs git rm --cached; fi

# Remove .claude/commands/steel-* files
files=$(git ls-files '.claude/commands/steel-*')
if [ -n "$files" ]; then echo "$files" | xargs git rm --cached; fi

# Remove .agents/skills/steel-*/ files
files=$(git ls-files '.agents/skills/steel-*')
if [ -n "$files" ]; then echo "$files" | xargs git rm --cached; fi
```
**Note on path safety:** These paths contain no whitespace or special characters in this repository. NUL-delimiter mode (`git ls-files -z | xargs -0`) would be more robust but is incompatible with the `grep -v` filter needed for `.steel/` exclusions. Accepted limitation for this repo.
**Acceptance:** Matching files removed from index. Files remain on disk (verified in Task 6).

### Task 5: Commit all changes (FR-4)
**File:** N/A (git commit)
**Description:** Stage `.gitignore` and `.steel/.gitignore` changes, then commit with index removals.
**Commands:**
```bash
git add .gitignore .steel/.gitignore
git commit -m "chore(gitignore): exclude steel-kit generated files"
```
**Acceptance:** Single commit contains all changes.

### Task 6: Verify all acceptance criteria
**Description:** Run all verification commands from the spec (V-1 through V-9, AC-1 through AC-5).
**Commands:**
```bash
# V-1: .steel/config.json untracked
test -z "$(git ls-files .steel/config.json)"

# V-2: No steel commands tracked
test -z "$(git ls-files .claude/commands/ | grep steel- || true)"

# V-3: No steel skills tracked
test -z "$(git ls-files .agents/skills/ | grep steel- || true)"

# V-4: constitution.md still tracked
test "$(git ls-files .steel/constitution.md)" = ".steel/constitution.md"

# V-5: .steel/.gitignore still tracked
test "$(git ls-files .steel/.gitignore)" = ".steel/.gitignore"

# V-6, V-7, V-8: Check ignore patterns
git check-ignore .steel/config.json
git check-ignore .claude/commands/steel-init.md
git check-ignore .agents/skills/steel-init/SKILL.md

# NFR-1: Files still exist on disk
test -f .steel/config.json
test -f .claude/commands/steel-init.md
test -f .agents/skills/steel-init/SKILL.md

# AC-4: Non-steel files unchanged (compare against baseline)
git ls-files .claude/commands/ | grep -v steel- > /tmp/steel-006-after-commands.txt || true
git ls-files .agents/skills/ | grep -v steel- > /tmp/steel-006-after-skills.txt || true
diff /tmp/steel-006-before-commands.txt /tmp/steel-006-after-commands.txt
diff /tmp/steel-006-before-skills.txt /tmp/steel-006-after-skills.txt

# Cleanup temp files
rm -f /tmp/steel-006-before-commands.txt /tmp/steel-006-after-commands.txt
rm -f /tmp/steel-006-before-skills.txt /tmp/steel-006-after-skills.txt

# V-9: Tests pass
npm test
```
**Acceptance:** All checks pass. `diff` returns 0 (no differences).

## Task Order

1 → 2 → 3 → 4 → 5 → 6 (strictly sequential)

## Estimated Complexity

Low — 6 tasks, no runtime code changes, all git/file operations.
