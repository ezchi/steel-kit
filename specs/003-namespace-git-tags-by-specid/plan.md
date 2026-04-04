# Implementation Plan: Namespace Git Tags by specId

## Architecture Overview

This is a surgical refactor of the git tag format from `steel/<stage>-complete` to `steel/<specId>/<stage>-complete`. The change touches 4 TypeScript source files, 8 canonical command files, their 24 downstream provider copies, README, and existing tests. No new modules, interfaces, or dependencies are introduced.

## Components

### 1. `src/git-ops.ts` — Tag creation (FR-1)

**Change**: Add `specId` parameter to `tagStage()`.

```typescript
// Before (line 92)
export async function tagStage(stage: string, projectRoot: string): Promise<void> {
  const tagName = `steel/${stage}-complete`;

// After
export async function tagStage(specId: string, stage: string, projectRoot: string): Promise<void> {
  const tagName = `steel/${specId}/${stage}-complete`;
```

**Impact**: All callers of `tagStage()` must pass specId. Only one call site exists: `advanceStage()` in `src/workflow.ts`.

### 2. `src/workflow.ts` — Recovery and advancement (FR-2, FR-3, FR-4)

**Change A**: `advanceStage()` (line 290) — pass `state.specId` to `tagStage()`:
```typescript
// Before
await tagStage(state.currentStage, projectRoot);

// After
await tagStage(state.specId, state.currentStage, projectRoot);
```

**Change B**: `getCompletedStagesFromTags()` (lines 218-232) — add `specId` parameter, scope glob and regex:
```typescript
// Before
async function getCompletedStagesFromTags(projectRoot: string): Promise<Set<string>> {
  const result = await execa('git', ['tag', '-l', 'steel/*-complete'], ...);
  // regex: /^steel\/(.+)-complete$/

// After
async function getCompletedStagesFromTags(projectRoot: string, specId: string): Promise<Set<string>> {
  const result = await execa('git', ['tag', '-l', `steel/${specId}/*-complete`], ...);
  // regex: /^steel\/[^/]+\/(.+)-complete$/
```

**Change C**: `recoverState()` (line 176) — pass specId, skip tags if null:
```typescript
// Before
const completedStages = await getCompletedStagesFromTags(projectRoot);

// After
const completedStages = state.specId
  ? await getCompletedStagesFromTags(projectRoot, state.specId)
  : new Set<string>();
```

### 3. `commands/clean.ts` — Scoped cleanup (FR-5)

**Change**: Extract specId resolution logic. After `loadState()`, if `state.specId` is null, perform branch-detection and specs-directory fallback before resorting to global deletion.

```typescript
// After loadState() (line 18-20):
let specId = state.specId;

// If specId is null, try branch detection and specs-dir fallback
if (!specId) {
  const config = await loadConfig(projectRoot);
  const { resolveGitConfig } = await import('../src/git-config.js');
  const gitConfig = resolveGitConfig(config);
  const { getCurrentBranch } = await import('../src/git-ops.js');
  const branch = await getCurrentBranch(projectRoot).catch(() => 'unknown');
  if (branch.startsWith(gitConfig.branchPrefix)) {
    specId = branch.slice(gitConfig.branchPrefix.length);
  } else if (gitConfig.branchPrefix !== 'spec/' && branch.startsWith('spec/')) {
    specId = branch.slice(5);
  } else {
    // specs directory fallback
    const specsDir = getSpecsDir(projectRoot, config);
    if (existsSync(specsDir)) {
      const entries = (await readdir(specsDir)).sort();
      if (entries.length > 0) specId = entries[entries.length - 1];
    }
  }
}

// Scoped tag deletion
const tagPattern = specId ? `steel/${specId}/*-complete` : 'steel/*/*-complete';
if (!specId) log.warn('Cannot determine active spec — removing all namespaced tags');
```

Also update:
- Line 29: user-facing preview message to show scoped pattern
- Line 57: tag listing glob to use `tagPattern`

### 4. `src/doctor.ts` — Tag detection (FR-6)

**Change**: `checkStateRecovery()` (line 423) — use specId-scoped tag pattern when possible.

Add specId resolution logic (same branch/specs-dir fallback as clean) before the tag check:
```typescript
// Resolve specId from branch or specs directory
let specId: string | null = null;
if (config) {
  // ... branch detection, specs-dir fallback (same logic as recoverState)
}

