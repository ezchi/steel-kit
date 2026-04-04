# Gauge Review — Specification Iteration 1

**BLOCKING:** The scope is internally inconsistent about whether this is a product fix or a one-time repository cleanup. The overview says "`steel-init` ... commits tool-generated configuration and command files" as the bug being fixed, but Out of Scope explicitly excludes changing `steel-init` behavior. As written, a developer cannot tell whether success means "clean up this repo once" or "ensure future `steel-init` runs do not recreate the problem." That ambiguity is material because the constitution requires auditable, durable workflow behavior rather than one-off cleanup.

**BLOCKING:** FR-3 and several acceptance criteria are tied to the current local repository state instead of a stable, repeatable requirement. Hard-coding `.steel/config.json` plus "14 files" under `.claude/commands` and `.agents/skills` makes the spec brittle; those counts are not guaranteed by the product and already depend on what is currently tracked in this checkout. AC-2 is especially problematic: on a fresh clone after this change, `ls .steel/config.json` may fail because the file is intentionally ignored and not version-controlled. The spec needs explicit preconditions or needs to express these requirements in state-independent terms.

**WARNING:** The spec does not fully address provider parity. The constitution requires Codex, Gemini CLI, and Claude Code surfaces to stay aligned, but FR-1 only discusses `.claude/commands` and `.agents/skills`. The codebase still contains `.gemini/commands` cleanup logic, so the spec should explicitly state why no `.gemini` ignore rule or validation is needed, or add parity requirements if Gemini-generated artifacts are still a supported surface.

**WARNING:** AC-1 is not precise enough to be testable. After `git rm --cached`, `git status` will show staged deletions until the commit is made; after the commit, those paths disappear from status entirely. "No longer shows ... as tracked" does not identify the exact command and expected output at a specific point in the workflow. The acceptance criteria should use concrete checks such as `git ls-files` and specify whether validation happens before or after the commit in FR-4.

**WARNING:** The spec omits any requirement to update or add tests, despite the constitution's guidance to add tests for observable workflow behavior changes. Even if this remains a repo-hygiene change rather than a runtime change, the spec should state whether no code changes are expected, or identify tests/docs that must be updated to keep the behavior auditable.

**NOTE:** The rationale for `.agents/skills/steel-*/` is broader than FR-3, which only removes `SKILL.md` files from the index. Ignoring the whole directory may be correct, but the spec should say so explicitly to avoid confusion if additional generated files appear under those directories later.

VERDICT: REVISE
