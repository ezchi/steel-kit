# Gauge Review — Specification Iteration 2

## Summary

Iteration 2 is a substantial improvement. All four iter-1 BLOCKING issues are properly addressed: the spec now explicitly disclaims a CLI surface (FR-9 closing the B-1 hole), the audit trail moves from a gitignored state.json commit to a `Previous Spec ID` field in the new spec.md frontmatter (B-2), the resume-by-`--id` confusion is deleted with a clear out-of-scope statement (B-3), and FR-1 collapses to the single condition `state.stages.retrospect.status === 'complete'` (B-4). Most warnings are also resolved. Two genuine defects remain — one warning and one note — neither of which is bad enough to block clarification.

## Issues

### BLOCKING

None.

### WARNING

- [W-1] **FR-7's "natural commit" claim is wrong.** Line 119 says: *"If `config.autoCommit === true`, the existing forge commit at the end of step 6 (forge phase, iteration 1) carries this field naturally — no additional commit is required."* Look at `resources/commands/steel-specify.md:60-64` — step 6e commits with `--paths` defaulting to "all changes" via `commit-step` (which without `--paths` stages everything tracked in the working tree per `cli.ts:127`). However `runForgeGaugeLoop` in `src/workflow.ts:394-405` deliberately scopes forge-stage commits to `[forgeArtifactPath, ...(stageOutputPath ? [stageOutputPath] : [])]` — i.e., only the artifact and `spec.md`. That path **does** include `spec.md`, so the FR-7 claim happens to be correct *for the workflow.ts path*. But the slash command (`steel commit-step --role forge --stage specification --iter $N --msg "iteration $N output"` with no `--paths`) stages **all changes** (cli.ts line 127's default behavior), which would also include the spec.md write done in step 6c. So the audit trail does land in the commit. **However**, the FR is silent about what happens when `config.autoCommit === false` — the field will sit in `spec.md` uncommitted, leaving no audit record. The spec needs one explicit sentence: when `autoCommit === false`, the `Previous Spec ID:` field is still written into `spec.md` (so any subsequent manual commit captures it) but no automatic commit is added. As-written, FR-7 acknowledges a `config.autoCommit === true` case and is silent on the false case, leaving an audit-trail hole the constitution explicitly forbids (principle 4: auditable end to end).

