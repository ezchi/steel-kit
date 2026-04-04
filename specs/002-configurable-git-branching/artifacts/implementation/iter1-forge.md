# Implementation — Forge Output (Iteration 1)

## Summary

All 14 tasks across 5 phases have been implemented for the Configurable Git Branching Workflow Support feature.

## Files Created
- `src/git-config.ts` — Preset registry, resolution logic, 4 validation functions
- `src/spec-id.ts` — Spec ID generation, slugification, collision detection
- `src/git-config.test.ts` — 30 unit tests
- `src/spec-id.test.ts` — 13 unit tests
- `src/config.test.ts` — 7 unit tests for env vars and deep-merge
- `commands/init.test.ts` — 6 tests for git config prompts and re-init preservation

## Files Modified
- `src/config.ts` — Git config types, deep-merge, env vars, deferWrite option
- `src/git-ops.ts` — New `initBranch()` with configurable base/prefix
- `commands/specify.ts` — Wire `--id` flag, use `resolveGitConfig`, `generateSpecId`
- `src/cli.ts` — Added `--id` option to specify command
- `src/workflow.ts` — Recovery with configurable prefix + legacy fallback
- `src/doctor.ts` — Drift checks with configurable prefix, legacy compatibility
- `commands/init.ts` — Git config prompts, re-init preservation
- `steel.config.yaml` — Documented git config section
- `resources/commands/steel-specify.md` — Documented `--id` flag

## Verification
- `npm run build` — clean
- `npm run lint` — clean
- `npm test` — 67 tests, all passing
- Manual smoke test of all 3 presets — correct output
