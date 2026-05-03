# Steel-Kit Repository Guidance

## Steel-* Commands and Skills

This repo is the upstream source of the `steel-*` slash commands and skills (steel-init, steel-specify, steel-clarify, steel-plan, steel-tasks, steel-implement, steel-validate, steel-retrospect, steel-status, steel-next, steel-run-all, steel-clean, steel-doctor, steel-constitution).

When asked to change a `steel-*` command or skill, edit ONLY the source under `resources/`:
- `resources/commands/<name>.md` — slash command source
- `resources/skills/<name>/SKILL.md` — skill source (when present)

DO NOT edit installed copies, even though they live inside this repo:
- `.claude/commands/<name>.md`
- `.agents/skills/<name>/SKILL.md`

These are downstream artifacts generated/synced from `resources/`. Edits there get overwritten on the next install/sync and don't propagate. The same prohibition applies to globally installed copies under `~/.claude/`.

If grep finds matching content under `.claude/commands/` or `.agents/skills/`, ignore those hits — they are install destinations, not source.

## CLI Surface Changes

When planning or implementing changes that add, remove, or rename CLI verbs, verify wiring in [`src/cli.ts`](src/cli.ts). An exported handler in `commands/*.ts` (e.g. `cmdSpecify` in `commands/specify.ts`) does **not** imply the verb is reachable — `src/cli.ts` is the source of truth for registered commands. Read it before proposing or implementing a plan that assumes a CLI verb exists.
