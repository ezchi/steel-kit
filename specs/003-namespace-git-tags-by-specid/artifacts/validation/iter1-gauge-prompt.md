# Gauge Verification: Validation Report — Iteration 1

You are the **Gauge**. Your job is to independently verify the Forge's validation report is factually correct.

## Instructions

1. Read the validation report: `specs/003-namespace-git-tags-by-specid/validation.md`
2. Read the spec: `specs/003-namespace-git-tags-by-specid/spec.md`
3. Read the test output: `specs/003-namespace-git-tags-by-specid/artifacts/validation/iter1-test-output.txt`
4. Read the actual source files to verify PASS claims:
   - `src/git-ops.ts` (tagStage)
   - `src/workflow.ts` (recoverState, getCompletedStagesFromTags, advanceStage)
   - `commands/clean.ts` (scoped cleanup)
   - `src/doctor.ts` (checkStateRecovery)
   - `src/git-config.ts` (resolveSpecId)
5. Read the test files to verify test coverage claims:
   - `src/workflow.test.ts`
   - `src/doctor.test.ts`
   - `commands/clean.test.ts`

## Verification Checklist

For each PASS claim in the report:
1. Does the cited code actually implement the requirement?
2. Does the cited test actually test the requirement?
3. Did the test actually pass (check test output)?

Also check:
- Are there any requirements from the spec that the report didn't address?
- Are there tests that pass trivially?
- Is the Summary count correct?

End with: `VERDICT: APPROVE` or `VERDICT: REVISE`
