Review the entire workflow to extract learnings, memory candidates, and skill improvements using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `retrospect`.

## Steps

1. Verify state: `steel state get` and confirm `currentStage` is `retrospect`.
2. Mark in progress: `steel state mark --stage retrospect --status in_progress`.

3. Gather workflow artifacts in your context (the rendered Forge prompt already includes constitution, spec, and plan; you'll need to additionally read):
   - `specs/$SPEC_ID/clarifications.md` (if exists)
   - `specs/$SPEC_ID/tasks.md`
   - `specs/$SPEC_ID/validation.md`
   - All iteration artifacts under `specs/$SPEC_ID/artifacts/*/iter*-{forge,gauge}.md`
   - The `skillsUsed` field: `steel state get --field skillsUsed`
   - Git log for the spec branch: `git log --oneline steel/$SPEC_ID/specification-complete..HEAD`

4. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the Forge prompt:
      ```
      steel render-prompt --role forge --stage retrospect \
        --output .steel/tmp/retrospect-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   b. **Read the rendered prompt and follow it.** Produce the retrospect report with these sections:

      **## Workflow Summary** — stages completed, iterations per stage, total Forge-Gauge cycles, which LLM served as Forge vs Gauge, skills invoked at each stage.

      **## Memories to Save** — for each candidate, provide:
      - **Type**: `user`, `feedback`, `project`, or `reference`
      - **Name**: short identifier
      - **Content**: what to remember and why
      - **Evidence**: cite specific artifact(s) — `artifacts/<stage>/iterN-{forge|gauge}.md:section` or quoted passage. A memory without evidence is rejected.
      - **Rationale**: why non-obvious and worth persisting

      Focus on: user preferences during approval gates, project patterns not in the constitution, domain knowledge that informed decisions, external references discovered, what worked vs. what failed (feedback memories). Do NOT suggest memories derivable from codebase / git history / existing docs.

      **## Skill Updates** — for each skill in `skillsUsed`, evaluate:
      - Did the skill's guidance lead to good outcomes or cause friction?
      - Are there missing checks, templates, or patterns the skill should include?
      - Were there recurring Gauge feedback themes the skill should address upfront?

      Also evaluate the Steel-Kit workflow commands themselves:
      - Did any stage command's instructions cause confusion or unnecessary iterations?
      - Are there missing steps or unclear instructions?

      For each proposed update: **Skill** (which file), **Issue found** (cite specific artifact and passage), **Proposed change** (specific enough to apply), **Expected impact**.

      **## Process Improvements** — for each, provide issue, evidence, proposed fix:
      - **Bottlenecks**: which stages took most iterations? Cite back-and-forth artifacts and root cause.
      - **Forge-Gauge dynamics**: classify each REVISE verdict as (a) real defect, (b) valid standard, (c) unnecessary churn. Cite the specific gauge artifact for each.
      - **Constitution gaps**: principles to add/refine? Quote the artifact passage that exposed the gap.
      - **Workflow gaps**: missing or unnecessary stages? Ground in evidence.

   c. Write the report to `specs/$SPEC_ID/retrospect.md`.
   d. Save artifact: `steel save-artifact --stage retrospect --iter $N --role forge --content-file specs/$SPEC_ID/retrospect.md`.
   e. Commit: `steel commit-step --role forge --stage retrospect --iter $N --msg "iteration $N output"`.

   ### Gauge Phase — Evidence verification
   f. Render gauge prompt:
      ```
      FORGE_ART=specs/$SPEC_ID/artifacts/retrospect/iter${N}-forge.md
      steel render-prompt --role gauge --stage retrospect \
        --review-target $FORGE_ART \
        --output .steel/tmp/retrospect-iter${N}-gauge-prompt.md
      ```
   g. Run gauge per `config.gauge.provider`:
      - If `claude`: spawn a Task subagent (fresh context) with prompt: `Read and follow the instructions in .steel/tmp/retrospect-iter${N}-gauge-prompt.md. Verify every claim against the cited artifact evidence — read the artifacts, not just the report. End with exactly one VERDICT line.`
      - Else: `steel run-gauge --provider <name> --prompt-file ... --output specs/$SPEC_ID/artifacts/retrospect/iter${N}-gauge.md`.

   The Gauge MUST verify against evidence:
   1. **Memories**: read the cited artifact; reject any where evidence is missing, misquoted, or doesn't support the claim, or where the memory is derivable from codebase/git.
   2. **Skill updates**: read the cited artifact; reject vague suggestions like "improve error handling guidance".
   3. **Process improvements**: verify iteration counts and verdict classifications against actual gauge artifacts.
   4. **Missing insights**: are there patterns in the artifacts the Forge missed?

   h. If subagent path: `steel save-artifact --stage retrospect --iter $N --role gauge --content "$REVIEW"`.
   i. Commit: `steel commit-step --role gauge --stage retrospect --iter $N --msg "iteration $N review — <VERDICT>"`.
   j. Parse verdict. APPROVE → break. REVISE → `steel state iter --inc`, set `PRIOR_GAUGE`, loop.

   ### Max-iter cap
   k. On cap, prompt the user to extend; same as in `/steel-plan`.

5. After the loop, present the retrospect report and ask:
   **"Would you like me to apply any of these changes?"**
   - **Memories**: offer to save each proposed memory using the memory system.
   - **Skill updates**: offer to edit the specific skill/command files.
   - **Constitution updates**: offer to update `.steel/constitution.md`.

   The user can accept all, pick specific items, or decline.

6. Mark complete + tag (no advance — retrospect is final):
   - `steel state mark --stage retrospect --status complete`
   - `steel tag-stage --stage retrospect`

7. Show final summary: "Workflow complete! All stages including retrospect passed."
