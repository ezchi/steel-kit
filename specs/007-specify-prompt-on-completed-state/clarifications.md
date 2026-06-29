# Clarifications — 007-specify-prompt-on-completed-state

**Iteration:** 1
**Source items:**
- 3 Open Questions in `spec.md` (OQ-1, OQ-2, OQ-3) plus 1 inline `[NEEDS CLARIFICATION]` in FR-10 (same as OQ-1).
- 2 WARNINGs (W-1, W-2) flagged by iter2 gauge as clarify-stage material.
- 5 NOTEs (N-1..N-5) flagged by iter2 gauge as clarify-stage material.

Each item below is resolved with a constitution-grounded decision and the concrete spec.md edit it produces. Items grouped where they collapse into one decision.

---

## C-1 (resolves OQ-1, FR-10 inline NEEDS CLARIFICATION, N-2)

**Question:** Should the `isCompletedWorkflow(state)` rule be exposed as a new CLI subcommand (`steel state classify`) or read directly from the existing primitive (`steel state get --field stages.retrospect.status`)? And how does NFR-5 reconcile FR-1 and FR-10's test coverage?

**Decision:** Use the existing primitive at the slash-command boundary; keep `isCompletedWorkflow(state: WorkflowState): boolean` as an **internal TypeScript helper in `src/workflow.ts`** for use by tests and any future TS callers. Do NOT add a new CLI subcommand.

**Rationale:**
- Constitution principle on minimal scope ("don't add features beyond what the task requires"): the existing `steel state get --field stages.retrospect.status` already returns `complete` / `pending` / `in_progress` and is sufficient for the slash-command compare. Adding `steel state classify` introduces new CLI surface for one consumer.
- Constitution principle 3 (provider parity): the existing primitive is already used identically across Codex / Gemini / Claude paths.
- Single source of truth (the helper) is preserved at the TS layer, where tests can assert the rule directly without shelling out.
- N-2 (NFR-5 reconciliation): list as one combined test item — "FR-1/FR-10: `isCompletedWorkflow` truth table".

**spec.md edits:**
- FR-1 last paragraph: no change.
- FR-10: rewrite to "Add `isCompletedWorkflow(state: WorkflowState): boolean` as an internal TypeScript helper in `src/workflow.ts`, implementing the FR-1 rule. The slash command consults the rule via the existing `steel state get --field stages.retrospect.status` primitive (literal compare to `complete`); the helper is for TS callers and tests, ensuring the rule has one source of truth at the TS layer." Drop the `[NEEDS CLARIFICATION]` block.
- NFR-5: change the FR-1 bullet to read "FR-1/FR-10: `isCompletedWorkflow` truth table — `retrospect.status` of `complete` returns true; `pending` / `in_progress` return false; absence of `state.stages.retrospect` (corrupt input) returns false (no throw)."
- Open Questions: delete OQ-1.

---

## C-2 (resolves OQ-2)

**Question:** Should the `Previous Spec ID:` field appear only in the new `spec.md`, or also in downstream artifacts (`tasks.md`, `plan.md`, etc.)?

**Decision:** `spec.md` only.

**Rationale:**
- Constitution principle 4 (auditable end to end): a single committed reference is sufficient. Anyone reviewing `tasks.md` / `plan.md` for spec 008 can `git log` back through `specs/008-*/` and find `spec.md`'s `Previous Spec ID:` line.
- Replicating the field across downstream artifacts adds maintenance surface (every template would need to know about it) without strengthening the audit chain.
- Minimal scope: this spec changes the entry-point behavior, not the downstream artifact format.

