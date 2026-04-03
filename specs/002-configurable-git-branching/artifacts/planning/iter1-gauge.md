# Gauge Review — Planning Iteration 1

## Findings

1. **BLOCKING: Provider-surface parity for `specify`.** The plan updates only CLI/code paths but Steel-Kit's Claude/Gemini/Codex surfaces are generated from canonical command markdown in `src/command-installer.ts`. The current `specify` resource in `resources/commands/steel-specify.md` still hardcodes numeric IDs and `spec/` branches. Under the constitution, this feature needs an explicit implementation home and tests for those shared surfaces.

2. **BLOCKING: AC coverage overstated for `specify` wiring.** AC-6/7/8 are mapped to `initBranch()` integration tests only, but that does not verify FR-14/17/18: CLI option parsing, `cmdSpecify()` passing `customId`, `resolveGitConfig()` being called, and `state.branch` using the returned branch name. Need command-level tests, not just git-op tests.

3. **BLOCKING: Cyclic dependency.** `src/git-config.ts` depends on `src/config.ts` for `SteelConfig`, while `src/config.ts` adds `git?: GitConfig` from `src/git-config.ts`. Bidirectional type dependency needs resolution.

4. **WARNING: Config cascade tests at wrong layer.** AC-14/15 assigned to `resolveGitConfig()` but env overrides are applied in `loadConfig()`. AC-27 needs clarity on whether `initConfig()` is refactored or bypassed for merge-preserving re-init.

## Assessment

Phasing is correct. Architecture mostly simple but needs cycle resolution. Biggest real risks missed: command-surface drift and re-init config clobbering.

VERDICT: REVISE
