# Spec Diff — Clarification Iteration 1

## FR-8: Update canonical workflow-command files

### Before
```
The following files in `resources/commands/` reference the old flat tag format and MUST be updated to reflect the new `steel/<specId>/<stage>-complete` format:
- `resources/commands/steel-specify.md` — tag reference in step 7 (approval gate)
- `resources/commands/steel-clean.md` — tag cleanup instructions
- Any other `resources/commands/steel-*.md` files that reference `steel/<stage>-complete` tags

After updating canonical sources, regenerate or synchronize downstream provider artifacts (`.claude/commands/`, `.gemini/commands/`, `.agents/skills/`) to maintain provider parity per constitution principle 3.
```

### After
```
All 8 canonical command files in `resources/commands/` that reference the old flat tag format MUST be updated to `steel/<specId>/<stage>-complete`:
- `steel-specify.md:70` — `tag 'steel/<specId>/specification-complete'`
- `steel-clarify.md:70` — `tag 'steel/<specId>/clarification-complete'`
- `steel-plan.md:50` — `tag 'steel/<specId>/planning-complete'`
- `steel-tasks.md:52` — `tag 'steel/<specId>/task_breakdown-complete'`
- `steel-implement.md:103` — `tag 'steel/<specId>/implementation-complete'`
- `steel-validate.md:144` — `tag 'steel/<specId>/validation-complete'`
- `steel-retrospect.md:108` — `tag 'steel/<specId>/retrospect-complete'`
- `steel-retrospect.md:22` — `git log --oneline steel/<specId>/specification-complete..HEAD` (rev range — specId from state.json at runtime)
- `steel-clean.md:14, 22` — tag listing and cleanup patterns

After updating canonical sources, run `steel update` to synchronize downstream provider artifacts (`.claude/commands/`, `.gemini/commands/`, `.agents/skills/`).
```

### Reason
The original FR-8 only named 2 files with a vague catch-all. The full inventory is 8 files with 41 total references across 33 files. The retrospect command has a special case where the tag is used as a git rev reference, not just documentation.

## New section: Changelog (appended to spec.md)

Added changelog entry documenting the FR-8 expansion.
