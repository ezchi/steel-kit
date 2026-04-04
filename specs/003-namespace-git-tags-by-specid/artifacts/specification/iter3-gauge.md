# Gauge Review — Iteration 3

- **[BLOCKING]**: FR-5 still leaves `clean` underspecified for the case where `state.json` exists but `state.specId` is null or stale. `loadState()` only invokes `recoverState()` when `state.json` is missing; if the file exists, it returns normalized state as-is. An implementation could satisfy FR-5 step 1, see null, and fall through to destructive `steel/*/*-complete` cleanup even though branch/spec-directory fallback would have recovered the active spec. Tighten FR-5 to require the full branch/spec-directory resolution path whenever the loaded state lacks a usable specId, and add an acceptance criterion for "existing state.json with null/stale specId".

VERDICT: REVISE
