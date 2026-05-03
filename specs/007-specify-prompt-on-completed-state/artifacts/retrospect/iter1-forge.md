# Retrospect — 007-specify-prompt-on-completed-state

## Workflow Summary

| Stage | Iterations | Verdict path | Notes |
|---|---|---|---|
| specification | 2 | REVISE → APPROVE | iter1 had 4 BLOCKING (invented CLI, gitignored-file commit, contradictory FR-3, complex FR-1) |
| clarification | 1 | APPROVE | first-pass; resolved 3 OQs + 2 Ws + 5 Ns |
| planning | 3 | REVISE → REVISE → APPROVE | iter2 introduced new BLOCKING (`--preserve-history` flag inconsistency from iter1 fix) |
| task_breakdown | 1 | APPROVE | first-pass; 8-task DAG, plan cross-check clean |
| implementation | 8 × 1 | all APPROVE first-pass | 8 tasks T1-T8, all green first iteration |
| validation | 2 | REVISE → APPROVE | iter1 REVISE was report-bookkeeping only (Summary count, line citations) |
| retrospect | 1 | (in progress) | this report |

- **Forge:** Claude (me, current session).
- **Gauge:** Claude (fresh-context subagents per `config.gauge.provider == "claude"`).
- **Total Forge-Gauge cycles:** 17 (across 6 stages, excluding retrospect).
- **Skills invoked:** none (`skillsUsed.* = []` for every stage). This spec is meta workflow-tooling — no SystemVerilog / Verilator / Cocotb / release skills applied.
- **Lines added:** ~150 production (workflow.ts +3, state.ts +9, cli.ts +8, steel-specify.md +29, tests +~95). Test count: 122 → 142 (+20).

## Memories to Save

### M-1 — Verify multi-site consistency when applying single-issue Forge revisions

- **Type:** `feedback`
- **Name:** `feedback_forge_revise_consistency.md`
- **Content:** When the Forge revises code in response to a Gauge issue, verify the fix is applied consistently across **every** site that touches the issue, not just the most obvious one. Single-site fixes can silently introduce new contradictions.
- **Evidence:** `specs/007-specify-prompt-on-completed-state/artifacts/planning/iter2-gauge.md` flagged a NEW BLOCKING (`--preserve-history` flag inconsistency) introduced by iter1 → iter2: the flag was dropped in Phase 2 (CLI primitive), but Phase 4a (slash command) still invoked `steel state reset --preserve-history` and the Risks section still described it as "REQUIRED". Three coupled sites; only one was fixed in iter2.
- **Why:** Forge-Gauge loops add iterations and erode trust when a "fix" produces a new defect. Saves at least one full revise cycle per occurrence. Non-obvious because the natural mental model is "address the issue", not "audit every coupled site".
- **How to apply:** After a forge revision targeting a specific issue, before submitting to gauge: `grep` the project for every name/string referenced in the gauge feedback and confirm consistency across all matches.

### M-2 — Validation reports must regenerate line citations against the committed file