**spec.md edits:**
- Open Questions: delete OQ-2 (the recommendation in OQ-2's body is now the resolution).

---

## C-3 (resolves OQ-3, N-1)

**Question:** When the user picks **y** but the new feature description's slug collides with an existing `specs/<full-spec-id>/` dir, `generateSpecId` throws (`src/spec-id.ts:46-50`). Should `0a` pre-empt this, and is the OQ-3 wording correct about the trigger?

**Decision:** Accept the existing throw as-is. Do NOT pre-empt. Correct OQ-3's trigger description per N-1: collision happens on the full spec ID (`NNN-slug` or `customId-slug`), not just the slug. With auto-numbering (`nextNum = max(existing) + 1`), the only realistic collision path is `--id <X>` where `<X>-<slug>` already exists from a prior manual run.

**Rationale:**
- Constitution principle on minimal scope: collision-on-`--id` is a separate failure mode unrelated to completed-state recovery. Mixing them would tangle two concerns.
- The existing throw at `src/spec-id.ts:46-50` produces a clear, actionable error message ("Spec directory '<x>' already exists. Use a different --id or remove the existing spec.").
- Pre-empting in `0a` would require duplicating the collision check in the slash command, which would drift from the TS source.

**spec.md edits:**
- Open Questions: delete OQ-3 (confirmed: existing throw is acceptable).
- Out of Scope: add a bullet "Pre-emptive slug-collision detection in step `0a`. The existing throw in `src/spec-id.ts:46-50` produces the right error when `--id <X>` plus the new slug collides with an existing spec dir."

---

## C-4 (resolves W-1: autoCommit === false case for FR-7)

**Question:** When `config.autoCommit === false`, the `Previous Spec ID:` field is written to `spec.md` but no automatic commit follows. Does this leave an audit-trail hole that violates constitution principle 4?

**Decision:** No hole. The field is still written to `spec.md` regardless of `autoCommit`. When the user (or a later automated commit) commits `spec.md`, the audit trail lands in git history. The `/steel-specify` flow MUST NOT add an automatic commit when `autoCommit === false` — that would violate the user's explicit `autoCommit: false` configuration.

**Rationale:**
- Constitution: "Automation is subordinate to user control." `autoCommit: false` means the user wants to control all commits; bypassing that for one corner case violates the principle.
- Audit trail integrity is preserved: the field is **in the working tree** as soon as `spec.md` is written, and `git status` will show it as untracked/modified. The audit chain becomes part of git history at the user's commit.
- This matches the existing pattern: every other forge step also gates its commit on `autoCommit`.

**spec.md edits:**
- FR-7: replace the last paragraph with: "If `config.autoCommit === true`, the existing forge commit at the end of step 6 (forge phase) carries this field naturally — no additional commit is required. If `config.autoCommit === false`, the `**Previous Spec ID:**` field is still written to `spec.md` (so it appears in `git status` and is captured by any subsequent commit), but `/steel-specify` does NOT add an automatic commit. This honors the user's `autoCommit: false` configuration per the constitution principle that automation is subordinate to user control."

---

## C-5 (resolves W-2 and N-3)

**Question (W-2):** AC-3 mentions `Other` as an example of invalid input. `Other` is leftover terminology from iter1's deleted `AskUserQuestion` framing (which iter2's W-2 dropped). Why is it called out?

**Question (N-3):** AC-9's "without modification" qualifier on existing tests is too strong — adding the `Previous Spec ID:` field rendering could legitimately require a snapshot update.

**Decision:**
- Remove `Other` from AC-3. The case-insensitive / whitespace-trimmed parsing rule in FR-3 already covers all gibberish; no example is needed.
- Soften AC-9 to allow legitimate snapshot updates.

**spec.md edits:**
- AC-3: change "is whitespace, gibberish, or `Other`" to "is whitespace, an unrecognized token, or empty".
- AC-9: change to "No existing test in `commands/clean.test.ts`, `src/workflow.test.ts`, `src/git-config.test.ts`, or `src/spec-id.test.ts` fails unless the failure is a deliberate snapshot update reviewed against this spec."

---

## C-6 (resolves N-4: spec.md template ordering / appended-only field)

**Question:** Where does `Previous Spec ID:` go in the new `spec.md`, and does any template file need updating?

**Decision:** The Forge LLM appends `**Previous Spec ID:** <X>` immediately after the existing `**Spec ID:**` line and before `**Status:**`, but ONLY when the **y** path was taken in step `0a`. Existing template `templates/spec.md` (verified) does NOT contain header fields — those are LLM-added per spec — so no template change is required.

