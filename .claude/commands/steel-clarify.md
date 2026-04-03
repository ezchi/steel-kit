Run clarification on the current specification using the Forge-Gauge loop.

## Prerequisites
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `clarification`

## Steps

0. Run `/clear` to clear the conversation context before starting this stage.

1. Read `.steel/state.json` and `.steel/config.json`. Verify stage is `clarification`.

2. Read the spec from `specs/<specId>/spec.md` and `.steel/constitution.md`.

3. **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Review the specification and:
      - Identify all [NEEDS CLARIFICATION] markers
      - Resolve each ambiguity with a recommended resolution and rationale
      - Identify implicit assumptions that should be explicit
      - Check for contradictions between requirements

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback. Do not blindly accept all suggestions.

   b. Write clarifications to `specs/<specId>/clarifications.md`. For each clarification, mark whether it requires a spec change:
      - **[SPEC UPDATE]** — the clarification changes, adds, or removes a requirement in spec.md
      - **[NO SPEC CHANGE]** — the clarification only adds context without changing the spec

   c. If any clarifications are marked **[SPEC UPDATE]**, update `specs/<specId>/spec.md`:
      - Apply each spec-affecting clarification directly to the relevant section (FR-*, NFR, acceptance criteria, user stories, etc.)
      - Remove resolved `[NEEDS CLARIFICATION]` markers
      - Add a `## Changelog` section at the bottom of spec.md (or append to it if it exists) with entries:
        ```
        - [Clarification iterN] FR-X: <what changed and why>
        ```
      - Do NOT rewrite unchanged sections — only edit what the clarifications require

   d. Save a copy of clarifications to `specs/<specId>/artifacts/clarification/iterN-forge.md`
   e. If spec.md was modified, save a copy to `specs/<specId>/artifacts/clarification/iterN-spec-diff.md` containing only the diff (before → after for each changed section)
   f. Git commit: `forge(clarification): iteration N output [iteration N]`

   ### Gauge Phase
   g. Call the Gauge LLM (per config) to review. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<review prompt>"` in the current project directory
      - If gauge is `claude`: Review critically yourself as the Gauge role.

      The Gauge must review BOTH the clarifications AND the updated spec.md:
      1. **Clarifications**: Are they complete, logical, and aligned with the constitution? Do they resolve all ambiguities?
      2. **Spec updates**: For each [SPEC UPDATE] clarification, verify the change was correctly applied to spec.md. Check that:
         - The updated requirement is consistent with the rest of the spec
         - No unrelated sections were modified
         - The changelog entry accurately describes the change
         - No requirements were silently dropped or weakened
      3. **Missed updates**: Are there clarifications marked [NO SPEC CHANGE] that should actually update the spec?

      End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

   h. Save review to `specs/<specId>/artifacts/clarification/iterN-gauge.md`
   i. Git commit: `gauge(clarification): iteration N review — <verdict> [iteration N]`

   j. If **APPROVE**: break loop. If **REVISE**: critically evaluate feedback against constitution, incorporate valid points, and loop.

4. **HUMAN APPROVAL GATE** — do not skip this.

   Ask the user: **"Approve clarifications and advance to planning?"**

   - If **approved**: update state to `planning` stage, tag `steel/clarification-complete`, and go to step 5.
   - If **rejected**: enter **Delta Clarification Mode** (step 4a).

   ### 4a. Delta Clarification Mode

   This mode processes ONLY the user's new feedback without re-running the full Forge-Gauge loop on already-approved content.

   1. **Collect feedback**: Ask the user what specific changes they want. Record their response verbatim as `userFeedback`.

   2. **DELTA FORGE-GAUGE LOOP** (max iterations from config):

      #### Delta Forge Phase
      a. Read the current `specs/<specId>/clarifications.md` and `specs/<specId>/spec.md`. These are the approved baseline — do NOT regenerate them from scratch.
      b. Address ONLY the items in `userFeedback`. For each feedback item:
         - Identify the specific section(s) of clarifications.md and/or spec.md affected
         - Make targeted edits to those sections only
         - Do NOT rewrite, reorder, or "improve" sections the user did not mention
         - If a feedback item requires a spec change, follow the same [SPEC UPDATE] / changelog rules from the main loop
      c. Save delta to `specs/<specId>/artifacts/clarification/iterN-delta-forge.md` with this structure:
         ```markdown
         # Delta Revision — Iteration N

         ## User Feedback
         (verbatim user feedback)

         ## Changes Made
         (for each change: which file/section, what changed, why)

         ## Sections NOT Modified
         (list sections that were already approved and left untouched)
         ```
      d. Git commit: `forge(clarification): delta iteration N [delta N]`

      #### Delta Gauge Phase
      e. The Gauge reviews ONLY the delta — not the entire clarifications from scratch. Provide the Gauge with:
         - The user's feedback (what was requested)
         - The diff of changes made (before → after for each modified section)
         - The full updated clarifications.md and spec.md (for context, but the review focuses on the delta)

         The Gauge MUST check:
         1. Does each change correctly address the corresponding user feedback item?
         2. Were any unrelated sections modified? (If so: REVISE)
         3. Are the changes consistent with the rest of the spec and the constitution?
         4. If spec.md was modified, was the changelog updated correctly?
         5. Is any user feedback item left unaddressed?

         End with `VERDICT: APPROVE` or `VERDICT: REVISE`.

      f. Save review to `specs/<specId>/artifacts/clarification/iterN-delta-gauge.md`
      g. Git commit: `gauge(clarification): delta iteration N review — <verdict> [delta N]`
      h. If **REVISE**: Forge fixes only the disputed items, loop back to Delta Forge Phase.
      i. If **APPROVE**: exit delta loop.

   3. Return to the approval gate (step 4) — ask the user again: **"Approve clarifications and advance to planning?"**
      The user may approve, or reject again with new feedback (re-entering Delta Clarification Mode).

5. **Track skills used**: Update `.steel/state.json` field `skillsUsed.clarification` with an array of skill names you invoked during this stage. If no skills were used, set it to `[]`.

6. Tell the user: "Run `/steel-plan` to generate the implementation plan."
