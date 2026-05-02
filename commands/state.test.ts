import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  const dir = resolve(
    tmpdir(),
    `steel-state-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = resolve(dir, relPath);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function setupProject(dir: string): void {
  writeFile(dir, '.steel/config.json', JSON.stringify({
    forge: { provider: 'codex' },
    gauge: { provider: 'codex' },
    maxIterations: 5,
    autoCommit: true,
    specsDir: 'specs',
    git: { branchPrefix: 'spec/', baseBranch: 'main' },
  }));
  writeFile(dir, '.steel/state.json', JSON.stringify({
    currentStage: 'planning',
    iteration: 1,
    specId: '001-foo',
    branch: 'spec/001-foo',
    baseBranch: 'develop',
    stages: {
      specification: { status: 'complete' },
      clarification: { status: 'complete' },
      planning: { status: 'in_progress', iteration: 1 },
      task_breakdown: { status: 'pending' },
      implementation: { status: 'pending' },
      validation: { status: 'pending' },
      retrospect: { status: 'pending' },
    },
  }));
}

function readState(dir: string): any {
  return JSON.parse(readFileSync(resolve(dir, '.steel/state.json'), 'utf-8'));
}

describe('state helper subcommands', () => {
  let tempDir: string;
  let cwdSpy: any;
  let stdoutSpy: any;
  let captured: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    setupProject(tempDir);
    captured = '';
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write' as any)
      .mockImplementation(((data: any) => {
        captured += String(data);
        return true;
      }) as any);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('iter --inc increments iteration and mirrors to current stage', async () => {
    const { cmdStateIter } = await import('./state.js');
    await cmdStateIter({ inc: true });
    const state = readState(tempDir);
    expect(state.iteration).toBe(2);
    expect(state.stages.planning.iteration).toBe(2);
    expect(captured.trim()).toBe('2');
  });

  it('iter --reset sets iteration to 1', async () => {
    const { cmdStateIter } = await import('./state.js');
    await cmdStateIter({ inc: true });
    await cmdStateIter({ inc: true });
    captured = '';
    await cmdStateIter({ reset: true });
    expect(readState(tempDir).iteration).toBe(1);
    expect(captured.trim()).toBe('1');
  });

  it('iter --set <n> sets iteration to specific value', async () => {
    const { cmdStateIter } = await import('./state.js');
    await cmdStateIter({ set: 5 });
    expect(readState(tempDir).iteration).toBe(5);
  });

  it('mark sets stage status and stamps startedAt/completedAt', async () => {
    const { cmdStateMark } = await import('./state.js');
    await cmdStateMark({ stage: 'task_breakdown', status: 'in_progress' });
    let state = readState(tempDir);
    expect(state.stages.task_breakdown.status).toBe('in_progress');
    expect(state.stages.task_breakdown.startedAt).toBeTruthy();
    expect(state.stages.task_breakdown.completedAt).toBeUndefined();

    await cmdStateMark({ stage: 'task_breakdown', status: 'complete' });
    state = readState(tempDir);
    expect(state.stages.task_breakdown.status).toBe('complete');
    expect(state.stages.task_breakdown.completedAt).toBeTruthy();
  });

  it('advance-stage marks current complete and moves forward', async () => {
    const { cmdStateAdvance } = await import('./state.js');
    await cmdStateAdvance();
    const state = readState(tempDir);
    expect(state.stages.planning.status).toBe('complete');
    expect(state.stages.planning.completedAt).toBeTruthy();
    expect(state.currentStage).toBe('task_breakdown');
    expect(state.iteration).toBe(1);
  });

  it('get returns full state as JSON when no field is given', async () => {
    const { cmdStateGet } = await import('./state.js');
    await cmdStateGet({});
    const parsed = JSON.parse(captured);
    expect(parsed.specId).toBe('001-foo');
    expect(parsed.baseBranch).toBe('develop');
  });

  it('get --field resolves dotted paths', async () => {
    const { cmdStateGet } = await import('./state.js');
    await cmdStateGet({ field: 'baseBranch' });
    expect(captured.trim()).toBe('develop');
    captured = '';
    await cmdStateGet({ field: 'stages.planning.status' });
    expect(captured.trim()).toBe('in_progress');
  });

  it('init writes spec-level fields atomically', async () => {
    const { cmdStateInit } = await import('./state.js');
    await cmdStateInit({
      specId: '002-bar',
      baseBranch: 'feature/some-stack',
      description: 'stacked spec',
      branch: 'spec/002-bar',
    });
    const state = readState(tempDir);
    expect(state.specId).toBe('002-bar');
    expect(state.baseBranch).toBe('feature/some-stack');
    expect(state.description).toBe('stacked spec');
    expect(state.branch).toBe('spec/002-bar');
  });

  it('set-skills records skills used in a stage', async () => {
    const { cmdStateSetSkills } = await import('./state.js');
    await cmdStateSetSkills({ stage: 'planning', skills: ['sv-gen', 'systemverilog-core'] });
    const state = readState(tempDir);
    expect(state.skillsUsed.planning).toEqual(['sv-gen', 'systemverilog-core']);
  });
});
