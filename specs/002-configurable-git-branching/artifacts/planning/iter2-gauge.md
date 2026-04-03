# Gauge Review — Planning Iteration 2

## Findings

1. **BLOCKING: Re-init preservation not sound.** `initConfig()` in `src/config.ts` rewrites the whole config when `skipWrite` is false. The plan says to "after provider prompts complete via initConfig(), separately read config, add/update git key" — but if `initConfig()` already overwrote the file, non-git fields may be gone before the merge. Need explicit refactoring: either split `initConfig()` into prompt-only + write phases, or bypass its write path during re-init.

2. **BLOCKING: Surface parity lacks automated tests.** The plan gives surfaces an implementation home (resources/commands/steel-specify.md) but Phase 5 "run steel update and verify" is manual. Need an automated test proving updated canonical markdown propagates into installed provider artifacts.

## Iteration 1 Issue Check

1. Provider-surface parity: **Partially resolved** (implementation home yes, automated test no)
2. `specify` command-level AC coverage: **Resolved**
3. Cyclic dependency: **Resolved**
4. Config cascade test layer / AC-27 clarity: **Partially resolved** (loadConfig tests yes, re-init design unsound)

VERDICT: REVISE
