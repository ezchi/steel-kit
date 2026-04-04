# Task 8: Update canonical command files — Forge Iteration 1

## Files Changed
- `resources/commands/steel-specify.md` — modified (tag format updated)
- `resources/commands/steel-clarify.md` — modified (tag format updated)
- `resources/commands/steel-plan.md` — modified (tag format updated)
- `resources/commands/steel-tasks.md` — modified (tag format updated)
- `resources/commands/steel-implement.md` — modified (tag format updated)
- `resources/commands/steel-validate.md` — modified (tag format updated)
- `resources/commands/steel-retrospect.md` — modified (tag format updated in 2 places: rev range + tag creation)
- `resources/commands/steel-clean.md` — modified (tag listing and cleanup patterns updated to scoped format)

## Key Implementation Decisions
- All `steel/<stage>-complete` references → `steel/<specId>/<stage>-complete`
- `steel-retrospect.md` git log range: `steel/specification-complete..HEAD` → `steel/<specId>/specification-complete..HEAD`
- `steel-clean.md`: Updated both the preview listing and the deletion step to describe scoped cleanup with fallback to broad pattern.

## Deviations from Plan
- None.

## Tests Added
- None (command files are Markdown templates, not executable code).