- [W-2] **FR-3's case-insensitive / whitespace-trimmed parsing is at odds with FR-3's own "verbatim" framing.** Lines 64 and 74: the prompt is presented "verbatim" with bracketed options `[y / clean / cancel]`, then the spec accepts case-insensitive matches with whitespace stripped. That is fine UX, but it is not what the user's verbatim description says (which is silent on input handling) and it adds an undocumented contract that providers must implement. More important: `Other` is mentioned in AC-3 ("input is whitespace, gibberish, or `Other`") but `Other` is leftover terminology from iter1's `AskUserQuestion` reference that iter2 dropped (W-2 from iter1). Why is `Other` called out specifically? It looks like a half-deleted artifact. Either remove the `Other` callout (it's just gibberish from a normalization standpoint) or explain why it warrants a special example. iter1-gauge.md flagged this as N-3 and the iter2 spec only partly addressed it.

### NOTE

- [N-1] **OQ-3 is answerable.** The spec says "When a user picks **y** but the new feature description happens to slugify to a string that collides with an existing spec dir, `generateSpecId` will throw." This is wrong about the trigger: collision happens when the *full spec ID* (`NNN-slug` or `customId-slug`) matches an existing dir. With auto-numbering, `generateSpecId` picks `nextNum = max(existing) + 1`, so the auto-numbered case can only collide if the user has manually made a directory with that exact `NNN-slug`. The realistic collision is `--id <X>` where `<X>-<slug>` already exists. This is rare and the existing throw is fine — confirm in the spec and close the OQ rather than punting.

- [N-2] **FR-10 introduces a helper but OQ-1 makes it conditional.** FR-10 mandates `isCompletedWorkflow` exist; OQ-1 then asks whether to add a `steel state classify` subcommand or read `stages.retrospect.status` directly via existing `steel state get --field`. The spec already commits to the helper function in FR-10 (good, single source of truth). The remaining OQ is purely about the CLI seam, which is cleanly separable. NFR-5 doesn't include a test for FR-10's helper — add it: "FR-10: `isCompletedWorkflow` truth table" should be present in NFR-5 (currently FR-1's tests effectively cover the same thing under a different name; reconcile FR-1 and FR-10 either by collapsing them or by listing both in NFR-5).

- [N-3] **AC-9 is over-broad.** "All existing tests in `commands/clean.test.ts`, `src/workflow.test.ts`, `src/git-config.test.ts`, and `src/spec-id.test.ts` continue to pass without modification." The "without modification" qualifier is too strong — adding `Previous Spec ID:` rendering to `spec.md` could plausibly affect a snapshot or text-match test in `src/workflow.test.ts` (if such a test exists) without that being a defect. Soften to "no existing test should fail unless the failure is a deliberate snapshot update reviewed against this spec."

- [N-4] **FR-7 spec.md template ordering.** FR-7 places `**Previous Spec ID:**` after `**Spec ID:**` and before `**Status:**`. The current spec.md (this spec.md, line 4-6) uses the same ordering: `Spec ID`, `Status`, `Created`, `Iteration`. Confirm in clarification whether existing template files (e.g., `templates/spec.md` if any) need updating to match, or whether the field is appended only when present (per FR-7 last sentence "omitted entirely when the **y** path was not taken"). The latter is more robust.

- [N-5] **FR-5 step 3's failure-detection signal is unspecified.** "If `/steel-clean` fails or its inner confirmation is declined, abort." But how does the slash command detect inner-confirmation decline vs. successful completion? `/steel-clean`'s canonical source (steel-clean.md step 7) prints a success message; `commands/clean.ts:46-48` returns silently on decline (`log.warn('Clean cancelled.')` then `return`) — no non-zero exit, no machine-readable signal. Provider runtimes invoking the nested slash command will need a contract here. This is genuinely a clarify-stage item; flag it as such or add to OQ.

## Strengths

- B-1's resolution is decisive: FR-9 explicitly states "no CLI surface added" with line citation to `src/cli.ts:48-52`. The Out-of-Scope section reinforces this. No more invented `steel specify` verb.
- B-2's resolution (carry `previousSpecId` in the new `spec.md` frontmatter rather than committing gitignored `state.json`) is a clean fix that also satisfies constitution principle 4 (auditable end to end) better than the iter1 attempt did.
- FR-1's single-condition rule is correctly grounded in the source (`STAGE_ORDER` in `workflow.ts:53-61` confirms `retrospect` is last) and the spec calls out manual-edit robustness explicitly.
- FR-4 step 4 explicitly enumerates what is **not** touched (specs dir, tasks.json, all git tags). This kind of "negative space" specification prevents implementation drift.
- W-2 from iter1 (alien `AskUserQuestion`) is correctly dropped in FR-3 line 66.
- W-3 from iter1 (AC-5 over-claiming about clean.ts internals) is correctly narrowed in AC-5 line 158.
- W-4 from iter1 (FR-9 propagation handwaving) is fixed: FR-8 now names `steel update` with file:line citation.
- Out-of-Scope grew sensibly (added "rename and archive" rejection, kept the precondition error in `commands/specify.ts:28-35` as defense-in-depth — a nice call).

## Verdict Reasoning

The four iter-1 blockers are genuinely resolved, not papered over. The remaining warnings are minor UX/edge-case clarifications appropriate to settle in the clarification stage rather than another specification iteration: W-1 needs a one-sentence statement about the `autoCommit === false` case, W-2 needs the stray `Other` in AC-3 cleaned up. Notes N-1 through N-5 are all clarify-stage material. The spec is grounded in real code (every cited file:line I checked is accurate), the FR-to-AC traceability is intact, and constitution alignment (principles 2, 3, 4) is explicit. Advancing to clarification is safe.

VERDICT: APPROVE
