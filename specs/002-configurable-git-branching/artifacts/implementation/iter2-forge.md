# Implementation — Forge Output (Iteration 2)

## Changes from Iteration 1

Fixed all issues identified in Gauge review:

### BLOCKING fix: validateBranchPrefix('/') and validateComposedRef leading '/'
- `validateBranchPrefix` now throws for `'/'` instead of silently passing
- `validateComposedRef` rejects refs starting with `/`

### WARNING fix: resolveGitConfig validation
- Workflow is now validated against the preset list; invalid values fall back to 'steel'
- baseBranch/developBranch now use `!== undefined` checks instead of truthiness, catching empty strings

### WARNING fix: Legacy-prefix scope in doctor.ts
- `isLegacyCase` now requires the *live git branch* to start with `spec/`
- Stale `state.branch` alone no longer triggers legacy suppression

### Tests added (5 new)
- `validateBranchPrefix('/')` → rejects
- `validateComposedRef('/', '001-test')` → rejects
- `resolveGitConfig` with invalid workflow → falls back to steel
- `resolveGitConfig` with empty baseBranch → rejects
- `resolveGitConfig` with empty developBranch → rejects

Total: 72 tests, all passing.
