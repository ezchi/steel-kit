# Implementation — Iteration 1

## Changes Made

### 1. Updated `.gitignore` (FR-1)
Added steel-kit exclusion block:
```
# Steel-Kit generated files
.steel/*
!.steel/.gitignore
!.steel/constitution.md
.claude/commands/steel-*
.agents/skills/steel-*/
```

### 2. Updated `.steel/.gitignore` (FR-2)
Replaced with wildcard-based pattern:
```
# Ephemeral working state — do not commit
*
!.gitignore
!constitution.md
```

### 3. Removed tracked files from index (FR-3)
- `.steel/config.json` (1 file)
- `.claude/commands/steel-*.md` (14 files)
- `.agents/skills/steel-*/SKILL.md` (14 files)
Total: 29 files removed from git index, all preserved on disk.

### 4. Committed (FR-4)
Single commit: `chore(gitignore): exclude steel-kit generated files`

## Verification Results

All checks passed:
- V-1 through V-5: Tracking state correct
- V-6 through V-8: Ignore patterns confirmed
- NFR-1: Files exist on disk
- AC-4: No non-steel files affected (none existed)
- V-9: All 96 tests pass
