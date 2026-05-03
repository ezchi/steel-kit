import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  const dir = resolve(
    tmpdir(),
    `steel-render-prompt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = resolve(dir, relPath);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function setupProject(dir: string, opts: { baseBranch?: string; configBase?: string } = {}): void {
  writeFile(dir, '.steel/config.json', JSON.stringify({
    forge: { provider: 'codex' },
    gauge: { provider: 'codex' },
    maxIterations: 5,
    autoCommit: true,
    specsDir: 'specs',
    git: { branchPrefix: 'spec/', baseBranch: opts.configBase ?? 'main' },
  }));
  writeFile(dir, '.steel/constitution.md', '# Constitution\n\nProject rules.');
  writeFile(dir, 'specs/001-foo/spec.md', '# Spec\n\nFR-1: Do the thing.');
  writeFile(dir, '.steel/prompts/forge/plan.md', 'BASE={{BASE_BRANCH}}\nCONST={{CONSTITUTION}}\nSPEC={{SPEC}}\n');

  const stateFields: any = {
    currentStage: 'planning',
    iteration: 1,
    specId: '001-foo',
    branch: 'spec/001-foo',
    description: 'foo',
    stages: {
      specification: { status: 'complete' },
      clarification: { status: 'complete' },
      planning: { status: 'in_progress', iteration: 1 },
      task_breakdown: { status: 'pending' },
      implementation: { status: 'pending' },
      validation: { status: 'pending' },
      retrospect: { status: 'pending' },
    },
  };
  if (opts.baseBranch !== undefined) {
    stateFields.baseBranch = opts.baseBranch;
  }
  writeFile(dir, '.steel/state.json', JSON.stringify(stateFields));
}

describe('render-prompt helper', () => {
  let tempDir: string;
  let cwdSpy: any;
  let stdoutSpy: any;
  let warnSpy: any;
  let captured: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    captured = '';
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write' as any)
      .mockImplementation(((data: any) => {
        captured += String(data);
        return true;
      }) as any);
    warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // log.warn writes to stderr
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();
    warnSpy.mockRestore();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('substitutes BASE_BRANCH from state.baseBranch when present', async () => {
    setupProject(tempDir, { baseBranch: 'develop', configBase: 'main' });
    const { cmdRenderPrompt } = await import('./render-prompt.js');
    await cmdRenderPrompt({ role: 'forge', stage: 'planning' });
    expect(captured).toContain('BASE=develop');
    expect(captured).not.toContain('BASE=main');
    expect(captured).not.toContain('{{BASE_BRANCH}}');
  });

  it('falls back to config.git.baseBranch when state.baseBranch is missing', async () => {
    setupProject(tempDir, { baseBranch: undefined, configBase: 'main' });
    const { cmdRenderPrompt } = await import('./render-prompt.js');
    await cmdRenderPrompt({ role: 'forge', stage: 'planning' });
    expect(captured).toContain('BASE=main');
  });

  it('substitutes SPEC and CONSTITUTION from canonical paths', async () => {
    setupProject(tempDir, { baseBranch: 'develop' });
    const { cmdRenderPrompt } = await import('./render-prompt.js');
    await cmdRenderPrompt({ role: 'forge', stage: 'planning' });
    expect(captured).toContain('SPEC=# Spec');
    expect(captured).toContain('CONST=# Constitution');
  });

  it('writes to --output file when specified', async () => {
    setupProject(tempDir, { baseBranch: 'develop' });
    const outPath = resolve(tempDir, 'rendered.md');
    const { cmdRenderPrompt } = await import('./render-prompt.js');
    await cmdRenderPrompt({ role: 'forge', stage: 'planning', output: outPath });
    expect(existsSync(outPath)).toBe(true);
    // captured stdout is just the path
    expect(captured.trim()).toBe(outPath);
  });

  it('uses template override instead of role+stage auto-mapping', async () => {
    setupProject(tempDir, { baseBranch: 'develop' });
    // Project-local override for the custom gauge template.
    writeFile(
      tempDir,
      '.steel/prompts/gauge/review-verification.md',
      'CUSTOM_TEMPLATE\nFORGE_OUTPUT={{FORGE_OUTPUT}}',
    );
    writeFile(tempDir, '.steel/tmp/forge-art.md', 'forge artifact body');

    const { cmdRenderPrompt } = await import('./render-prompt.js');
    await cmdRenderPrompt({
      role: 'gauge',
      stage: 'implementation',
      template: 'review-verification',
      reviewTarget: resolve(tempDir, '.steel/tmp/forge-art.md'),
    });
    expect(captured).toContain('CUSTOM_TEMPLATE');
    expect(captured).toContain('FORGE_OUTPUT=forge artifact body');
  });
});
