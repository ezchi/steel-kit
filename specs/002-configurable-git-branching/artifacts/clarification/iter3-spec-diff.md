# Spec Diff — Iteration 3

## Change 1: AC-30 updated (full error message)

**Before:**
```
- AC-30: `generateSpecId` with `--id PROJ-21` and description `"add auth"` when `specs/PROJ-21-add-auth/` already exists → fails with error `"Spec directory 'specs/PROJ-21-add-auth' already exists."` No branch or file creation occurs.
```

**After:**
```
- AC-30: `generateSpecId` with `--id PROJ-21` and description `"add auth"` when `specs/PROJ-21-add-auth/` already exists → fails with error `"Spec directory 'specs/PROJ-21-add-auth' already exists. Use a different --id or remove the existing spec."` No branch or file creation occurs.
```

## Change 2: AC-32 and AC-33 added

```diff
+ - AC-32: `generateSpecId` with description `"  spaced  out  "` produces a semantic name with no leading/trailing hyphens (trim before collapsing whitespace).
+ - AC-33: `generateSpecId` with description longer than 40 characters (e.g. `"this is a very long feature description that exceeds the limit"`) produces a semantic name truncated to exactly 40 characters.
```

## Change 3: Changelog entries added

```diff
+ - [Clarification iter3] AC-30: Updated error message to include full remediation tail per FR-15a.
+ - [Clarification iter3] AC-32: Added acceptance criterion for leading/trailing whitespace trimming.
+ - [Clarification iter3] AC-33: Added acceptance criterion for 40-character truncation.
```
