# T2 — Forge Artifact (iteration 1)

## Files Changed
- `commands/state.ts` — added `createInitialState` to the workflow imports (line 2); added `export async function cmdStateReset(): Promise<void>` near the bottom of the file (just before the type re-export at line 184).
- `src/cli.ts` — added `cmdStateReset` to the existing import from `../commands/state.js` (line 29); added `stateCmd.command('reset')` registration immediately after the `advance-stage` block (lines 230-235).

## Key Decisions
- Helper takes no parameters and returns no data — pure side-effect (writes state.json, logs success). Mirrors the shape of existing `cmdStateAdvance`.
- `--description` text on the CLI flag explicitly says "does NOT touch specs/, tasks.json, or git tags — see /steel-clean for full reset" so a curious user reading `steel state --help` is not misled into using this as a destructive verb.
- No flags. The plan's iter3 dropped the misleading `--preserve-history` no-op flag (gauge W-3); kept that decision.
- Command placed alphabetically by registration order (after `advance-stage`, before `mark`) to match the existing layout pattern.

## Deviations from Plan
None. Implementation matches plan Phase 2a/2b verbatim and tasks.md T2 verbatim.

## Tests Added
None — tests live in T3.

## Test Results
- `npm run build` — exit 0 (cmdStateReset import resolves; CLI subcommand type-checks).
- `node dist/src/cli.js state --help` — emits `reset` row with the correct description text. Verifies wiring end-to-end.

## Covers
FR-4 (CLI primitive used by FR-4 reset path), FR-9 (no per-stage CLI verb added — `reset` is a state-mutation primitive in the same family as `mark`/`init`/`iter`/`advance-stage`).
