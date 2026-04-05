# Gauge Validation: 005-drop-gemini-commands Implementation

You are the **Gauge**. Validate that the implementation satisfies the specification.

## Context

Read:
- `specs/005-drop-gemini-commands/spec.md` — the approved specification
- `specs/005-drop-gemini-commands/tasks.md` — the task breakdown

Then inspect the actual implementation by reading these files:
- `src/command-installer.ts` — core changes (FR-1, FR-2)
- `commands/init.ts` — init changes (FR-3)
- `commands/update.ts` — update changes (FR-4)
- `src/doctor.ts` — doctor changes (FR-5)
- `src/command-installer.test.ts` — test changes (FR-6)
- `commands/init.test.ts` — test changes (FR-6)
- `resources/commands/steel-init.md` — resource changes (FR-7)

## Validation Checklist

For each acceptance criterion, verify it is satisfied:

- **AC-1:** No `.gemini/commands/` directory created by init
- **AC-2:** Update cleans up stale `.gemini/commands/steel-*.toml` files
- **AC-3:** Init cleans up stale files too
- **AC-4:** `.agents/skills/` preserves `/steel-` prefixes
- **AC-5:** Doctor has no Gemini surface drift diagnostics
- **AC-6:** Build, lint, tests pass (already verified — trust the results)
- **AC-7:** Gemini remains in provider config
- **AC-8:** No `.gemini/commands/` refs in src/, commands/, resources/commands/, docs/, README.md
- **AC-9:** Log output has no Gemini command counts

For each AC, state: PASS or FAIL with evidence.

End with: `VERDICT: APPROVE` or `VERDICT: REVISE`
