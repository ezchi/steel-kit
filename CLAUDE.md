# Steel-Kit Repository Guidance

## CLI Surface Changes

When planning or implementing changes that add, remove, or rename CLI verbs, verify wiring in [`src/cli.ts`](src/cli.ts). An exported handler in `commands/*.ts` (e.g. `cmdSpecify` in `commands/specify.ts`) does **not** imply the verb is reachable — `src/cli.ts` is the source of truth for registered commands. Read it before proposing or implementing a plan that assumes a CLI verb exists.
