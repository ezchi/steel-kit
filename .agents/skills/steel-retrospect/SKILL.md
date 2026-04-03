---
name: steel-retrospect
description: "Steel-Kit workflow skill: Review the entire workflow to extract learnings, memory candidates, and skill improvements using the Forge-Gauge loop."
---

# steel-retrospect

Use this skill when the user invokes `$steel-retrospect` or asks to run the corresponding Steel-Kit workflow step in Codex.

Review the entire workflow to extract learnings, memory candidates, and skill improvements using the Forge-Gauge loop.

## Prerequisites
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `retrospect`

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `retrospect`.

2. Gather all workflow artifacts:
   - `.steel/constitution.md`
   - `specs/<specId>/spec.md`
   - `specs/<specId>/clarifications.md`
   - `specs/<specId>/plan.md`
   - `specs/<specId>/tasks.md`
   - `specs/<specId>/validation.md`
   - All iteration artifacts in `specs/<specId>/artifacts/*/iter*-forge.md` and `iter*-gauge.md`
   - The `skillsUsed` field from `.steel/state.json`
   - Git log for the spec branch: `git log --oneline steel/specification-complete..HEAD`

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Analyze the entire workflow and produce a retrospect report with these sections:

      **## Workflow Summary**
      - Stages completed, iterations per stage, total forge-gauge cycles
      - Which LLM served as Forge vs Gauge (from config)
      - Skills invoked at each stage (from `skillsUsed` in state.json)

      **## Memories to Save**
      For each candidate memory, provide:
      - **Type**: `user`, `feedback`, `project`, or `reference`
      - **Name**: short identifier
      - **Content**: what to remember and why
      - **Evidence**: cite the specific artifact(s) that support this memory. Use the format `artifacts/<stage>/iterN-{forge|gauge}.md:section` or quote the relevant passage. A memory without evidence is not actionable and will be rejected by the Gauge.
      - **Rationale**: why this is non-obvious and worth persisting across conversations

      Focus on:
      - User preferences revealed during approval gates or feedback
      - Project-specific patterns not captured in the constitution
      - Domain knowledge that informed design decisions
      - External references discovered during the workflow
      - What worked well that should be repeated (feedback memories)
      - What failed or caused extra iterations that should be avoided (feedback memories)

      Do NOT suggest memories for things derivable from the codebase, git history, or existing documentation.

      **## Skill Updates**
      For each skill that was used (from `skillsUsed`), evaluate:
      - Did the skill's guidance lead to good outcomes or cause friction?
      - Are there missing checks, templates, or patterns the skill should include?
      - Were there recurring Gauge feedback themes that the skill should address upfront?

      Also evaluate the Steel-Kit workflow commands themselves:
      - Did any stage command's instructions cause confusion or unnecessary iterations?
      - Are there missing steps or unclear instructions?

      For each proposed update, provide:
      - **Skill**: which skill or command file
      - **Issue found**: what went wrong or what's missing — cite the specific artifact and quote the relevant passage (e.g., `artifacts/implementation/task2-iter3-gauge.md` flagged "missing reset assertion" twice → the skill should include a reset checklist)
      - **Proposed change**: what to add, modify, or remove — be specific enough that someone could apply the edit (e.g., "Add to `sv-gen` template section: 'Include synchronous reset assertion for every sequential block'")
      - **Expected impact**: what this change would have prevented or improved in the current workflow (e.g., "Would have eliminated 2 revision cycles in task 2 implementation")

      **## Process Improvements**
      For each improvement, provide the issue, evidence, and proposed fix:

      - **Bottlenecks**: which stages took the most iterations? For each, cite the iteration artifacts that show the back-and-forth and identify the root cause (e.g., "Specification took 4 iterations because the Gauge kept requesting NFRs that the constitution doesn't require — see `artifacts/specification/iter2-gauge.md` through `iter4-gauge.md`")
      - **Forge-Gauge dynamics**: did the Gauge catch real issues or create churn? Classify each REVISE verdict as: (a) caught a real defect, (b) enforced a valid standard, or (c) unnecessary churn. Cite the specific `iterN-gauge.md` for each.
      - **Constitution gaps**: should any principles be added or refined? Quote the artifact passage that exposed the gap (e.g., "Plan stage had no guidance on error handling strategy — `artifacts/planning/iter2-gauge.md` flagged this")
      - **Workflow gaps**: missing stages or unnecessary stages? Ground in evidence from this run.

   b. Write the report to `specs/<specId>/retrospect.md`
   c. Save a copy to `specs/<specId>/artifacts/retrospect/iterN-forge.md`
   d. Git commit: `forge(retrospect): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the retrospect report. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      The Gauge MUST verify every claim against the cited evidence:
      1. **Memories**: For each proposed memory, read the cited artifact. Does the evidence actually support the claim? Is the memory truly non-obvious? Reject any memory where the evidence is missing, misquoted, or doesn't support the conclusion.
      2. **Skill updates**: For each proposed update, read the cited artifact. Did the issue actually occur as described? Is the proposed change specific enough to apply? Would it actually have prevented the issue? Reject vague suggestions like "improve error handling guidance".
      3. **Process improvements**: For each bottleneck or dynamic claim, verify the iteration count and the characterization of each REVISE verdict against the actual gauge artifacts. Reject any mischaracterization (e.g., calling a legitimate defect catch "churn").
      4. **Missing insights**: Are there patterns in the artifacts that the Forge missed? (e.g., a recurring Gauge complaint that was never surfaced, or a skill that was clearly needed but not invoked)

      End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   f. Save review to `specs/<specId>/artifacts/retrospect/iterN-gauge.md`
   g. Git commit: `gauge(retrospect): iteration N review — <verdict> [iteration N]`

   h. If **APPROVE**: break loop. If **REVISE**: incorporate feedback and loop.

4. After the loop completes, present the retrospect report to the user and ask:
   **"Would you like me to apply any of these changes?"**
   - **Memories**: offer to save each proposed memory using the memory system
   - **Skill updates**: offer to edit the specific skill/command files
   - **Constitution updates**: offer to update `.steel/constitution.md`

   The user can accept all, pick specific items, or decline.

5. Update `.steel/state.json`: mark `retrospect` as complete, tag `steel/retrospect-complete`.

6. Show final summary: "Workflow complete! All stages including retrospect passed."

