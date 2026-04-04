# Gauge Review — Iteration 2

- **[BLOCKING]**: `FR-5` leaves `steel-clean`'s specId resolution too weak for a destructive operation. The spec says specId is known only from `state.json` or branch detection, but the actual recovery path already falls back to the `specs/` directory when branch detection fails (`workflow.ts` lines 153-171), and `cmdClean()` gets its `specId` through `loadState()` (`clean.ts` lines 18-20). As written, a developer could implement `clean` so that a repo with recoverable active spec context still falls into "unknown" mode and deletes `steel/*/*-complete` for every spec. That violates US-2 and constitution principle 6. Require `clean` to use the same deterministic resolution order as `recoverState()` before any global-tag fallback.

- **[WARNING]**: `FR-6` is now much clearer, but the acceptance criteria do not prove all of it. `AC-6` only says doctor "detects namespaced tags and reports state as recoverable." It does not explicitly cover the two critical branches introduced in `FR-6`: precedence of branch-derived specId over directory inspection, and the fallback to `steel/*/*-complete` when specId cannot be resolved at all. Add concrete ACs/tests for both cases.

- **[NOTE]**: The iteration-1 provider-parity issue is substantially addressed. `FR-8` now names canonical command updates and downstream synchronization, which aligns with constitution principle 3.

VERDICT: REVISE
