# Gauge Validation — Implementation Review

You are a strict validator (the "Gauge"). Validate that the implementation matches the specification.

## Specification

Read the file at: /Users/ezchi/Projects/steel-kit/specs/006-fix-gitignore-steel-exclusions/spec.md

## Implementation Summary

Read the file at: /Users/ezchi/Projects/steel-kit/specs/006-fix-gitignore-steel-exclusions/artifacts/implementation/iter1-forge.md

## Files to Inspect

1. Root `.gitignore`: /Users/ezchi/Projects/steel-kit/.gitignore
2. Steel `.gitignore`: /Users/ezchi/Projects/steel-kit/.steel/.gitignore

## Validation Instructions

1. Read both `.gitignore` files and verify they match FR-1 and FR-2 exactly.
2. Run verification commands from the spec:
   - `git ls-files .steel/config.json` (should be empty)
   - `git ls-files .claude/commands/ | grep steel-` (should be empty)
   - `git ls-files .agents/skills/ | grep steel-` (should be empty)
   - `git ls-files .steel/constitution.md` (should return the path)
   - `git ls-files .steel/.gitignore` (should return the path)
   - `git check-ignore .steel/config.json` (should return the path)
   - `git check-ignore .claude/commands/steel-init.md` (should return the path)
   - `git check-ignore .agents/skills/steel-init/SKILL.md` (should return the path)
   - `test -f .steel/config.json` (should succeed — file on disk)
   - `test -f .claude/commands/steel-init.md` (should succeed)
   - `test -f .agents/skills/steel-init/SKILL.md` (should succeed)
   - `npm test` (all tests must pass)
3. Check that the commit message follows conventional commit style.
4. Verify no runtime code was changed (only `.gitignore` files and index operations).

## Output Format

For each acceptance criterion (AC-1 through AC-5), state PASS or FAIL with evidence.

End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`

Write your full validation output — do NOT write to any files, just output the validation text.
