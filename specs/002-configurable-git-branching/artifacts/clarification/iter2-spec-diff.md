# Spec Diff — Iteration 2

## Change 1: FR-15b added (slugification algorithm)

**After FR-15, before FR-15a:**

```diff
+ - FR-15b: The `<semantic-name>` portion of the specId shall be derived from the description argument using the following slugification algorithm: (1) lowercase the string, (2) strip all characters that are not `a-z`, `0-9`, or whitespace, (3) trim leading/trailing whitespace, (4) collapse consecutive whitespace to a single hyphen, (5) truncate to 40 characters. This algorithm applies identically whether `--id` is provided or omitted.
```

## Change 2: AC-30 and AC-31 added

**After AC-29:**

```diff
+ - AC-30: `generateSpecId` with `--id PROJ-21` and description `"add auth"` when `specs/PROJ-21-add-auth/` already exists → fails with error `"Spec directory 'specs/PROJ-21-add-auth' already exists."` No branch or file creation occurs.
+ - AC-31: `generateSpecId` with `--id PROJ-21` and description `"Add Auth!!!"` produces specId `PROJ-21-add-auth` (slugification: lowercase, strip non-alphanumeric, collapse whitespace to hyphens).
```

## Change 3: Changelog entries added

```diff
+ - [Clarification iter2] FR-15b: Codified slugification algorithm for `<semantic-name>` derivation (was implicit, now normative).
+ - [Clarification iter2] AC-30: Added acceptance criterion for FR-15a collision detection.
+ - [Clarification iter2] AC-31: Added acceptance criterion for slugification behavior.
```
