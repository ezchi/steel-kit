# Gauge Code Review — T6 Iteration 1

## Summary
Step `0a` inserted into `resources/commands/steel-specify.md` between line 12 (existing step 0) and line 42 (former-line-14 step 1). Insert purely additive (29 lines, 0 removed). All 6 verbatim substrings T5 will assert present exactly once each, em-dash (U+2014) verified by codepoint inspection.

## Issues

### BLOCKING / WARNING
None.

### NOTE
- N-1: Cancel-message uses `<PREV_SPEC_ID>` (bash variable form) while spec FR-6 prose uses `<previous specId>`. T5's assertion is on the prefix `Cancelled. Previous workflow` only, so passes. Spec-vs-plan prose divergence — plan Phase 4a uses `<PREV_SPEC_ID>` throughout and the insert matches plan; not a T6 defect.
- N-2: Step 8 (Delta Clarification Mode) nested under step 7 in this file is pre-existing structure unrelated to T6.

## Strengths
- All 6 T5-asserted substrings present exactly once each (verified via grep -c).
- Em-dash (U+2014) used in both required spots.
- Trigger order correct per FR-2.
- FR-1 fidelity: `steel state get --field stages.retrospect.status` → literal compare to `"complete"`.
- FR-3 prompt verbatim character-for-character.
- FR-3 normalization rule prose present with re-prompt-on-invalid contract.
- FR-4 y-path: invokes `steel state reset` (no flags); explicitly enumerates preserved specs/tasks.json/tags; placement rule with "ONLY when y-path was taken; otherwise absent".
- FR-5 clean-path: snapshot/re-read/classify; explicitly forbids bypassing inner confirmation; verbatim abort message.
- FR-6 cancel-path: verbatim message prefix; explicitly forbids state changes/commits/branches.
- FR-7 placement rule: "between **Spec ID:** and **Status:**" verbatim with bold markers intact.
- No regression: byte-level diff confirms steps 1-10 unchanged.

## Verdict Reasoning
Markdown-only insert. Every verifiable contract independently confirmed. NOTE is spec-vs-plan prose divergence followed consistently; does not block T5.

VERDICT: APPROVE
