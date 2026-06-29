Break the implementation plan into ordered, actionable tasks using the Forge-Gauge loop.

## Prerequisites
- `.steel/state.json` currentStage must be `task_breakdown`.
- `specs/<specId>/plan.md` must exist.

## Steps

1. Verify state: `steel state get` and confirm `currentStage` is `task_breakdown`.
2. Mark in progress: `steel state mark --stage task_breakdown --status in_progress`.

3. **FORGE-GAUGE LOOP** (max iterations from `config.maxIterations`):

   For each iteration `N`:

   ### Forge Phase (you are the Forge)
   a. Render the Forge prompt:
      ```
      steel render-prompt --role forge --stage task_breakdown \
        --output .steel/tmp/tasks-iter${N}-forge-prompt.md \
        ${PRIOR_GAUGE:+--feedback ${PRIOR_GAUGE}}
      ```
   b. **Read the rendered prompt and follow it.** Decompose the plan into ordered tasks. Each task must include: task number, title, description, files to create/modify, type (`implementation` or `verification` — see prompt for semantics; `verification` tasks run a tool/command and modify no source files), dependencies on other tasks (by number), verification criteria.

      **Cross-check the plan against repo state before writing tasks:**
      - For each file path plan.md references, run `ls` or `git ls-tree HEAD <path>` to confirm it exists.
      - For each tool invocation plan.md references, verify with `which` or `find`.
      - When plan and repo disagree, flag the inconsistency in `tasks.md` under a "Plan corrections required" section, follow the actual repo state in the tasks, and let the implementation retrospect propose a plan amendment.
      - When verification gates in plan.md reference a base branch, the rendered prompt's `{{BASE_BRANCH}}` is the per-spec value from `state.baseBranch` — preserve that exact branch name when copying gates into tasks.

   c. Write tasks to `specs/$SPEC_ID/tasks.md`.
   d. Also save a JSON version to `.steel/tasks.json` with structure: `[{ "id": 1, "title": "...", "description": "...", "type": "implementation" | "verification" }, ...]`. The `type` field is parsed from the per-task `Type:` line; missing or unrecognized values default to `implementation`.
   e. Save artifact: `steel save-artifact --stage task_breakdown --iter $N --role forge --content-file specs/$SPEC_ID/tasks.md`.
   f. Commit: `steel commit-step --role forge --stage task_breakdown --iter $N --msg "iteration $N output"`.

   ### Gauge Phase
   g. Render gauge prompt:
      ```
      FORGE_ART=specs/$SPEC_ID/artifacts/task_breakdown/iter${N}-forge.md
      steel render-prompt --role gauge --stage task_breakdown \
        --review-target $FORGE_ART \
        --output .steel/tmp/tasks-iter${N}-gauge-prompt.md
      ```
   h. Run gauge per `config.gauge.provider`: Task subagent (fresh context) if `claude`, else `steel run-gauge --provider <name> --prompt-file ... --output specs/$SPEC_ID/artifacts/task_breakdown/iter${N}-gauge.md`.
   i. If subagent path: `steel save-artifact --stage task_breakdown --iter $N --role gauge --content "$REVIEW"`.
   j. Commit: `steel commit-step --role gauge --stage task_breakdown --iter $N --msg "iteration $N review — <VERDICT>"`.
   k. Parse verdict. APPROVE → break. REVISE → `steel state iter --inc`, set `PRIOR_GAUGE`, loop.

   ### Max-iter cap
   l. On cap, prompt the user to extend; same as in `/steel-plan`.

4. Auto-advance:
   - `steel state mark --stage task_breakdown --status complete`
   - `steel tag-stage --stage task_breakdown`
   - `steel state advance-stage`

5. Track skills: `steel state set-skills --stage task_breakdown --skills <names>`.

6. Tell the user: "Tasks ready. Run `/steel-implement` to start implementation."
