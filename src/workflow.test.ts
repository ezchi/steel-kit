import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { loadState } from './workflow.js';
import { tagStage } from './git-ops.js';
import { resolveSpecId } from './git-config.js';
import type { SteelConfig } from './config.js';

function makeTempDir(): string {
  const dir = resolve(
    tmpdir(),
    `steel-workflow-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = resolve(dir, relPath);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function initGitRepo(dir: string, branch?: string): void {
  execSync('git init', { cwd: dir, stdio: 'ignore' });
  execSync('git add .', { cwd: dir, stdio: 'ignore' });
  execSync('git commit --allow-empty -m "init"', { cwd: dir, stdio: 'ignore' });
  if (branch) {
    execSync(`git checkout -b ${branch}`, { cwd: dir, stdio: 'ignore' });
  }
}

describe('loadState recovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('recovers specId from feature/ branch with feature/ config (AC-9)', async () => {
    // Set up .steel dir with config but no state.json
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      maxIterations: 5,
      autoCommit: true,
      specsDir: 'specs',
      git: { branchPrefix: 'feature/', baseBranch: 'main' },
    }));
    mkdirSync(resolve(tempDir, 'specs', '002-add-auth'), { recursive: true });
    writeFile(tempDir, 'specs/002-add-auth/spec.md', '# Spec');

    initGitRepo(tempDir, 'feature/002-add-auth');

    const state = await loadState(tempDir);
    expect(state.specId).toBe('002-add-auth');
    expect(state.branch).toBe('feature/002-add-auth');
  });

  it('recovers specId from spec/ branch with feature/ config — legacy fallback (AC-10)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      maxIterations: 5,
      autoCommit: true,
      specsDir: 'specs',
      git: { branchPrefix: 'feature/', baseBranch: 'main' },
    }));
    mkdirSync(resolve(tempDir, 'specs', '001-doctor'), { recursive: true });
    writeFile(tempDir, 'specs/001-doctor/spec.md', '# Spec');

    initGitRepo(tempDir, 'spec/001-doctor');

    const state = await loadState(tempDir);
    expect(state.specId).toBe('001-doctor');
    expect(state.branch).toBe('spec/001-doctor');
  });
});

describe('tagStage namespaced format', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates tag in steel/<specId>/<stage>-complete format (AC-1)', async () => {
    initGitRepo(tempDir);
    await tagStage('003-namespace', 'specification', tempDir);

    const tags = execSync('git tag -l', { cwd: tempDir }).toString().trim().split('\n');
    expect(tags).toContain('steel/003-namespace/specification-complete');
    expect(tags).not.toContain('steel/specification-complete');
  });

  it('multi-spec tags coexist without overwriting (AC-2)', async () => {
    initGitRepo(tempDir);
    await tagStage('001-first', 'specification', tempDir);
    await tagStage('002-second', 'specification', tempDir);

    const tags = execSync('git tag -l', { cwd: tempDir }).toString().trim().split('\n');
    expect(tags).toContain('steel/001-first/specification-complete');
    expect(tags).toContain('steel/002-second/specification-complete');
  });
});

describe('recovery with namespaced tags', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('recovers completed stages from namespaced tags (AC-4)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      maxIterations: 5,
      autoCommit: true,
      specsDir: 'specs',
    }));
    mkdirSync(resolve(tempDir, 'specs', '003-test'), { recursive: true });
    writeFile(tempDir, 'specs/003-test/spec.md', '# Spec');

    initGitRepo(tempDir, 'spec/003-test');

    // Create namespaced tags
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });
    execSync('git tag steel/003-test/clarification-complete', { cwd: tempDir });

    const state = await loadState(tempDir);
    expect(state.specId).toBe('003-test');
    expect(state.stages.specification.status).toBe('complete');
    expect(state.stages.clarification.status).toBe('complete');
    expect(state.currentStage).toBe('planning');
  });

  it('skips tag-based recovery when specId is null (AC-5)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      maxIterations: 5,
      autoCommit: true,
      specsDir: 'specs',
    }));

    initGitRepo(tempDir);

    // Create orphan namespaced tags — should not be picked up
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });

    const state = await loadState(tempDir);
    // specId is null (no branch match, no specs dir entries), so tags are skipped
    expect(state.specId).toBeUndefined();
    expect(state.currentStage).toBe('specification');
  });

  it('ignores legacy flat tags alongside namespaced tags (AC-9)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      maxIterations: 5,
      autoCommit: true,
      specsDir: 'specs',
    }));
    mkdirSync(resolve(tempDir, 'specs', '003-test'), { recursive: true });
    writeFile(tempDir, 'specs/003-test/spec.md', '# Spec');

    initGitRepo(tempDir, 'spec/003-test');

    // Create both legacy and namespaced tags
    execSync('git tag steel/specification-complete', { cwd: tempDir });
    execSync('git tag steel/clarification-complete', { cwd: tempDir });
    execSync('git tag steel/planning-complete', { cwd: tempDir });
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });

    const state = await loadState(tempDir);
    expect(state.specId).toBe('003-test');
    // Only the namespaced tag should count
    expect(state.stages.specification.status).toBe('complete');
    // Legacy tags for clarification/planning should be ignored
    expect(state.stages.clarification.status).not.toBe('complete');
    expect(state.stages.planning.status).not.toBe('complete');
  });
});

describe('resolveSpecId', () => {
  let tempDir: string;
  const defaultConfig: SteelConfig = {
    forge: { provider: 'codex' },
    gauge: { provider: 'codex' },
    maxIterations: 5,
    autoCommit: true,
    specsDir: 'specs',
  };

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves from branch with configured prefix', async () => {
    const config = { ...defaultConfig, git: { branchPrefix: 'feature/', baseBranch: 'main' } };
    mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
    initGitRepo(tempDir, 'feature/002-auth');

    const result = await resolveSpecId(tempDir, config);
    expect(result).toBe('002-auth');
  });

  it('falls back to specs-dir when branch does not match', async () => {
    mkdirSync(resolve(tempDir, 'specs', '003-namespace'), { recursive: true });
    mkdirSync(resolve(tempDir, 'specs', '001-first'), { recursive: true });
    initGitRepo(tempDir);

    const result = await resolveSpecId(tempDir, defaultConfig);
    // Should return highest-numbered (last sorted) entry
    expect(result).toBe('003-namespace');
  });

  it('returns null when no resolution path succeeds', async () => {
    initGitRepo(tempDir);

    const result = await resolveSpecId(tempDir, defaultConfig);
    expect(result).toBeNull();
  });
});
