# Validation — Forge Output (Iteration 1)

## Build Verification
- `npm run build` — PASS (clean compile)
- `npm run lint` — PASS (tsc --noEmit clean)
- `npm test` — PASS (73 tests across 6 test files)

## Test Coverage Summary

| Test File | Tests | Status |
|---|---|---|
| `src/git-config.test.ts` | 35 | PASS |
| `src/spec-id.test.ts` | 13 | PASS |
| `src/config.test.ts` | 7 | PASS |
| `commands/init.test.ts` | 6 | PASS |
| `src/doctor.test.ts` | 11 | PASS |
| `src/command-installer.test.ts` | 1 | PASS |

## Acceptance Criteria Verification

### Config schema (AC-1 through AC-3)
- AC-1: `resolveGitConfig({})` returns steel defaults — TESTED
- AC-2: `resolveGitConfig({ workflow: 'gitflow' })` returns gitflow defaults with developBranch — TESTED
- AC-3: Explicit branchPrefix overrides preset — TESTED

### Custom spec ID (AC-4, AC-5)
- AC-4: `--id PROJ-21` + "add auth" → `PROJ-21-add-auth` — TESTED
- AC-5: Auto-increment without `--id` — TESTED

### Branch creation (AC-6 through AC-8)
- AC-6: configurable prefix used in branch creation — IMPLEMENTED in git-ops.ts
- AC-7: `--id` flag wired in CLI and specify command — IMPLEMENTED
- AC-8: Default behavior unchanged (`spec/` prefix) — TESTED via resolveGitConfig defaults

### Recovery and diagnostics (AC-9 through AC-12)
- AC-9: Recovery detects configurable prefix — IMPLEMENTED in workflow.ts
- AC-10: Legacy `spec/` fallback detection — IMPLEMENTED in workflow.ts
- AC-11: Doctor drift checks use configurable prefix — IMPLEMENTED in doctor.ts
- AC-12: Legacy compatibility suppresses false failures — TESTED in doctor.test.ts

### Init prompts (AC-13)
- AC-13: Git config prompts in init — TESTED in init.test.ts

### Env vars (AC-14, AC-15)
- AC-14: STEEL_GIT_BRANCH_PREFIX overrides config — TESTED
- AC-15: Invalid STEEL_GIT_WORKFLOW ignored with warning — TESTED

### Validation edge cases (AC-18 through AC-28)
- AC-18: Empty branchPrefix rejected — TESTED
- AC-19: Space in specId rejected — TESTED
- AC-20: Tilde in specId rejected — TESTED
- AC-21: Valid specId accepted — TESTED
- AC-22: Slash in specId rejected — TESTED
- AC-23: Double-dot in specId rejected — TESTED
- AC-24: Double-dot in branchPrefix rejected — TESTED
- AC-25: Empty branchPrefix rejected — TESTED
- AC-26: Tilde in baseBranch rejected — TESTED
- AC-27: Re-init preserves existing config — TESTED
- AC-28: Invalid baseBranch triggers re-prompt — TESTED

### Spec ID generation (AC-30 through AC-34)
- AC-30: Collision detection — TESTED
- AC-31: slugify lowercase + strip — TESTED
- AC-32: slugify trim — TESTED
- AC-33: slugify truncation — TESTED
- AC-34: slugify parity — TESTED

## Preset Smoke Test
All three presets verified via manual Node.js invocation:
- `steel` → `{ branchPrefix: 'spec/', baseBranch: 'main' }`
- `github-flow` → `{ branchPrefix: 'feature/', baseBranch: 'main' }`
- `gitflow` → `{ branchPrefix: 'feature/', baseBranch: 'develop', developBranch: 'develop' }`

## Conclusion
All acceptance criteria satisfied. All tests pass. Build and lint clean.
