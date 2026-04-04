# Gauge Review — Iteration 1

- **[BLOCKING]**: The spec misses canonical workflow-command updates, so it does not cover all behavior surfaces that define Steel-Kit's workflow. The constitution says provider surfaces must stay aligned and treats `resources/commands/` as canonical, but the spec only scopes shared runtime files and even claims parity is "maintained by definition." That is false in the current repo: `resources/commands/steel-specify.md`, `resources/commands/steel-clean.md`, and other stage command docs still instruct the old flat tag format. If the implementation changes only TypeScript, the runtime and the canonical provider instructions will diverge, violating constitution principles 3 and 4.

- **[BLOCKING]**: FR-6 is underspecified about how `steel-doctor` determines `specId` when `state.json` is missing. `src/doctor.ts` currently receives only `projectRoot` and `config`, and the requirement says to narrow to `steel/<specId>/*-complete` when `specId` is available from branch or spec directory detection. That is ambiguous when multiple spec directories exist or branch-based detection fails. The spec needs a deterministic rule matching recovery behavior, or it should explicitly say doctor only narrows when `specId` can be determined unambiguously; otherwise the implementer has to guess.

- **[WARNING]**: Backward-compatibility requirements are weaker than the stated NFR. FR-7 says legacy tags "MAY optionally detect" and "must not fail," but there is no acceptance criterion proving a repo containing legacy flat tags plus new namespaced tags still behaves correctly. At minimum, add a concrete verification case for recovery/doctor/clean coexistence with legacy tags.

- **[NOTE]**: `README.md` also documents the old flat tag shape, so it should likely be updated with the implementation even if you keep it out of the strict functional scope.

VERDICT: REVISE
