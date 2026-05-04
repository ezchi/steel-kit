Run clarification on the current specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `clarification`.
- `specs/<specId>/spec.md` must exist with `[NEEDS CLARIFICATION]` markers (or open questions surfaced during specify).

## Steps

1. Verify state: `steel state get` and confirm `currentStage` is `clarification`.

2. Mark in progress: `steel state mark --stage clarification --status in_progress`.

3. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the Forge prompt:
      ```
      steel render-prompt --role forge --stage clarification \
        --output .steel/tmp/clarify-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   b. **Read the rendered prompt and follow it.** It substitutes `{{CONSTITUTION}}`, `{{SPEC}}`, `{{BASE_BRANCH}}`, `{{FEEDBACK}}`. Identify every `[NEEDS CLARIFICATION]` marker and every other open question or implicit assumption in the spec.

      Then **interview the user one question at a time** to resolve each item. **No assumptions, no guessing.**

      - Ask exactly ONE focused clarifying question per turn, then wait for the user's answer before asking the next.
      - Do NOT formulate answers yourself from the constitution or project context. Do NOT batch multiple questions. Do NOT offer multiple-choice options in lieu of asking. Do NOT proceed to write `clarifications.md` until every open item has an explicit user answer.
      - On iteration N>1, the prior gauge feedback (`{{FEEDBACK}}`) may surface NEW open items the Gauge spotted; ask the user about those too, one at a time.
      - Record each Q&A pair verbatim as you go.
   c. Write `specs/$SPEC_ID/clarifications.md` strictly from the interview record. Each entry MUST include: the original ambiguity, the question you asked, the user's verbatim answer, and how the spec will be updated to reflect it. Do NOT include resolutions you authored without a corresponding user answer.
   d. Save artifact: `steel save-artifact --stage clarification --iter $N --role forge --content-file specs/$SPEC_ID/clarifications.md`.
   e. Commit: `steel commit-step --role forge --stage clarification --iter $N --msg "iteration $N output"`.

   ### Gauge Phase
   f. Render gauge prompt:
      ```
      FORGE_ART=specs/$SPEC_ID/artifacts/clarification/iter${N}-forge.md
      steel render-prompt --role gauge --stage clarification \
        --review-target $FORGE_ART \
        --output .steel/tmp/clarify-iter${N}-gauge-prompt.md
      ```
   g. Run gauge per `config.gauge.provider`: Task subagent (fresh context) if `claude`, else `steel run-gauge --provider <name> --prompt-file ... --output specs/$SPEC_ID/artifacts/clarification/iter${N}-gauge.md`.
   h. If subagent path: save with `steel save-artifact --stage clarification --iter $N --role gauge --content "$REVIEW"`.
   i. Commit: `steel commit-step --role gauge --stage clarification --iter $N --msg "iteration $N review — <VERDICT>"`.
   j. **Parse the verdict** from the last 10 lines of the gauge artifact (`VERDICT: APPROVE` or `VERDICT: REVISE`).

   ### User Review Gate — runs after every gauge iteration

   k. Show the user the parsed verdict, the gauge artifact path (`specs/$SPEC_ID/artifacts/clarification/iter${N}-gauge.md`), and a 2–3 line synopsis of the gauge's main points.

   l. Ask the user verbatim:
      > "Gauge iter ${N} → VERDICT: <APPROVE|REVISE>. Review at `<path>`.
      > [c]ontinue (respect verdict) / [o]verride (flip verdict) / [s]top"

   m. Read the response (case-insensitive, whitespace-trimmed). Re-prompt verbatim until the user enters exactly `c`, `o`, or `s`.

   n. Resolve the **effective verdict** from the user's choice:
      - **c (continue)**: effective verdict = gauge verdict.
      - **o (override)**: effective verdict = flipped gauge verdict.
        - On APPROVE→REVISE flip, ask verbatim: `"What should the next iteration address?"` Save the answer to `specs/$SPEC_ID/artifacts/clarification/iter${N}-user-feedback.md` with a top header, then `git add` and commit: `git commit -m "clarify($SPEC_ID): user override iter $N approve→revise"`. Use that file as `PRIOR_GAUGE` for the next iteration instead of the gauge artifact.
        - On REVISE→APPROVE flip: `git commit --allow-empty -m "clarify($SPEC_ID): user override iter $N revise→approve"`.
      - **s (stop)**: leave stage `in_progress`, print `"Stage paused at iter ${N}. Re-run /steel-clarify to resume."` and stop.

   o. Apply the **effective verdict**:
      - **APPROVE**: break the loop, go to step 4.
      - **REVISE**: `steel state iter --inc`. If `PRIOR_GAUGE` was not set by the override branch in step n, set it to the gauge artifact. Run the Complexity Gate (below), then loop back to step 3a.

   ### Complexity Gate — iteration > 8 (simplicity principle)

   After step o, check `state.iter`. The **first time** it crosses `> 8` (8 forge-gauge rounds completed without APPROVE), pause the loop. **Clarification that won't converge in 8 iterations means the underlying spec is too complex; the spec should be split.** Offer this gate at most once per workflow — if the user declines, do not offer again.

   1. Read `specs/$SPEC_ID/spec.md`, the in-progress `clarifications.md`, and the most recent gauge artifact. Identify which features in the spec are generating the disagreement and could be deferred without breaking the user's core intent.

   2. Ask the user verbatim (substituting your proposal):
      > "Clarification has gone through 8 forge-gauge iterations without approval — a red flag for over-complexity in the underlying spec. Recommend splitting it.
      >
      > **Keep in this spec (core feature):**
      > - <bulleted list — minimum that delivers the user's core intent>
      >
      > **Defer to follow-up specs:**
      > - <one bullet per deferred item, with a one-line rationale>
      >
      > Confirm split? (y/N)"

   3. Read the response.
      - **Anything other than `y`:** do not split. Fall through to the Max-iter cap. Do NOT offer the split again later in this workflow.
      - **y:** apply the split:
         i. Write `specs/$SPEC_ID/deferred.md` (overwrite if it exists), capturing each deferred item:
            ```markdown
            # Deferred Features — <SPEC_ID>

            Items removed from spec `<SPEC_ID>` during a complexity-driven split on <YYYY-MM-DD>. Each is a candidate for a future `/steel-specify` workflow.

            ## D1: <title>
            - **Original spec section:** <heading or FR-N>
            - **Rationale for deferral:** <one or two sentences>
            - **Suggested follow-up entry point:** <one-line description for a future /steel-specify run>
            ```
         ii. Edit `specs/$SPEC_ID/spec.md` in place: remove the deferred user stories, FRs, NFRs, and acceptance criteria; tighten cross-references; ensure the trimmed spec is internally consistent.
         iii. Edit `specs/$SPEC_ID/clarifications.md` to remove entries that referenced deferred items; the next Forge iteration will rebuild it from the trimmed spec.
         iv. Commit: `git add specs/$SPEC_ID/spec.md specs/$SPEC_ID/clarifications.md specs/$SPEC_ID/deferred.md && git commit -m "clarify($SPEC_ID): split — defer items to follow-up"`.
         v. Loop back to step 3a. Clear `PRIOR_GAUGE` so the Forge does not chase feedback that referenced removed scope.

   ### Max-iter cap
   p. On cap with no APPROVE, prompt "Continue for up to `<maxIterations>` more? (y/N)". Yes → continue. No → leave `in_progress`, stop.

4. **HUMAN APPROVAL GATE** — ask the user: **"Approve clarifications and advance to planning?"**
   - Approved: `steel state mark --stage clarification --status complete`, `steel tag-stage --stage clarification`, `steel state advance-stage`.
   - Rejected: collect new feedback and run a delta loop (same pattern as `/steel-specify` step 8); when delta is APPROVED, return to this gate.

5. Track skills: `steel state set-skills --stage clarification --skills <names>`.

6. Tell the user: "Clarification complete. Run `/steel-plan` to generate the implementation plan."
