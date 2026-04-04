# Retrospect: Configurable Git Branching Workflow Support

## Summary

Implemented configurable git branching support for Steel-Kit, replacing hardcoded `spec/` prefix with workflow presets (steel, github-flow, gitflow), custom branch prefixes, a `--id` flag for custom spec identifiers, interactive setup during `steel init`, environment variable overrides, and backward compatibility with legacy `spec/` branches.

## Timeline

| Stage | Iterations | Notes |
|---|---|---|
| Specification | 5 | Comprehensive spec with 28 FRs, 34 ACs |
| Clarification | 4 | Resolved edge cases around validation, re-init, doctor |
| Planning | 5 | Codex gauge policy violation required prompt simplification |
| Task Breakdown | 5 | 14 tasks across 5 phases; dependency corrections needed |
| Implementation | 3 | Gauge caught real validation bugs in iter 1 |
| Validation | 2 | Gauge caught test coverage gaps for AC-9/10/11/12 |

## What Went Well

1. **Forge-Gauge loop caught real bugs**: The implementation Gauge found that `validateBranchPrefix('/')` was silently accepted, `resolveGitConfig` had truthiness bugs with empty strings, and the doctor legacy-prefix detection was overly broad. These would have been subtle production issues.

2. **Validation Gauge enforced honest coverage**: It correctly distinguished "implemented" from "tested" and required actual test evidence for AC-9/10/11/12 before approving.

3. **Modular design**: Separating `git-config.ts` and `spec-id.ts` from their consumers made unit testing straightforward — 77 tests with clear per-module coverage.

4. **Deep-merge config cascade**: The YAML → JSON → env var cascade with deep-merge for the `git` sub-object works correctly, verified by tests.

## What Could Be Improved

1. **Codex prompt sensitivity**: The planning Gauge hit a policy violation on iteration 3 due to role-assignment phrasing. Prompts to external LLMs need to avoid directive language like "You are the Gauge reviewer."

2. **Iteration ceiling pressure**: Several stages hit the 5-iteration max. The Gauge sometimes raised valid but incremental issues late in the loop. A priority-weighted review could help the Gauge focus on blocking issues first.

3. **Integration test gap**: Tasks 7 and 10 (Phase 2/3 integration tests for git-ops and specify command) were deferred during implementation due to the complexity of mocking git operations. These were partially addressed in validation but could benefit from more comprehensive end-to-end tests.

4. **Re-init flow complexity**: The `deferWrite` approach for config preservation, while correct, adds cognitive load. A simpler design might have `initConfig` always return-not-write, with the caller deciding when to persist.

## Metrics

- **Files created**: 6 (git-config.ts, spec-id.ts, 4 test files)
- **Files modified**: 9 (config.ts, git-ops.ts, specify.ts, cli.ts, workflow.ts, doctor.ts, init.ts, steel.config.yaml, steel-specify.md)
- **Tests**: 77 total (35 git-config, 13 spec-id, 7 config, 6 init, 13 doctor, 2 workflow, 1 command-installer)
- **Total commits**: ~25 (across specification through validation)

## Lessons for Future Specs

1. Start with validation test stubs alongside the task breakdown — don't defer test writing to the end.
2. Keep Gauge prompts factual and non-directive to avoid external LLM policy filters.
3. For validation, the Gauge should verify claims against actual test output, not just test file existence.
