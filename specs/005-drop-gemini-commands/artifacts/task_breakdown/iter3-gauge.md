# Gauge Review — Task Breakdown Iteration 3

### [BLOCKING] Doctor regression test won't catch Gemini surface diagnostics
- **Location**: Task 8c
- **Issue**: Gemini summaries use "Gemini command <name>.toml" not filesystem paths. Test asserting on `.gemini/commands/` in summary would pass even if checks not removed.
- **Suggestion**: Assert on `summary` containing "Gemini command" or assert no Gemini surface entries at all.

### [WARNING] Update-task wording doesn't enforce spec's surface description
- **Location**: Task 4
- **Issue**: Just removing "Gemini CLI" still allows "Codex CLI" which doesn't match shared-surface wording.
- **Suggestion**: Require updating to reference `.claude/commands/` and `.agents/skills/` surfaces.

VERDICT: REVISE
