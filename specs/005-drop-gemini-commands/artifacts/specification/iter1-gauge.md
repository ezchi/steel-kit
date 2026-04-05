# Gauge Review — Iteration 1

## Issues

### [BLOCKING] Shared Gemini/Codex surface is assumed, not specified
- **Location**: Overview, FR-1, AC-3
- **Issue**: The spec treats `.agents/skills/` as an already-valid shared Gemini/Codex surface, but the current implementation generates that directory with `renderCodexSkill()` and Codex-specific adaptations (`SKILL.md` frontmatter, `/steel-` to `$steel-`, `$ARGUMENTS` rewriting). The spec does not say whether that exact rendered format is the new canonical Gemini surface, or whether the renderer must change to preserve Gemini behavior. That is a direct compatibility gap against constitution principle 3.
- **Suggestion**: Add an explicit requirement that defines the canonical shared Gemini/Codex artifact format. Either state that the existing `SKILL.md` render is intentionally Gemini-compatible, or require a new shared renderer and acceptance tests proving Gemini can invoke the installed commands correctly from `.agents/skills/`.

### [WARNING] The spec misses some concrete integration points that will leave stale Gemini messaging behind
- **Location**: FR-2, FR-3, FR-7
- **Issue**: The named file list is incomplete. `commands/update.ts` also has a user-facing line saying Steel-Kit is updating commands for "Claude Code, Gemini CLI, and Codex CLI," and repo-wide search finds additional `.gemini/commands/` references outside the explicitly named files. As written, a developer can satisfy the spec and still leave inaccurate runtime/documentation text behind.
- **Suggestion**: Add a repo-wide cleanup requirement for `.gemini/commands/` installation-surface references, and explicitly call out the `commands/update.ts` pre-summary log line along with any docs that describe installed command surfaces.

### [WARNING] Test coverage requirements are too narrow for the behavioral changes
- **Location**: FR-5, AC-2, AC-4
- **Issue**: The spec only calls for command-installer and init-test updates. It does not require tests for the new `steel update` cleanup behavior or for `steel doctor` no longer expecting Gemini TOML artifacts. Those are core observable changes and are easy places for regressions.
- **Suggestion**: Add explicit tests for: `steel update` deleting `/.gemini/commands/steel-*.toml` and logging the cleanup; `runDoctor()` not emitting Gemini surface-missing/surface-stale diagnostics after the change; and init/update summaries no longer referencing Gemini command counts.

### [WARNING] AC-3 is not repo-verifiable as written
- **Location**: AC-3
- **Issue**: "Gemini CLI shows `/steel-*` commands from `.agents/skills/` with no duplicate warnings" depends on external CLI behavior, but the spec gives no deterministic verification method. That makes the acceptance criteria weaker than the rest of the document.
- **Suggestion**: Split AC-3 into a repo-verifiable requirement plus, if needed, a manual smoke-check. For example: verify no `.gemini/commands/` artifacts are installed, verify `.agents/skills/` artifacts are generated in the declared shared format, and document a one-time manual Gemini validation step if runtime confirmation is still required.

VERDICT: REVISE