- **Type:** `feedback`
- **Name:** `feedback_validation_line_citations.md`
- **Content:** When a Forge validation report cites file:line ranges, regenerate the line numbers against the COMMITTED file at write-time, not against the agent's memory of where things were when planning. Line numbers drift as the same file accumulates edits across tasks.
- **Evidence:** `specs/007-specify-prompt-on-completed-state/artifacts/validation/iter1-gauge.md` WARNING flagged systematic 6-30 line drift across all `commands/state.test.ts` citations because the validation iter1 cited lines from earlier mental snapshots. iter2 was REVISE solely to refresh citations; substantive verdicts were unchanged.
- **Why:** Citation drift degrades audit value (reviewer can't navigate to evidence) and forces a full revise cycle that adds zero substantive value. Easy to prevent at write-time, painful to fix after.
- **How to apply:** Validation Forge runs `grep -n` for each cited symbol/string before writing the report, not from memory.

### M-3 — Hoisted `vi.mock` in vitest must preserve `die`'s throw semantics

- **Type:** `feedback`
- **Name:** `feedback_vitest_mock_die_throw.md`
- **Content:** When a vitest test file hoists `vi.mock('../src/utils.js', ...)` to inject a `confirm` mock or similar, the mock factory MUST preserve `die`'s throw semantics: `die: (msg: string) => { throw new Error(msg); }`. A no-op `die` mock silently swallows validation errors that should crash the test.
- **Evidence:** `commands/clean.test.ts:9-18` is the established pattern; plan iter1-gauge W-1 explicitly required Implement-stage agents to mirror it. tasks.md T4 #2 codified the requirement.
- **Why:** Steel-Kit code uses `die(msg)` for fail-fast validation. If the mock makes `die` a no-op, the affected function silently returns instead of failing, and tests pass when they shouldn't. Subtle.
- **How to apply:** Whenever adding a hoisted utils mock, copy the full mock block from `commands/clean.test.ts:9-18` rather than constructing one from scratch.

## Skill Updates

No Steel-Kit skills (e.g., systemverilog-core, sv-gen, verilator-cmake) were invoked during this workflow — `skillsUsed.* = []` for every stage. The spec was meta workflow-tooling; no domain skill applied.

**Workflow command observations:**

- **`/steel-validate` canonical (`resources/commands/steel-validate.md`):** The "Self-check" step (3.e) currently says "Count PASS/FAIL/DEFERRED in Results; verify Summary matches" and "For every cited line number, grep the source to confirm." Both are correct in intent but the second was not honored in this workflow's iter1. **Proposed change:** add a stronger imperative — "Before writing the Summary line, run `grep -n` for each cited symbol and write the actual line number observed; do not estimate." The current wording is gentle enough that a Forge agent can rationalize skipping it.
  - **Issue:** validation iter1 had ~30-line drift across multiple citations because the grep-confirm step was treated as advisory. Evidence: `artifacts/validation/iter1-gauge.md`.
  - **Expected impact:** validation REVISE rate drops for the bookkeeping-only failure mode; saves ~1 iteration per validation run.

- **`/steel-specify` canonical (`resources/commands/steel-specify.md`):** This spec ITSELF added the only meaningful change (step 0a). No further changes from this run. The verbatim-prompt-as-blockquote markdown convention (`> "..."`) is a stylistic deviation from spec FR-3's bare-text verbatim, flagged in validation iter2 as NOTE; not a defect, but worth a one-line clarification in future spec authoring guidance.

- **`/steel-implement` canonical:** worked exactly as advertised. The "NO SKIPPING GAUGE" rule + per-task forge-gauge artifacts produced 8 first-iteration APPROVE verdicts on a non-trivial spec. No proposed changes.

## Process Improvements

- **Bottleneck: planning took 3 iterations; the others took 1-2.** Root cause: planning iter1 fabricated a `steel specify` CLI surface that doesn't exist (`src/cli.ts:48-52` excludes per-stage workflow verbs). The Forge had read `commands/specify.ts` (which exports `cmdSpecify`) and assumed it was wired through `cli.ts`. **Proposed fix:** when proposing CLI surface changes in a plan, verify the registration in `src/cli.ts` (not just the `commands/*.ts` export). Could be added to plan prompt rendering as a checklist item.
  - **Evidence:** `artifacts/planning/iter1-gauge.md` B-1; spec iter1 also caught this same fabrication (`artifacts/specification/iter1-gauge.md` B-1).
  - **Expected impact:** 1 fewer planning iteration on specs that touch CLI.

- **Forge-Gauge dynamics: 6 REVISE verdicts, all real defects.** Classification:
  - spec iter1 REVISE: 4 BLOCKING (invented CLI surface, commit on gitignored file, contradictory FR-3, complex FR-1). All real.
  - planning iter1 REVISE: 3 BLOCKING (wrong byte-format assertion, missing FR-7 placement test, missing FR-5 decline test). All real, all caught real-test-coverage gaps.
  - planning iter2 REVISE: 1 BLOCKING (`--preserve-history` site-inconsistency self-introduced by iter2 fix). Real defect; would have caused runtime CLI error if shipped (Commander.js rejects unknown options).
  - validation iter1 REVISE: 2 WARNINGs (Summary count off, line citations drifted). Real audit-trail defect, not a substantive verdict error.
  - **Zero verdicts classified as "unnecessary churn".** All Gauge feedback was actionable.

- **Constitution gaps:** none surfaced. All clarification decisions resolved cleanly under existing principles (1-6).

- **Workflow gaps:** none. The 7-stage cadence (spec → clarify → plan → tasks → impl → validate → retrospect) handled this meta-tooling change cleanly. The acknowledged trade-off where AC-7 (cancel byte-identical state) cannot be unit-tested (no TS code path executes on cancel) was correctly identified at spec time, surfaced in planning, and accepted at validation time without forcing additional iterations.

- **Cross-stage observation: skills tracking is unused on meta-tooling specs.** Six stages all have `skillsUsed: []`. Not a defect — there genuinely was nothing to apply — but it's worth noting that the `set-skills` tracking exists primarily for domain specs (RTL, hardware verification). For meta workflow-tooling specs in Steel-Kit itself, the field will always be empty; consider whether the prompt should ask Forge to leave it `[]` explicitly rather than treating empty as "forgot to populate".
