# Gauge Review: Specification — Iteration 5 (Final)

You are the **Gauge**. This is the final iteration. Evaluate strictly but fairly.

## Constitution

Read `.steel/constitution.md`.

## Previous Issues Summary

All previous BLOCKING issues have been resolved:
- Iter 1: Canonical command updates → FR-8 added. Doctor specId resolution → FR-6 expanded.
- Iter 2: Clean specId resolution → FR-5 uses recoverState() order. Doctor ACs → AC-11, AC-12 added.
- Iter 3: State.json-exists-null-specId → FR-5 now requires branch/specs-dir fallback. AC-13 added.
- Iter 4: Doctor spec-file scope divergence → Documented as deliberate divergence in FR-6. The doctor's file scan was already broad before this feature; only the tag pattern is being changed.

## Specification

Read: `specs/003-namespace-git-tags-by-specid/spec.md`

For context: `src/git-ops.ts`, `src/workflow.ts`, `commands/clean.ts`, `src/doctor.ts`

## Review Format

- **[BLOCKING]**: Must fix
- **[WARNING]**: Should address, not a blocker
- **[NOTE]**: Observation

End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`
