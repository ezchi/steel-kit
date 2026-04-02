Show the current Steel-Kit workflow status.

## Steps

1. Check if `.steel/` directory exists. If not, say "Project not initialized. Run `/steel-init`."

2. Read `.steel/state.json`.

3. Display a status summary:

   ```
   Steel-Kit Workflow Status
   ─────────────────────────
   Spec:    <specId or "none">
   Branch:  <branch or "none">
   Feature: <description or "none">

   Stages:
   [done] Constitution
   [done] Specification
   [>>> ] Clarification (iteration 2)
   [    ] Planning
   [    ] Task Breakdown
   [    ] Implementation
   [    ] Validation
   [    ] Retrospect

   Current: Clarification (iteration 2)
   ```

4. Use `[done]` for complete, `[>>>]` for in_progress, `[   ]` for pending.

5. If `skillsUsed` exists in state.json, show a "Skills Used" section listing skills per stage.