**Rationale:**
- The current `templates/spec.md` is purely body sections (`## Overview`, `## User Stories`, ...); the `# Specification: <title>` header and `**Spec ID:**` / `**Status:**` / `**Created:**` block are added by the Forge directly.
- Appended-only means specs not started from a completed-workflow reset are unaffected — no `Previous Spec ID: none` clutter.

**spec.md edits:**
- FR-7: clarify the placement and add the no-template-change note. Insert after the example block: "Placement: insert immediately after `**Spec ID:**` and before `**Status:**`. The field is appended only when the **y** path of step `0a` was taken; specs created without a completed-workflow reset omit the line entirely. No `templates/spec.md` change is required because that template does not contain the header fields — they are Forge-LLM-added per spec."

---

## C-7 (resolves N-5: detecting `/steel-clean` decline from inside `/steel-specify`)

**Question:** `commands/clean.ts:46-49` returns silently on decline (`log.warn('Clean cancelled.')` then `return`) — no exit code, no machine-readable signal. How does `/steel-specify` distinguish "clean ran" from "clean declined" so it can either proceed (FR-5 step 2) or abort (FR-5 step 3)?

**Decision:** Detect by **state diff**: the slash command snapshots `state.specId` before invoking `/steel-clean`, then re-reads `.steel/state.json` after the invocation returns. If `state.specId` is now `undefined` (or `state.currentStage === "specification"` AND `state.stages.specification.status === "pending"`), clean ran successfully. Otherwise, clean was declined (state is unchanged).

**Rationale:**
- This is a slash-command-layer change requiring **no modification to `commands/clean.ts`**, which keeps the change scoped to the spec's stated boundary (FR is about `/steel-specify`, not `/steel-clean`).
- Constitution principle 6 (auditability via deterministic state recovery): the state file IS the canonical signal; using it as the success indicator matches the design.
- Robust against future changes to `clean.ts`'s logging — only depends on the contract that successful clean produces a fresh state.

**spec.md edits:**
- FR-5: insert a new step 2.5 between current steps 2 and 3: "**2.5. Detect `/steel-clean` outcome by state diff:** Before invoking `/steel-clean`, capture `previousSpecId = state.specId`. After `/steel-clean` returns, re-read `.steel/state.json`. If the reloaded state has `specId === undefined` (or `currentStage === 'specification'` AND `stages.specification.status === 'pending'`), `/steel-clean` ran to completion — proceed to step 3 of FR-5 (the existing 'proceed to step 1 of /steel-specify'). If the reloaded state still has `specId === previousSpecId`, `/steel-clean` was declined — abort with the FR-5 step 3 message."
- Renumber the existing FR-5 step 3 to step 4.
- NFR-5: add a test bullet "FR-5: `/steel-clean` decline detection — when clean's inner confirmation is declined, the state-diff check correctly identifies the decline and `/steel-specify` aborts."

---

## Summary of all spec.md edits

1. **FR-7:** add `autoCommit: false` paragraph (C-4); add placement + no-template-change note (C-6).
2. **FR-10:** rewrite to internal TS helper, drop `[NEEDS CLARIFICATION]` (C-1).
3. **FR-5:** add step 2.5 for state-diff detection, renumber existing step 3 → step 4 (C-7).
4. **AC-3:** drop `Other`, use "whitespace, an unrecognized token, or empty" (C-5).
5. **AC-9:** soften the "without modification" qualifier (C-5).
6. **NFR-5:** combine FR-1/FR-10 test bullet (C-1); add FR-5 decline-detection test (C-7).
7. **Out of Scope:** add slug-collision pre-emption bullet (C-3).
8. **Open Questions:** delete OQ-1, OQ-2, OQ-3 (resolved by C-1, C-2, C-3 respectively). Section becomes "None."

After these edits, `spec.md` will contain zero `[NEEDS CLARIFICATION]` markers and zero unresolved OQs.
