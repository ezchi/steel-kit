# Gauge Review — Iteration 2

## Issues

### [BLOCKING] Shared Gemini/Codex surface is still behaviorally misaligned
- **Location**: FR-2, Out of Scope
- **Issue**: The spec makes `.agents/skills/` the canonical Gemini surface while explicitly preserving `adaptMarkdownForCodexSkill()` rewriting `/steel-` to `$steel-`. The canonical command set contains many `/steel-*` cross-references, so after this change Gemini will consume a surface with Codex-only command syntax. That conflicts with the constitution requirement that workflow surfaces remain behaviorally aligned across Codex, Gemini CLI, and Claude Code.
- **Suggestion**: Either include a requirement to render provider-correct cross-references for the shared surface, or explicitly scope the shared renderer so Gemini receives `/steel-*` while Codex receives `$steel-*` from the same canonical source.

### [BLOCKING] AC-7 is not repo-verifiable as written
- **Location**: AC-7, FR-7
- **Issue**: AC-7 says repo-wide grep should return zero `.gemini/commands/` hits outside prior spec artifacts and git history. This spec file itself is not a prior artifact and intentionally contains many such references, so the acceptance criterion is impossible to satisfy literally.
- **Suggestion**: Rewrite AC-7 to exclude the current feature spec and its review artifacts, or constrain the grep scope to implementation/docs surfaces such as `src/`, `commands/`, `resources/commands/`, `docs/`, and `README.md`.

### [WARNING] Migration cleanup is underspecified for re-init flows
- **Location**: FR-4, NFR-2
- **Issue**: Cleanup is required only in `steel update`. Existing users who rerun `steel init` in a repo that already has `.gemini/commands/` will still keep the stale TOML files and continue seeing duplicate Gemini commands. That weakens the backward-compatible migration story.
- **Suggestion**: Clarify whether `steel init` on an existing project must also remove stale `.gemini/commands/steel-*.toml` files, or explicitly document that `steel update` is the required migration path.

VERDICT: REVISE
