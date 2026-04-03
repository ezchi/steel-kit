# Spec Diff — Iteration 1

## Change 1: FR-15a added (collision detection for `--id`)

**After FR-15, before FR-16:**

```diff
+ - FR-15a: When `--id` is provided and `specs/<specId>/` already exists, `generateSpecId()` shall fail with a clear error: `"Spec directory 'specs/<specId>' already exists. Use a different --id or remove the existing spec."` No branch or file creation shall occur.
```

## Change 2: FR-16a added (extract `generateSpecId()`)

**After FR-16, before FR-17:**

```diff
+ - FR-16a: `generateSpecId()` shall be an exported function in `src/spec-id.ts` (extracted from `commands/specify.ts`) to enable direct unit testing of ID generation, validation, and collision detection.
```

## Change 3: Changelog section added

**After "Open Questions" section:**

```diff
+ ## Changelog
+
+ - [Clarification iter1] FR-15a: Added collision detection — `generateSpecId()` fails with clear error when `--id` produces a specId whose directory already exists.
+ - [Clarification iter1] FR-16a: Extracted `generateSpecId()` to `src/spec-id.ts` as an exported function for direct unit testing.
```