const tagPattern = specId ? `steel/${specId}/*-complete` : 'steel/*/*-complete';
const tags = await safeListTags(projectRoot, tagPattern);
```

Spec-file scanning remains broad (deliberate divergence documented in FR-6).

### 5. Extract shared specId resolution helper

FR-5 and FR-6 both need the same branch-detection + specs-dir fallback logic that `recoverState()` already has (lines 153-173). To avoid triplication, extract a shared helper:

```typescript
// src/workflow.ts (new export)
export async function resolveSpecId(
  projectRoot: string,
  config: SteelConfig,
): Promise<string | null> {
  const { resolveGitConfig } = await import('./git-config.js');
  const gitConfig = resolveGitConfig(config);
  const branch = await getCurrentBranch(projectRoot).catch(() => 'unknown');
  if (branch.startsWith(gitConfig.branchPrefix)) {
    return branch.slice(gitConfig.branchPrefix.length);
  }
  if (gitConfig.branchPrefix !== 'spec/' && branch.startsWith('spec/')) {
    return branch.slice(5);
  }
  const specsDir = getSpecsDir(projectRoot, config);
  if (existsSync(specsDir)) {
    const entries = (await readdir(specsDir)).sort();
    if (entries.length > 0) return entries[entries.length - 1];
  }
  return null;
}
```

Then `recoverState()`, `commands/clean.ts`, and `src/doctor.ts` all call `resolveSpecId()`.

### 6. Canonical command files (FR-8)

Update all 8 files in `resources/commands/`:

| File | Line(s) | Change |
|------|---------|--------|
| `steel-specify.md` | 70 | `tag 'steel/specification-complete'` → `tag 'steel/<specId>/specification-complete'` |
| `steel-clarify.md` | 70 | same pattern for clarification |
| `steel-plan.md` | 50 | same pattern for planning |
| `steel-tasks.md` | 52 | same pattern for task_breakdown |
| `steel-implement.md` | 103 | same pattern for implementation |
| `steel-validate.md` | 144 | same pattern for validation |
| `steel-retrospect.md` | 22 | `steel/specification-complete..HEAD` → `steel/<specId>/specification-complete..HEAD` |
| `steel-retrospect.md` | 108 | same pattern for retrospect |
| `steel-clean.md` | 14, 22 | `steel/*-complete` → `steel/<specId>/*-complete` with scoped cleanup instructions |

After editing, run `steel update` to sync to `.claude/commands/`, `.gemini/commands/`, `.agents/skills/`.

### 7. README.md (FR-9)

Update line 260: `steel/<stage>-complete` → `steel/<specId>/<stage>-complete`.

## Data Model

No changes to `WorkflowState` interface or `state.json` schema. The specId field already exists.

## API Design

One new export: `resolveSpecId(projectRoot, config) → Promise<string | null>` in `src/workflow.ts`.

One signature change: `tagStage(specId, stage, projectRoot)` — adds leading `specId` parameter.

One signature change: `getCompletedStagesFromTags(projectRoot, specId)` — adds `specId` parameter (private function, no external impact).

## Dependencies

No new external dependencies. Uses existing `execa`, `node:fs`, `node:path`.

## Implementation Strategy

### Phase 1: Core runtime (FR-1 through FR-4)
1. Extract `resolveSpecId()` from `recoverState()` in `src/workflow.ts`
2. Refactor `recoverState()` to use `resolveSpecId()`
3. Add `specId` param to `tagStage()` in `src/git-ops.ts`
4. Add `specId` param to `getCompletedStagesFromTags()` in `src/workflow.ts`
5. Update `advanceStage()` to pass `state.specId` to `tagStage()`
6. Update `recoverState()` to pass specId to `getCompletedStagesFromTags()` (skip if null)

### Phase 2: Clean and Doctor (FR-5, FR-6)
7. Update `commands/clean.ts` to use `resolveSpecId()` for scoped cleanup
8. Update `src/doctor.ts` `checkStateRecovery()` to use `resolveSpecId()` for scoped tag detection

### Phase 3: Tests
9. Update existing tests in `src/workflow.test.ts` for new function signatures
10. Update existing tests in `src/doctor.test.ts` for new tag patterns
11. Add test: tag creation produces `steel/<specId>/<stage>-complete`
12. Add test: recovery with known specId finds namespaced tags
13. Add test: recovery with null specId skips tag-based recovery
14. Add test: clean with known specId only deletes scoped tags
15. Add test: clean with null specId falls back to `steel/*/*-complete`
16. Add test: legacy flat tags are ignored by new patterns
17. Add test: doctor detects namespaced tags as recoverable

### Phase 4: Documentation (FR-8, FR-9)
18. Update all 8 canonical command files in `resources/commands/`
19. Run `steel update` to sync downstream providers
20. Update `README.md`

### Phase 5: Verification
21. Run `npm run lint`
22. Run `npm test`
23. Run `npm run build`

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `resolveSpecId()` extraction breaks `recoverState()` | High | Extract as pure refactor first, verify tests pass before any behavioral change |
| `tagStage()` callers missed | Low | Only one call site (`advanceStage`), but grep for all references before changing |
| Glob `steel/<specId>/*-complete` doesn't match hierarchical tags in some git versions | Low | git tag `-l` uses fnmatch which supports `/` in patterns; verify on both macOS and Linux |
| `steel update` doesn't fully sync all downstream files | Medium | After running, diff canonical vs downstream to verify parity |
| Tests hardcode old tag format | Medium | Search all test files for `steel/` tag references before implementing |

## Testing Strategy

**Unit tests** (Vitest):
- `tagStage()`: verify tag name format with specId
- `getCompletedStagesFromTags()`: verify scoped listing and regex extraction
- `resolveSpecId()`: verify branch, legacy, and directory fallback paths
- `checkStateRecovery()`: verify scoped and broad tag patterns

**Integration tests** (Vitest with temp git repos):
- Full recovery cycle: create namespaced tags → delete state.json → recover → verify stages
- Clean scoping: create tags for 2 specs → clean one → verify other's tags remain
- Legacy coexistence: mix old and new tags → verify only new are processed

**Manual verification**:
- Run a full steel workflow (`specify` → `retrospect`) and verify `git tag -l "steel/*"` shows namespaced tags
- Run `steel clean` and verify scoped deletion
- Delete `state.json` and verify recovery
