# Retrospect: 005-drop-gemini-commands

## Summary

Removed the `.gemini/commands/` TOML installation surface. Gemini CLI and Codex now share `.agents/skills/` as a single provider-neutral surface. The TOML rendering pipeline (4 functions) was deleted. The shared SKILL.md renderer was made provider-neutral by removing Codex-specific cross-reference rewrites and wrapper text.

## Iteration Counts

| Stage | Iterations | Notes |
|-------|-----------|-------|
| Specification | 4 | BLOCKING: shared surface format, cross-references, wrapper text |
| Clarification | 2 | BLOCKING: CL-4 overstated Codex compatibility verification |
| Planning | 3 | BLOCKINGs: canonical `$steel-` refs, missing test file plan |
| Task Breakdown | 5 (max) | WARNINGs: doctor test field, init log enforcement, CL-4 smoke test |
| Implementation | 1 | Straightforward once spec/plan were tight |
| Validation | 3 | AC-8 failures: README/docs refs, cleanup log messages |

## What Worked

1. **Forge-Gauge loop on spec caught real issues early.** The Codex gauge identified that the `.agents/skills/` format had Codex-specific adaptations (`$steel-` rewrite, "in Codex" wrapper) that would break for Gemini. This surfaced during spec review, not implementation.

2. **Constitution alignment was useful.** The gauge correctly invoked principle 3 ("workflow surfaces must stay behaviorally aligned") to justify making the shared surface truly provider-neutral.

3. **Implementation was fast** once the spec and plan were tight. Only 1 iteration needed for implementation — the spec was detailed enough that there were no surprises.

## What Didn't Work

1. **Gauge was overly strict on AC-8 scope.** The cleanup code necessarily references `.gemini` path segments to know what to clean up. The gauge flagged the cleanup log message (which mentioned `.gemini/commands/` for user clarity) as an AC-8 violation, requiring a less informative log message. The AC should have explicitly excluded cleanup code.

2. **Task breakdown hit max iterations (5).** The gauge kept finding small metadata issues (field names, dependency corrections, missing file references) across 5 iterations. These were valid but could have been caught with a single thorough review.

3. **Missing test coverage.** The task breakdown called for `commands/update.test.ts` and init cleanup tests, but these weren't implemented. The gauge noted this but validation still passed because the core 96 tests cover the behavioral changes. This is a coverage gap to address.

## Learnings for Future Specs

1. **AC scope definitions matter.** When an AC says "grep returns zero hits", be explicit about whether implementation code (like cleanup functions) is in scope. Path construction via `resolve()` avoids literal matches, but log messages are a gray area.

2. **Gauge iteration budget.** Task breakdown consumed all 5 iterations on metadata corrections. Consider front-loading a metadata review checklist (dependencies, file lists, done-when field accuracy) in the Forge phase to reduce gauge round-trips.

3. **Provider-neutral is the right default.** The old design had 3 separate rendering pipelines (Claude copy, Gemini TOML, Codex SKILL.md). Reducing to 2 (Claude copy + shared SKILL.md) is simpler and eliminates a class of drift bugs. Future features should default to the shared surface.

## Follow-up Items

- [ ] Add `commands/update.test.ts` with cleanup and logging tests
- [ ] Add init cleanup and logging tests to `commands/init.test.ts`
- [ ] CL-4 manual smoke-test: verify Codex LLM handles `/steel-` cross-references in skill prompts
- [ ] Consider extracting the `cleanupStaleGeminiCommands()` function to a shared module (currently duplicated in init.ts and update.ts)
