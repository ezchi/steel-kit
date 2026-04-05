# Task Breakdown — Iteration 1

## Tasks

### Task 1: Capture pre-change baseline for AC-4 verification
**File:** N/A (shell commands only)
**Description:** Record non-steel tracked files under `.claude/commands/` and `.agents/skills/` before any changes.
**Commands:**
```bash
before_commands=$(git ls-files .claude/commands/ | grep -v steel-)
before_skills=$(git ls-files .agents/skills/ | grep -v steel-)
```
**Acceptance:** Baseline captured in shell variables.

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
files=$(git ls-files .steel/ | grep -v -E '^\.steel/(\.gitignore|constitution\.md)$')
if [ -n "$files" ]; then echo "$files" | xargs git rm --cached; fi

files=$(git ls-files '.claude/commands/steel-*')
if [ -n "$files" ]; then echo "$files" | xargs git rm --cached; fi

files=$(git ls-files '.agents/skills/steel-*')
if [ -n "$files" ]; then echo "$files" | xargs git rm --cached; fi
```
**Acceptance:** Matching files removed from index. Files remain on disk.

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
# V-1
test -z "$(git ls-files .steel/config.json)"
# V-2
test -z "$(git ls-files .claude/commands/ | grep steel-)"
# V-3
test -z "$(git ls-files .agents/skills/ | grep steel-)"
# V-4
test "$(git ls-files .steel/constitution.md)" = ".steel/constitution.md"
# V-5
test "$(git ls-files .steel/.gitignore)" = ".steel/.gitignore"
# V-6, V-7, V-8
git check-ignore .steel/config.json
git check-ignore .claude/commands/steel-init.md
git check-ignore .agents/skills/steel-init/SKILL.md
# AC-4
after_commands=$(git ls-files .claude/commands/ | grep -v steel-)
after_skills=$(git ls-files .agents/skills/ | grep -v steel-)
test "$before_commands" = "$after_commands"
test "$before_skills" = "$after_skills"
# V-9
npm test
```
**Acceptance:** All checks pass.

## Task Order

1 → 2 → 3 → 4 → 5 → 6 (strictly sequential)

## Estimated Complexity

Low — 6 tasks, no runtime code changes, all git/file operations.
