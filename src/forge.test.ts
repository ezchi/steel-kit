import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { SteelConfig } from './config.js';

function makeTempDir(): string {
  const dir = resolve(
    tmpdir(),
    `steel-forge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function baseConfig(overrides: Partial<SteelConfig> = {}): SteelConfig {
  return {
    forge: { provider: 'claude' },
    gauge: { provider: 'claude' },
    maxIterations: 5,
    autoCommit: true,
    specsDir: 'specs',
    git: { branchPrefix: 'spec/', baseBranch: 'main' },
    ...overrides,
  } as SteelConfig;
}

const captured: { prompt: string | null } = { prompt: null };

vi.mock('./providers/index.js', () => ({
  getProvider: () => ({
    name: 'fake',
    invoke: async (prompt: string) => {
      captured.prompt = prompt;
      return 'fake forge output';
    },
    check: async () => true,
  }),
}));

describe('forgeExecute BASE_BRANCH injection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    captured.prompt = null;
    // Set up a minimal Forge plan template that references {{BASE_BRANCH}}
    mkdirSync(resolve(tempDir, '.steel', 'prompts', 'forge'), { recursive: true });
    writeFileSync(
      resolve(tempDir, '.steel', 'prompts', 'forge', 'plan.md'),
      'BASE={{BASE_BRANCH}}\nSPEC={{SPEC}}\n',
      'utf-8',
    );
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('substitutes BASE_BRANCH from ctx.baseBranch when provided (per-spec)', async () => {
    const { forgeExecute } = await import('./forge.js');
    await forgeExecute(baseConfig(), {
      stage: 'planning',
      iteration: 1,
      specContent: '# spec',
      baseBranch: 'develop',
      projectRoot: tempDir,
    });
    expect(captured.prompt).toContain('BASE=develop');
    expect(captured.prompt).not.toContain('{{BASE_BRANCH}}');
  });

  it('falls back to config.git.baseBranch when ctx.baseBranch is undefined', async () => {
    const { forgeExecute } = await import('./forge.js');
    await forgeExecute(
      baseConfig({ git: { branchPrefix: 'spec/', baseBranch: 'trunk' } }),
      {
        stage: 'planning',
        iteration: 1,
        specContent: '# spec',
        projectRoot: tempDir,
      },
    );
    expect(captured.prompt).toContain('BASE=trunk');
  });

  it('per-spec ctx.baseBranch overrides config default', async () => {
    const { forgeExecute } = await import('./forge.js');
    await forgeExecute(
      baseConfig({ git: { branchPrefix: 'spec/', baseBranch: 'main' } }),
      {
        stage: 'planning',
        iteration: 1,
        specContent: '# spec',
        baseBranch: 'feature/stacked-base',
        projectRoot: tempDir,
      },
    );
    expect(captured.prompt).toContain('BASE=feature/stacked-base');
    expect(captured.prompt).not.toContain('BASE=main');
  });
});
