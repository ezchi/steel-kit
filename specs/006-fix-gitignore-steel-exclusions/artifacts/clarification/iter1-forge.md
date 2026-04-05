# Clarification — Iteration 1

## Ambiguity Analysis

After reviewing the specification against the constitution and codebase, the following potential ambiguities were identified and resolved:

### 1. Order of `.gitignore` entries matters for negation patterns

**Question:** Does the order of `.steel/*` and `!.steel/.gitignore` / `!.steel/constitution.md` matter?

**Resolution:** Yes. Git processes `.gitignore` top-to-bottom. The `!` negation patterns must appear _after_ the `.steel/*` rule. The spec's FR-1 already lists them in the correct order. No spec change needed.

### 2. `git rm --cached` with glob patterns

**Question:** Does `git rm --cached` support the same glob patterns as `.gitignore`?

**Resolution:** No — `git rm` uses shell/pathspec globs, not `.gitignore` syntax. FR-3 already specifies using `git ls-files` filtering to find affected files, which is correct. The implementation should pipe `git ls-files` output to `git rm --cached`. No spec change needed.

### 3. Test fixtures referencing `.steel/.gitignore` content

**Question:** Do any tests hard-code the old `.steel/.gitignore` content (`state.json\ntasks.json`)?

**Resolution:** Checked `doctor.test.ts` and `clean.test.ts`. The test helper `writeFile(tempDir, '.steel/.gitignore', 'state.json')` writes a simplified fixture — it doesn't assert exact content match against production. These tests create their own temp directories with fixture content. However, if any test validates the _content_ of `.steel/.gitignore`, it may need updating. V-9 in the spec correctly flags this. No spec change needed, but implementation must verify.

### 4. Interaction with `steel-init` re-runs

**Question:** Will `steel-init` re-add these files despite `.gitignore`?

**Resolution:** The spec's overview already addresses this: "`git add` respects `.gitignore` and will skip ignored paths." Even if `steel-init` calls `git add -A` or `git add .`, the `.gitignore` rules prevent re-tracking. Confirmed by checking `git-ops.ts` — `commitStep` uses `git add -A` or specific paths, both of which respect `.gitignore`. However, `git add -f` (force) would bypass `.gitignore`. Checked `git-ops.ts` and `commands/init.ts` — neither uses `-f`. No spec change needed.

### 5. Specs directory files

**Question:** Should `specs/` directory files generated during steel workflows also be ignored?

**Resolution:** No. The constitution requires auditability — specs, reviews, and artifacts must be committed and inspectable. The `specs/` directory is intentionally tracked. No spec change needed.

## Clarification Summary

No ambiguities require spec changes. All potential concerns are already addressed by the specification or are implementation details that don't affect the spec's requirements.

## Spec Diff

No changes to `spec.md`.
