# Gauge Review: Implementation Plan for 005-drop-gemini-commands (Iteration 2)

You are the **Gauge**. Review the revised plan.

## Context

Iteration 1 raised:
1. [BLOCKING] Canonical resources contain hardcoded `$steel-` references → Phase 3 now includes step to replace `$steel-` with `/steel-` in `resources/commands/*.md`
2. [BLOCKING] Test plan doesn't specify where update tests go → Now explicitly creates `commands/update.test.ts` and extends `commands/init.test.ts`
3. [WARNING] AC-8 verification missing → Phase 5 now includes explicit AC-8 grep step

Read `specs/005-drop-gemini-commands/plan.md`, `specs/005-drop-gemini-commands/spec.md`, and `.steel/constitution.md`.

### [SEVERITY] Issue Title
- **Location**: section
- **Issue**: what's wrong
- **Suggestion**: fix

Severities: BLOCKING / WARNING / NOTE

End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`
