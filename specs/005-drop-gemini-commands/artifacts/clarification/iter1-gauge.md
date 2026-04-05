# Gauge Review — Clarification Iteration 1

### [BLOCKING] Shared-surface compatibility is asserted, not established
- **Location**: CL-4
- **Issue**: CL-4 says the `/steel-` prefixes in shared `SKILL.md` content were "verified by examining Codex CLI's skill invocation," but that verification is not present in this codebase. The local evidence points the other way: the code rewrites `/steel-` to `$steel-`, tests assert `$steel-` output, and user-facing text tells users to invoke `$steel-*`. Because FR-2 depends on this behavior to preserve Gemini/Codex parity, the clarification currently treats a critical external assumption as settled fact.
- **Suggestion**: Either cite the concrete external source proving Codex accepts shared `/steel-` references as intended, or rewrite CL-4 as an explicit assumption plus required validation step before implementation.

### [WARNING] The clarification omits a live naming mismatch that affects developer interpretation
- **Location**: Summary
- **Issue**: The repo uses `clarifications.md` in workflow code and command docs, not `clarification.md`. This mismatch is not caused by this feature, but it is an implementation-relevant ambiguity.
- **Suggestion**: Add a short note that this feature does not rename clarification-stage artifacts.

VERDICT: REVISE
