# Project Constitution

## Governing Principles
1. Steel-Kit exists to make the Forge/Gauge loop produce higher quality code with as much safe automation as practical. Every feature must strengthen planning, implementation review, validation, or recovery rather than bypassing those controls.
2. Forge and Gauge are first-class peers with explicit responsibilities. Forge creates artifacts and executes work; Gauge critiques artifacts, tests assumptions, and blocks advancement when quality evidence is missing.
3. All workflow surfaces must stay behaviorally aligned across Codex, Gemini CLI, and Claude Code. Canonical prompts, commands, templates, and artifacts should be shared or generated from shared sources so one provider path does not drift from the others.
4. The workflow must remain auditable end to end. A user should be able to inspect prompts, generated artifacts, reviews, git commits, and stage transitions and reconstruct why the system advanced or requested revision.
5. Self-improvement is part of the product. Validation and retrospect outputs must feed back into prompts, templates, guidance, and workflow mechanics so repeated use improves reliability instead of only generating more artifacts.
6. Automation is subordinate to user control. Human approval gates, readable intermediate files, and deterministic state recovery take priority over opaque convenience.

## Technology Stack
- Runtime: TypeScript on Node.js 20+ with ES modules.
- CLI framework: `commander` for command routing and `@inquirer/prompts` for interactive setup.
- Process orchestration: `execa` for invoking provider CLIs and git operations.
- Configuration and data formats: JSON for `.steel/config.json`, YAML support via `yaml` for `steel.config.yaml`, Markdown for prompts, templates, specs, reviews, and constitutions.
- Quality and build tooling: TypeScript compiler (`tsc`) for builds and type-checking, Vitest for tests.
- Provider targets: OpenAI Codex CLI, Gemini CLI, and Claude Code must all be supported as Forge or Gauge providers.
- Source layout: runtime logic in `src/`, command entrypoints in `commands/`, canonical workflow content in `prompts/`, `templates/`, and `resources/commands/`.

## Coding Standards
- Use strict TypeScript with explicit `.js` import suffixes in source files and keep modules focused on one concern.
- Follow the existing repository style: 2-space indentation, single quotes, semicolons, and small composable functions.
- Keep provider-specific behavior isolated under `src/providers/`; cross-provider workflow logic belongs in shared orchestration modules.
- Treat `resources/commands/`, `prompts/`, and `templates/` as canonical workflow definitions. Provider-specific installed artifacts should be generated from these sources rather than edited independently.
- Preserve auditability in code structure: stage transitions, iteration handling, artifact paths, and commit/tag behavior should be easy to trace from the source.
- Prefer tests around configuration loading, provider parity, state recovery, command installation, artifact generation, and workflow gating. Any feature that changes Forge/Gauge interaction should add or update tests that prove the observable behavior.

## Development Guidelines
- Design changes around the full workflow, not a single command. If a feature affects Forge/Gauge interaction, verify its impact on generated artifacts, git history, recovery behavior, and user audit paths.
- Maintain parity for Codex, Gemini CLI, and Claude Code. New workflow capabilities should ship across all three provider surfaces in the same change unless a constraint is explicitly documented.
- Prefer canonical-source updates over duplicated edits. If a command or prompt changes, update the shared source and regenerate or synchronize downstream artifacts.
- Keep the system inspectable. Store intermediate artifacts in committed, readable Markdown where feasible, and avoid hiding key decisions exclusively in transient console output.
- Use retrospects and validation findings to drive self-improvement. Repeated failure modes should result in prompt, template, workflow, or test changes, not just one-off fixes.
- Before merging, run `npm test` and `npm run lint`. Run `npm run build` when command wiring, TypeScript types, or distribution output could be affected.
- Use conventional commit prefixes consistent with the repo history, such as `feat(...)`, `fix(...)`, `chore(...)`, and Steel workflow commits like `steel(...)`.

## Constraints
- Supported operating systems are Linux and macOS only. New features do not need to target Windows and should avoid Windows-specific behavior or assumptions.
- All core workflow changes must preserve compatibility with Codex, Gemini CLI, and Claude Code as supported LLM surfaces.
- Auditability is a hard requirement: the system must leave enough file and git evidence for a user to review Forge inputs, Gauge feedback, stage outputs, approvals, and revisions after the fact.
- Self-improvement mechanisms must remain user-auditable. Feedback loops should write understandable artifacts and code changes rather than relying on hidden heuristics or opaque remote state.
- The constitution gate is mandatory. Downstream stages must not proceed when `.steel/constitution.md` is still placeholder content.
- State recovery must continue to work from committed artifacts and git metadata so a workflow can be reconstructed on a fresh checkout without relying on gitignored runtime files alone.
