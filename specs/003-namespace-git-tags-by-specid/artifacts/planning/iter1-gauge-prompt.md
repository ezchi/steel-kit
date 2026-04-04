# Gauge Review: Implementation Plan — Iteration 1

You are the **Gauge**. Review the implementation plan for the "Namespace Git Tags by specId" feature.

## Constitution

Read `.steel/constitution.md` for project principles.

## What to Review

1. Read the plan: `specs/003-namespace-git-tags-by-specid/plan.md`
2. Read the spec: `specs/003-namespace-git-tags-by-specid/spec.md`
3. Read the clarifications: `specs/003-namespace-git-tags-by-specid/clarifications.md`
4. Read the current source files for context:
   - `src/git-ops.ts` (~line 92: tagStage)
   - `src/workflow.ts` (~lines 147-232, 266-303: recoverState, getCompletedStagesFromTags, advanceStage)
   - `commands/clean.ts` (full file)
   - `src/doctor.ts` (~lines 153-168, 416-459: safeListTags, checkStateRecovery)

## Review Criteria

1. **Spec coverage**: Does the plan address every FR, NFR, and AC in the spec?
2. **Architecture soundness**: Is the `resolveSpecId()` extraction the right approach? Are there simpler alternatives?
3. **Simplicity**: Does the plan avoid unnecessary complexity?
4. **Risk assessment**: Are the identified risks realistic? Are mitigations adequate?
5. **Testing strategy**: Does it cover the critical paths (namespaced creation, scoped recovery, scoped cleanup, legacy coexistence)?
6. **Constitution alignment**: Does the plan preserve auditability, provider parity, and user control?
7. **Implementation order**: Is the phased approach sensible? Are there dependency issues?

## Review Format

- **[BLOCKING]**: Must fix
- **[WARNING]**: Should address, not a blocker
- **[NOTE]**: Observation

End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`
