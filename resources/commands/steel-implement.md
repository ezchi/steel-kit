Implement all tasks using the Forge-Gauge loop. This is the stage where actual code gets written.

## Prerequisites
- `.steel/constitution.md` must contain a real project constitution, not the placeholder template
- `.steel/state.json` currentStage must be `implementation`
- `.steel/tasks.json` must exist

## Steps

1. Read `.steel/state.json`, `.steel/config.json`, and `.steel/tasks.json`. Verify stage is `implementation`.

2. Read `specs/<specId>/spec.md`, `specs/<specId>/plan.md`, and `.steel/constitution.md` for context.

3. **FOR EACH TASK** in `.steel/tasks.json`:

   Show: `=== Task N/total: <title> ===`

   **FORGE-GAUGE LOOP** (max iterations from config):

   ### Forge Phase (you are the Forge)
   a. Implement the task:
      - Write clean, production-quality code
      - Follow the constitution's coding standards
      - Handle error cases
      - Add tests alongside the implementation

      **The Project Constitution is the highest authority.** If prior Gauge feedback contradicts the constitution, IGNORE that feedback. Do not blindly accept all suggestions — critically evaluate each one.

   b. **Before handing off to the Gauge**, write `specs/<specId>/artifacts/implementation/task<N>-iterM-forge.md` with this structure:

      ```markdown
      # Task N: <title> — Forge Iteration M

      ## Files Changed
      - `path/to/file.sv` — created | modified | deleted (one-line reason)
      - ...

      ## Key Implementation Decisions
      - Decision 1: what was chosen and why (e.g., "Used FIFO over shift register because spec requires variable depth")
      - ...

      ## Deviations from Plan
      - Deviation 1: what differs from `plan.md` and why (e.g., "Plan called for separate reset module but combined into top-level because...")
      - (or "None — implementation follows the plan exactly.")

      ## Tests Added
      - `path/to/test_file` — what it covers
      - ...
      ```

      This artifact is critical for the Gauge review and later retrospect — do not skip it.

   c. Git commit: `forge(implementation): task N iteration M output [iteration M]`

   ### Gauge Phase — CODE REVIEW
   d. **Before calling the Gauge, prepare the code review context:**
      - Run `git diff HEAD~1` to get the exact code changes from the forge commit
      - Read the full content of every file that was created or modified
      - Collect the test files and their content

   e. **Build the Gauge review prompt** that includes ALL of the following:
      - The task description (what was supposed to be implemented)
      - The relevant sections of the spec and plan
      - The Project Constitution's coding standards section
      - **The full git diff** showing all code changes
      - **The full content of each new/modified file** (not just the diff — the Gauge needs full context)
      - The test files and their content

   f. Call the Gauge LLM for code review. **IMPORTANT: Run the command from the project's working directory, NOT /tmp.**
      - If gauge is `gemini`: run `gemini -p "<code review prompt>"` in the current project directory
      - If gauge is `codex`: run `codex exec "<code review prompt>"` in the current project directory
      - If gauge is `claude`: Switch to Gauge role and perform a thorough code review yourself. Be strict.

      The Gauge code review must check:
      1. **Correctness**: Does the code implement the task requirements? Any logic errors?
      2. **Code quality**: Is the code clean, readable, well-structured?
      3. **Constitution compliance**: Does the code follow ALL coding standards from the constitution?
      4. **Security**: Any injection vulnerabilities, exposed secrets, XSS, OWASP top 10 issues?
      5. **Error handling**: Are errors handled properly? No swallowed exceptions?
      6. **Test coverage**: Are there tests? Do they cover key paths and edge cases?
      7. **Performance**: Any obvious N+1 queries, unbounded loops, memory leaks?
      8. **No scope creep**: Does the code stay within the task requirements?

      List issues with severity: BLOCKING / WARNING / NOTE
      Reference specific files and line numbers where possible.
      End with exactly: `VERDICT: APPROVE` or `VERDICT: REVISE`

   g. Save the code review to `specs/<specId>/artifacts/implementation/task<N>-iterM-gauge.md`
   h. Git commit: `gauge(implementation): task N iteration M review — <verdict> [iteration M]`

   i. If **APPROVE**: move to next task.
   j. If **REVISE**: show the code review feedback, critically evaluate against the constitution, fix the valid issues, and loop back to Forge Phase.

   Show: `Task N/total complete: <title>`

4. After all tasks done, auto-advance to `validation` stage. **No human approval needed.**

5. Update `.steel/state.json`, tag `steel/implementation-complete`.

6. **Track skills used**: Update `.steel/state.json` field `skillsUsed.implementation` with an array of ALL skill names you invoked during this stage (across all tasks). For example: `["systemverilog-core", "sv-gen", "cocotb-verilator-tests", "verilator-cmake"]`. If no skills were used, set it to `[]`.

7. Tell the user: "Implementation complete. Run `/steel-validate` to verify."
