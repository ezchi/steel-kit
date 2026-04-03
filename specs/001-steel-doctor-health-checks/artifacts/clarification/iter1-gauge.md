## Clarification Iteration 1 — Gauge Review

### Clarification assessment

**CLR-1 (Auth scope)** [SPEC UPDATE]: Correct resolution. Env-var-only checks match existing `src/providers/` patterns. FR-17 updated with specific env vars. Constitution-aligned (explicit diagnostics, no network).

**CLR-2 (Rendering exports)** [SPEC UPDATE]: Valid. `renderGeminiCommandToml` must be exported. FR-13 note is appropriate. Avoids logic duplication per constitution coding standards.

**CLR-3 (1:1 mapping)** [NO SPEC CHANGE]: Correct. FR-11 subsumes FR-10 presence checks. No change needed.

**CLR-4 (No active spec)** [NO SPEC CHANGE]: Correct. Conditional phrasing in FR-6 already handles this.

**CLR-5 (Early in-progress)** [NO SPEC CHANGE]: Correct. `warn` for missing current-stage files is appropriate and non-blocking.

**CLR-6 (Corrupt state.json)** [SPEC UPDATE]: Good catch for a real failure mode. FR-4 and severity matrix updated correctly. Remediation leverages existing recovery path.

### Spec update verification

1. FR-4 `init-state-corrupt` — correctly placed, consistent wording ✓
2. FR-13 export note — scoped, doesn't alter rendering rules ✓
3. FR-17 rewrite — specific env vars match `src/providers/` code ✓
4. FR-27 severity matrix — `init-state-corrupt` as `fail` is correct ✓
5. Changelog — accurate entries for all 4 changes ✓
6. Open questions resolved — only open question (auth scope) addressed by CLR-1 ✓

### No unrelated sections modified ✓
### No [NO SPEC CHANGE] items that should be [SPEC UPDATE] ✓
### No requirements silently dropped or weakened ✓

VERDICT: APPROVE
