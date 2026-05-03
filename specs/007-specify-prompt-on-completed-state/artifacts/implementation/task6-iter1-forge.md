# T6 — Forge Artifact (iteration 1)

## Files Changed
- `resources/commands/steel-specify.md` — inserted step `0a` block (29 lines) between current step `0.` (line 12) and current step `1.` (now at line 44).

## Key Decisions
- Verbatim insert per plan Phase 4a / tasks.md T6. No paraphrasing.
- Used em-dash (`—`, U+2014) in two places:
  - "this step is a no-op — proceed to step 1"
  - `/steel-clean did not complete — re-run /steel-specify when ready.`
  These match the plan and T5's verbatim assertions.
- Step numbering: `0a` between `0.` and `1.` preserves the existing 1-10 numbering of the rest of the file. No renumbering elsewhere.
- The block is self-contained: anything an interpreting LLM needs (the prompt text, the three branches, the y-path procedure, the clean-path detection mechanism, and the cancel-path message) lives within step `0a`.

## Deviations from Plan
None. Insert matches plan Phase 4a verbatim.

## Tests Added
None — T6 is a markdown insert. T5 will assert the verbatim strings; T7 will assert the propagation.

## Test Results
Verbatim-string presence verified via shell:
```
[1] A previous workflow
[1] case-insensitive
[1] whitespace stripped
[1] between **Spec ID:** and **Status:**
[1] Cancelled. Previous workflow
[1] /steel-clean did not complete — re-run /steel-specify when ready
```
All 6 substrings T5 will assert are present exactly once each.

## Covers
FR-1 (slash-command rule invocation), FR-2 (trigger order — between line 12 and former line 14), FR-3 (prompt content), FR-4 (y-path orchestration including invoke `steel state reset` from T2), FR-5 (clean-path orchestration with state-diff detection in steps 1-5 of `0a-clean`), FR-6 (cancel-path orchestration), FR-7 (placement rule prose).
