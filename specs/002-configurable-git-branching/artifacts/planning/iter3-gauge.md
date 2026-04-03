## Findings

### ARCHITECTURE: Re-init preservation plan does not match the current config write path
**Severity**: major  
**Details**: The plan says `commands/init.ts` will "read existing config, merge `git` sub-object, write back via `saveConfig()`" while leaving `saveConfig()` unchanged. But `cmdInit()` currently calls `initConfig()` first, and `initConfig()` eagerly writes a fresh normalized config file before returning. The current config merge path only preserves known fields and drops unknown top-level keys. The plan does not reliably satisfy FR-27/AC-27.  
**Suggestion**: Either refactor `initConfig()` so it no longer writes before the final merged config is assembled, or add a raw read/merge/write path for re-init that preserves unknown keys.

### BEHAVIOR: Legacy `spec/` compatibility warning is likely to still produce drift failures
**Severity**: major  
**Details**: The plan says `checkDrift()` should use the configured prefix and "add legacy-prefix warning." But current drift logic emits failures whenever `state.branch` differs from expected branch. If configured prefix is `feature/` and current branch is `spec/002-test`, existing checks will fail unless the legacy case is explicitly exempted. This violates FR-23/AC-12's intent of a compatibility warning, not failures.  
**Suggestion**: Specify that when configured prefix is not `spec/` but current branch is `spec/<specId>`, `checkDrift()` treats that as a recognized compatibility case and suppresses normal branch-mismatch failures, emitting only the targeted warning.

### TESTING: No command-level test proves invalid or colliding `--id` aborts before side effects
**Severity**: minor  
**Details**: The test plan covers invalid `--id` and collision only at the unit level. The `commands/specify` integration tests cover only happy paths. FR-14 and FR-15a remain partially unproven at the command level.  
**Suggestion**: Add `commands/specify` tests for invalid `--id` and existing-directory collision that assert no branch creation or spec file creation occurs.

## Summary

Iteration-2 issues are addressed. Remaining problems are implementation-shape: re-init persistence not grounded in real config write path, doctor compatibility case under-specified, and one no-side-effects guarantee untested.

## VERDICT: REVISE
