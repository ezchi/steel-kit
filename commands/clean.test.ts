import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const confirmMock = vi.fn();

vi.mock('../src/utils.js', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
  confirm: (...args: any[]) => confirmMock(...args),
  die: (msg: string) => { throw new Error(msg); },
}));

vi.mock('../src/git-ops.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/git-ops.js')>();
  return {
    ...actual,
    commitStep: vi.fn(),
  };
});

import { cmdClean } from './clean.js';

function makeTempDir(): string {
  const dir = resolve(
    tmpdir(),
    `steel-clean-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

function getTags(dir: string): string[] {
  return execSync('git tag -l', { cwd: dir }).toString().trim().split('\n').filter(Boolean);
}

function makeConfig(overrides: Record<string, any> = {}): string {
  return JSON.stringify({
    forge: { provider: 'codex' },
    gauge: { provider: 'codex' },
    maxIterations: 5,
    autoCommit: false,
    specsDir: 'specs',
    ...overrides,
  });
}

describe('cmdClean scoped tag cleanup', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
    confirmMock.mockResolvedValue(true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  it('only deletes active spec tags, other spec tags remain (AC-3)', async () => {
    writeFile(tempDir, '.steel/config.json', makeConfig());
    writeFile(tempDir, '.steel/.gitignore', 'state.json');
    writeFile(tempDir, '.steel/state.json', JSON.stringify({
      currentStage: 'planning',
      iteration: 1,
      specId: '003-test',
      stages: {
        specification: { status: 'complete' },
        clarification: { status: 'complete' },
        planning: { status: 'in_progress' },
        task_breakdown: { status: 'pending' },
        implementation: { status: 'pending' },
        validation: { status: 'pending' },
        retrospect: { status: 'pending' },
      },
    }));
    mkdirSync(resolve(tempDir, 'specs', '003-test', 'artifacts'), { recursive: true });

    initGitRepo(tempDir, 'spec/003-test');
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });
    execSync('git tag steel/003-test/clarification-complete', { cwd: tempDir });
    execSync('git tag steel/001-other/specification-complete', { cwd: tempDir });

    await cmdClean();

    const tags = getTags(tempDir);
    // Other spec's tags should remain
    expect(tags).toContain('steel/001-other/specification-complete');
    // Active spec's tags should be deleted
    expect(tags).not.toContain('steel/003-test/specification-complete');
    expect(tags).not.toContain('steel/003-test/clarification-complete');
  });

  it('resolves specId from branch when state.specId is null (AC-13)', async () => {
    writeFile(tempDir, '.steel/config.json', makeConfig());
    writeFile(tempDir, '.steel/.gitignore', 'state.json');
    writeFile(tempDir, '.steel/state.json', JSON.stringify({
      currentStage: 'planning',
      iteration: 1,
      stages: {
        specification: { status: 'complete' },
        clarification: { status: 'complete' },
        planning: { status: 'in_progress' },
        task_breakdown: { status: 'pending' },
        implementation: { status: 'pending' },
        validation: { status: 'pending' },
        retrospect: { status: 'pending' },
      },
    }));

    initGitRepo(tempDir, 'spec/003-test');
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });
    execSync('git tag steel/001-other/specification-complete', { cwd: tempDir });

    await cmdClean();

    const tags = getTags(tempDir);
    expect(tags).toContain('steel/001-other/specification-complete');
    expect(tags).not.toContain('steel/003-test/specification-complete');
  });

  it('resolves specId from specs-dir when branch fails (AC-13 specs-dir path)', async () => {
    writeFile(tempDir, '.steel/config.json', makeConfig());
    writeFile(tempDir, '.steel/.gitignore', 'state.json');
    writeFile(tempDir, '.steel/state.json', JSON.stringify({
      currentStage: 'planning',
      iteration: 1,
      stages: {
        specification: { status: 'complete' },
        clarification: { status: 'complete' },
        planning: { status: 'in_progress' },
        task_breakdown: { status: 'pending' },
        implementation: { status: 'pending' },
        validation: { status: 'pending' },
        retrospect: { status: 'pending' },
      },
    }));
    // specs-dir has 003-test (highest-numbered) — resolveSpecId returns this
    mkdirSync(resolve(tempDir, 'specs', '001-first'), { recursive: true });
    mkdirSync(resolve(tempDir, 'specs', '003-test'), { recursive: true });

    initGitRepo(tempDir); // default branch, no spec/ prefix
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });
    execSync('git tag steel/001-first/specification-complete', { cwd: tempDir });

    await cmdClean();

    const tags = getTags(tempDir);
    // Resolved specId=003-test from specs-dir → scoped deletion
    expect(tags).not.toContain('steel/003-test/specification-complete');
    // Other spec's tags should survive
    expect(tags).toContain('steel/001-first/specification-complete');
  });

  it('ignores legacy flat tags during scoped cleanup (AC-9)', async () => {
    writeFile(tempDir, '.steel/config.json', makeConfig());
    writeFile(tempDir, '.steel/.gitignore', 'state.json');
    writeFile(tempDir, '.steel/state.json', JSON.stringify({
      currentStage: 'planning',
      iteration: 1,
      specId: '003-test',
      stages: {
        specification: { status: 'complete' },
        clarification: { status: 'complete' },
        planning: { status: 'in_progress' },
        task_breakdown: { status: 'pending' },
        implementation: { status: 'pending' },
        validation: { status: 'pending' },
        retrospect: { status: 'pending' },
      },
    }));

    initGitRepo(tempDir, 'spec/003-test');
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });
    execSync('git tag steel/specification-complete', { cwd: tempDir }); // legacy

    await cmdClean();

    const tags = getTags(tempDir);
    // Legacy tag should NOT be deleted (pattern steel/003-test/*-complete doesn't match it)
    expect(tags).toContain('steel/specification-complete');
    expect(tags).not.toContain('steel/003-test/specification-complete');
  });

  it('falls back to global deletion with warning when specId unresolvable', async () => {
    writeFile(tempDir, '.steel/config.json', makeConfig());
    writeFile(tempDir, '.steel/.gitignore', 'state.json');
    writeFile(tempDir, '.steel/state.json', JSON.stringify({
      currentStage: 'specification',
      iteration: 1,
      stages: {
        specification: { status: 'in_progress' },
        clarification: { status: 'pending' },
        planning: { status: 'pending' },
        task_breakdown: { status: 'pending' },
        implementation: { status: 'pending' },
        validation: { status: 'pending' },
        retrospect: { status: 'pending' },
      },
    }));
    // No specId in state, no matching branch, no specs dir

    initGitRepo(tempDir);
    execSync('git tag steel/003-test/specification-complete', { cwd: tempDir });
    execSync('git tag steel/001-other/specification-complete', { cwd: tempDir });

    await cmdClean();

    const tags = getTags(tempDir);
    // Global fallback steel/*/*-complete deletes ALL namespaced tags
    expect(tags).not.toContain('steel/003-test/specification-complete');
    expect(tags).not.toContain('steel/001-other/specification-complete');
  });
});
