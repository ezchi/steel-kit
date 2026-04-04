---
name: steel-specify
description: "Steel-Kit workflow skill: Create a feature specification using the Forge-Gauge dual-agent loop."
---

# steel-specify

Use this skill when the user invokes `$steel-specify` or asks to run the corresponding Steel-Kit workflow step in Codex.

Create a feature specification using the Forge-Gauge dual-agent loop.

Feature description: the user-provided input

## Prerequisites
- `.steel/` must exist (run `$steel-init` first)
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `specification`

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `specification`.

2. Generate a spec ID:
   - If `--id <value>` was provided, use `<value>-<slugified-description>` as the spec ID (e.g. `--id PROJ-21` + "add auth" → `PROJ-21-add-auth`).
   - Otherwise, auto-increment: count existing directories in `specs/`, increment, and create `specs/NNN-<semantic-name>/` where the name is derived from the user-provided input.

3. Create a git branch using the configured branch prefix (from `.steel/config.json` git settings, default `spec/`). For example: `spec/NNN-<semantic-name>` or `feature/NNN-<semantic-name>` depending on config.

4. Update `.steel/state.json` with `specId`, `branch`, `description`, and set `specification` status to `in_progress`.

5. Read `.steel/constitution.md` for context.

6. **FORGE-GAUGE LOOP** (max iterations from config, default 5):

   ### Forge Phase (you are the Forge)
   a. Generate a comprehensive specification document including:
      - Overview
      - User Stories (As a [role], I want [action], so that [benefit])
      - Functional Requirements (FR-1, FR-2, etc.)
      - Non-Functional Requirements
      - Acceptance Criteria
      - Out of Scope
      - Open Questions (mark with [NEEDS CLARIFICATION])

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback and follow the constitution. Do not blindly accept all review suggestions.

   b. Write the spec to `specs/NNN-<name>/spec.md`
   c. Save a copy to `specs/<specId>/artifacts/specification/iterN-forge.md`
   d. Git commit: `forge(specification): iteration N output [iteration N]`

   ### Gauge Phase
   e. Read `.steel/config.json` to get the gauge provider.
   f. Call the Gauge LLM to review the spec. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - Write the full review prompt to a file at `specs/<specId>/artifacts/specification/iterN-gauge-prompt.md`
      - If gauge is `gemini`: run `gemini "Read and follow the instructions in <absolute-path-to-prompt-file>"` in the current project directory
      - If gauge is `codex`: run `codex exec "Read and follow the instructions in <absolute-path-to-prompt-file>"` in the current project directory
      - If gauge is `claude`: You ARE Claude, so review the spec yourself critically as the Gauge role — evaluate completeness, clarity, testability, consistency. Be strict.

      The Gauge review prompt must include these instructions:
      - Review for completeness, clarity, testability, consistency, feasibility
      - Check alignment with the Project Constitution
      - List issues with severity: BLOCKING / WARNING / NOTE
      - End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`

   g. Save the review to `specs/<specId>/artifacts/specification/iterN-gauge.md`
   h. Git commit: `gauge(specification): iteration N review — <verdict> [iteration N]`

   i. Parse the verdict: look for `VERDICT: APPROVE` or `VERDICT: REVISE` in the review.

   j. If **APPROVE**: mark stage complete, break the loop.
   k. If **REVISE**: critically evaluate the feedback against the constitution, incorporate valid feedback, and loop back to Forge Phase.

7. **HUMAN APPROVAL GATE** — do not skip this.

   Ask the user: **"Approve specification and advance to clarification?"**

   - If **approved**: update state to `clarification` stage, tag `steel/<specId>/specification-complete`, and go to step 8.
   - If **rejected**: enter **Delta Clarification Mode** (step 7a).

   ### 7a. Delta Clarification Mode

   This mode processes ONLY the user's new feedback without re-running the full Forge-Gauge loop on already-approved content.

   1. **Collect feedback**: Ask the user what specific changes they want. Record their response verbatim as `userFeedback`.

   2. **DELTA FORGE-GAUGE LOOP** (max iterations from config):

      #### Delta Forge Phase
      a. Read the current `specs/<specId>/spec.md`. This is the approved baseline — do NOT regenerate it from scratch.
      b. Address ONLY the items in `userFeedback`. For each feedback item:
         - Identify the specific section(s) of spec.md affected
         - Make targeted edits to those sections only
         - Do NOT rewrite, reorder, or "improve" sections the user did not mention
      c. Save delta to `specs/<specId>/artifacts/specification/iterN-delta-forge.md` with this structure:
         ```markdown
         # Delta Revision — Iteration N

         ## User Feedback
         (verbatim user feedback)

         ## Changes Made
         (for each change: which section, what changed, why)

         ## Sections NOT Modified
         (list sections that were already approved and left untouched)
         ```
      d. Git commit: `forge(specification): delta iteration N [delta N]`

      #### Delta Gauge Phase
      e. The Gauge reviews ONLY the delta — not the entire spec from scratch. Provide the Gauge with:
         - The user's feedback (what was requested)
         - The diff of changes made (before → after for each modified section)
         - The full updated spec.md (for context, but the review focuses on the delta)

         The Gauge MUST check:
         1. Does each change correctly address the corresponding user feedback item?
         2. Were any unrelated sections modified? (If so: REVISE)
         3. Are the changes consistent with the rest of the spec and the constitution?
         4. Is any user feedback item left unaddressed?

         End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

      f. Save review to `specs/<specId>/artifacts/specification/iterN-delta-gauge.md`
      g. Git commit: `gauge(specification): delta iteration N review — <verdict> [delta N]`
      h. If **REVISE**: Forge fixes only the disputed items, loop back to Delta Forge Phase.
      i. If **APPROVE**: exit delta loop.

   3. Return to the approval gate (step 7) — ask the user again: **"Approve specification and advance to clarification?"**
      The user may approve, or reject again with new feedback (re-entering Delta Clarification Mode).

8. **Track skills used**: Update `.steel/state.json` field `skillsUsed.specification` with an array of skill names you invoked during this stage (e.g., `["systemverilog-core", "sv-gen"]`). If no skills were used, set it to `[]`.

9. Show a summary of the specification.

