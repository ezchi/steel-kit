Review the entire workflow to extract learnings, memory candidates, and skill improvements using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `retrospect`

## Steps

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
      - **Change**: what to add, modify, or remove
      - **Evidence**: which artifact/iteration showed the need

      **## Process Improvements**
      - Bottlenecks: which stages took the most iterations and why?
      - Forge-Gauge dynamics: did the Gauge catch real issues or create churn?
      - Constitution gaps: should any principles be added or refined?
      - Workflow gaps: missing stages or unnecessary stages?

   b. Write the report to `specs/<specId>/retrospect.md`
   c. Save a copy to `specs/<specId>/artifacts/retrospect/iterN-forge.md`
   d. Git commit: `forge(retrospect): iteration N output [iteration N]`

   ### Gauge Phase
   e. Call the Gauge LLM (per config) to review the retrospect report. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      Review criteria:
      - Are the proposed memories genuinely non-obvious and useful across conversations?
      - Are skill update suggestions specific and actionable (not vague)?
      - Are process improvements grounded in evidence from the artifacts?
      - Is anything important missing from the analysis?
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
