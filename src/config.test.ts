import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from './config.js';

function makeTempDir(): string {
  const dir = resolve(tmpdir(), `steel-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = resolve(dir, relPath);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

describe('loadConfig git env vars', () => {
  let tempDir: string;
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    tempDir = makeTempDir();
    // Backup env vars
    for (const key of [
      'STEEL_GIT_WORKFLOW',
      'STEEL_GIT_BRANCH_PREFIX',
      'STEEL_GIT_BASE_BRANCH',
      'STEEL_GIT_DEVELOP_BRANCH',
    ]) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    // Restore env vars
    for (const [key, val] of Object.entries(envBackup)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  it('STEEL_GIT_BRANCH_PREFIX overrides config (AC-14)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      git: { branchPrefix: 'spec/' },
    }));
    process.env.STEEL_GIT_BRANCH_PREFIX = 'eda-';
    const config = await loadConfig(tempDir);
    expect(config.git?.branchPrefix).toBe('eda-');
  });

  it('STEEL_GIT_BASE_BRANCH overrides config (FR-7)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
    }));
    process.env.STEEL_GIT_BASE_BRANCH = 'develop';
    const config = await loadConfig(tempDir);
    expect(config.git?.baseBranch).toBe('develop');
  });

  it('STEEL_GIT_DEVELOP_BRANCH overrides config (FR-7)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
    }));
    process.env.STEEL_GIT_DEVELOP_BRANCH = 'develop';
    const config = await loadConfig(tempDir);
    expect(config.git?.developBranch).toBe('develop');
  });

  it('invalid STEEL_GIT_WORKFLOW is ignored with warning (AC-15)', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
    }));
    process.env.STEEL_GIT_WORKFLOW = 'invalid';
    const config = await loadConfig(tempDir);
    expect(config.git?.workflow).toBeUndefined();
  });

  it('valid STEEL_GIT_WORKFLOW is applied', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
    }));
    process.env.STEEL_GIT_WORKFLOW = 'gitflow';
    const config = await loadConfig(tempDir);
    expect(config.git?.workflow).toBe('gitflow');
  });

  it('multiple env vars applied simultaneously', async () => {
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
    }));
    process.env.STEEL_GIT_WORKFLOW = 'gitflow';
    process.env.STEEL_GIT_BRANCH_PREFIX = 'eda-';
    process.env.STEEL_GIT_BASE_BRANCH = 'develop';
    process.env.STEEL_GIT_DEVELOP_BRANCH = 'develop';
    const config = await loadConfig(tempDir);
    expect(config.git).toEqual({
      workflow: 'gitflow',
      branchPrefix: 'eda-',
      baseBranch: 'develop',
      developBranch: 'develop',
    });
  });
});

describe('mergeConfig git deep-merge (FR-6)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    // Clean git env vars
    for (const key of [
      'STEEL_GIT_WORKFLOW',
      'STEEL_GIT_BRANCH_PREFIX',
      'STEEL_GIT_BASE_BRANCH',
      'STEEL_GIT_DEVELOP_BRANCH',
    ]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('deep-merges git from yaml and json', async () => {
    // YAML sets workflow, JSON sets branchPrefix
    writeFile(tempDir, 'steel.config.yaml', 'git:\n  workflow: gitflow\n');
    writeFile(tempDir, '.steel/config.json', JSON.stringify({
      forge: { provider: 'codex' },
      gauge: { provider: 'codex' },
      git: { branchPrefix: 'eda-' },
    }));
    const config = await loadConfig(tempDir);
    // Both should be present (deep-merged)
    expect(config.git?.workflow).toBe('gitflow');
    expect(config.git?.branchPrefix).toBe('eda-');
  });
});
