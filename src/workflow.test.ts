import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { loadState } from './workflow.js';

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
