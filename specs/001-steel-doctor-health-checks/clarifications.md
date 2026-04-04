# Clarifications — steel doctor

## CLR-1: Auth diagnostics scope [NEEDS CLARIFICATION → resolved]

**[SPEC UPDATE]**

**Ambiguity**: The open question asks whether advisory auth diagnostics should be limited to environment variables or also parse provider-specific credential files.

**Resolution**: Limit auth diagnostics to environment variable checks only. The provider modules already define the relevant env vars (`ANTHROPIC_API_KEY` for Claude, `CODEX_API_KEY`/`OPENAI_API_KEY` for Codex, `GEMINI_API_KEY` for Gemini — see `src/providers/`). Parsing credential files is fragile (file formats change, paths vary by OS, credential validity requires network), violates NFR-2 (no network by default), and adds maintenance burden with low payoff. If the env var is absent, report a `warn` noting that subscription/account-based auth may still work — this matches the existing provider behavior where missing env vars fall through to subscription auth.

**Rationale**: The constitution requires diagnostics to be "explicit, readable" and prefer "local filesystem, git, process, and environment inspection." Env var checks satisfy this. Credential file parsing does not — it adds opacity and OS-specific behavior against the Linux/macOS-only constraint.

## CLR-2: Rendering function accessibility for staleness detection

**[SPEC UPDATE]**

**Ambiguity**: FR-13 references `renderGeminiCommandToml()` and `renderCodexSkill()` for byte-for-byte comparison, but only `renderCodexSkill` is currently exported from `src/command-installer.ts`. `renderGeminiCommandToml` is a private function. Doctor needs both to compute expected output.

**Resolution**: The implementation shall export `renderGeminiCommandToml` from `src/command-installer.ts` so that the doctor module can import and reuse it. This is preferable to duplicating the rendering logic. Add a clarifying note to FR-13 that the implementation must ensure these rendering functions are importable by the doctor module.

**Rationale**: The constitution's coding standards say "Treat `resources/commands/`, `prompts/`, and `templates/` as canonical workflow definitions" and "prefer tests around ... artifact generation." Reusing the actual rendering functions (not duplicates) ensures doctor's staleness detection is always synchronized with the installer's rendering.

## CLR-3: Generated surface expected set — 1:1 mapping with canonical sources

**[NO SPEC CHANGE]**

**Ambiguity**: FR-10 says to verify "presence of generated agent surfaces" but does not explicitly state whether this means "at least one file per surface type" or "one generated file per canonical source file per surface type."

**Clarification**: FR-10 implies a 1:1 mapping: for each `steel-*.md` file in `resources/commands/`, there should be a corresponding Claude command file, Gemini TOML file, and Codex SKILL.md file. This is already the behavior of `installProjectCommands()` which iterates all canonical files for each surface. FR-11's byte-for-byte comparison inherently checks 1:1 (it computes expected output per canonical file), so FR-10's presence check is effectively superseded by FR-11's staleness check. No spec change needed — the meaning is unambiguous when FR-10 and FR-11 are read together.

## CLR-4: Drift checks when no spec is active

**[NO SPEC CHANGE]**

**Ambiguity**: FR-6's drift detection rules reference `state.specId` and `state.branch`, but these are optional fields (`specId?: string`, `branch?: string` in `WorkflowState`). The spec doesn't explicitly say what happens when no spec has been started.

**Clarification**: Each FR-6 sub-rule is conditional on the field being present ("If `state.specId` is present..."). When neither `specId` nor `branch` is set (e.g., fresh init, specification stage not yet started), all drift sub-rules are vacuously true and produce `pass`. This is correct behavior — there is nothing to drift from. No spec change needed; the conditional phrasing already handles this.

## CLR-5: Stage-file checks during early in-progress stages

**[NO SPEC CHANGE]**

**Ambiguity**: FR-7 says "Missing files for the current in-progress stage are `warn`." During `specification` stage `in_progress` at iteration 1, `spec.md` may not exist yet because the Forge hasn't written it. Is a `warn` correct here?

**Clarification**: Yes, `warn` is appropriate. Doctor is a point-in-time snapshot. A `warn` saying "spec.md not yet produced — specification stage is in progress" is accurate and non-blocking (only `fail` affects exit code). The user understands the stage is in progress. No spec change needed.

## CLR-6: Implicit assumption — `state.json` must be parseable

**[SPEC UPDATE]**

**Ambiguity**: FR-4 through FR-8 assume `state.json` is either absent or valid JSON. The spec doesn't address corrupt/unparseable `state.json`.

**Resolution**: Add to FR-4 that if `.steel/state.json` exists but cannot be parsed as valid JSON, the command shall report a `fail` diagnostic with check ID `init-state-corrupt` and the remediation "Delete `.steel/state.json` and run any `steel` command to recover from artifacts." Add this to the severity matrix.

**Rationale**: Corrupt state is a real failure mode (interrupted writes, manual editing errors). Without handling it, doctor would crash instead of diagnosing. The constitution requires "deterministic state recovery" and "readable intermediate files."
