# Gauge Review — Iteration 4

- **[BLOCKING]**: FR-6 updates doctor's tag lookup but does not align doctor's spec-file recovery evidence with `recoverState()`. Doctor currently checks spec files from ANY entry under `specs/`, while `recoverState()` scopes to the active specId. Doctor could report recovery possible because some other spec has files, even when the active spec has no evidence. The spec should require `checkStateRecovery()` to scope spec-file evidence using the same specId resolution path as `recoverState()`, or document and justify the divergence.

- **[NOTE]**: FR-8 wildcard clause ("any other `resources/commands/steel-*.md` files") is important and should be preserved.

VERDICT: REVISE
