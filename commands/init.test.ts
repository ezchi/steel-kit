import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Mock interactive prompts before importing the module
const selectMock = vi.fn();
const inputMock = vi.fn();
const confirmMock = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  select: (...args: any[]) => selectMock(...args),
  input: (...args: any[]) => inputMock(...args),
}));

vi.mock('../src/utils.js', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    step: vi.fn(),
  },
  confirm: (...args: any[]) => confirmMock(...args),
}));

vi.mock('../src/git-ops.js', () => ({
  commitStep: vi.fn(),
}));

vi.mock('../src/providers/index.js', () => ({
  getProvider: () => ({ check: () => Promise.resolve(true) }),
}));

vi.mock('../src/command-installer.js', () => ({
  installProjectCommands: () =>
    Promise.resolve({ claude: 0, codex: 0, warnings: [] }),
}));

import { cmdInit } from './init.js';

function makeTempDir(): string {
  const dir = resolve(
    tmpdir(),
    `steel-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('cmdInit git config', () => {
  let tempDir: string;
  let origCwd: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    origCwd = process.cwd();
    process.chdir(tempDir);
    // Reset mocks
    selectMock.mockReset();
    inputMock.mockReset();
    confirmMock.mockReset();
    // Default: no overwrite prompts
    confirmMock.mockResolvedValue(false);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  function setupPrompts(opts?: {
    forge?: string;
    gauge?: string;
    baseBranch?: string;
    branchPrefix?: string;
  }) {
    const forge = opts?.forge ?? 'claude';
    const gauge = opts?.gauge ?? 'gemini';
    const baseBranch = opts?.baseBranch ?? 'main';
    const branchPrefix = opts?.branchPrefix ?? 'spec/';

    // select() is called twice (forge, gauge)
    selectMock
      .mockResolvedValueOnce(forge)
      .mockResolvedValueOnce(gauge);
    // input() is called twice (baseBranch, branchPrefix)
    inputMock
      .mockResolvedValueOnce(baseBranch)
      .mockResolvedValueOnce(branchPrefix);
  }

  function readConfig(): Record<string, any> {
    const configPath = resolve(tempDir, '.steel', 'config.json');
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  it('stores git settings with correct defaults (AC-13)', async () => {
    setupPrompts();
    await cmdInit();
    const config = readConfig();
    expect(config.git).toEqual({
      baseBranch: 'main',
      branchPrefix: 'spec/',
    });
  });

  it('stores user-supplied git values (AC-13)', async () => {
    setupPrompts({ baseBranch: 'develop', branchPrefix: 'feature/' });
    await cmdInit();
    const config = readConfig();
    expect(config.git.baseBranch).toBe('develop');
    expect(config.git.branchPrefix).toBe('feature/');
  });

  it('re-init preserves existing config keys (AC-27)', async () => {
    // Seed existing config
    mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
    writeFileSync(
      resolve(tempDir, '.steel', 'config.json'),
      JSON.stringify({
        forge: { provider: 'codex' },
        gauge: { provider: 'codex' },
        maxIterations: 10,
        autoCommit: false,
        specsDir: 'my-specs',
      }),
    );

    // On re-init, shouldWriteFile will prompt for overwrite — allow config but skip others
    confirmMock.mockResolvedValue(false);
    setupPrompts({ forge: 'claude', gauge: 'gemini' });
    await cmdInit();

    const config = readConfig();
    // Provider selections are updated from interactive prompts
    expect(config.forge.provider).toBe('claude');
    expect(config.gauge.provider).toBe('gemini');
    // Existing values preserved (not overwritten with defaults)
    expect(config.maxIterations).toBe(10);
    expect(config.autoCommit).toBe(false);
    expect(config.specsDir).toBe('my-specs');
  });

  it('re-init preserves unknown top-level fields (FR-27 forward-compat)', async () => {
    mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
    writeFileSync(
      resolve(tempDir, '.steel', 'config.json'),
      JSON.stringify({
        forge: { provider: 'codex' },
        gauge: { provider: 'codex' },
        futureField: true,
        customPlugin: { name: 'test' },
      }),
    );

    confirmMock.mockResolvedValue(false);
    setupPrompts();
    await cmdInit();

    const config = readConfig();
    expect(config.futureField).toBe(true);
    expect(config.customPlugin).toEqual({ name: 'test' });
  });

  it('invalid baseBranch re-prompts (AC-28)', async () => {
    // select: forge, gauge
    selectMock
      .mockResolvedValueOnce('claude')
      .mockResolvedValueOnce('gemini');

    // input: first baseBranch is invalid (main~1), second is valid (main)
    // then branchPrefix is valid (spec/)
    inputMock
      .mockResolvedValueOnce('main~1')  // invalid — triggers re-prompt
      .mockResolvedValueOnce('main')     // valid
      .mockResolvedValueOnce('spec/');   // valid

    await cmdInit();

    // input was called 3 times (invalid + valid baseBranch + branchPrefix)
    expect(inputMock).toHaveBeenCalledTimes(3);
    const config = readConfig();
    expect(config.git.baseBranch).toBe('main');
  });

  it('invalid branchPrefix re-prompts (FR-26)', async () => {
    selectMock
      .mockResolvedValueOnce('claude')
      .mockResolvedValueOnce('gemini');

    // input: baseBranch valid, then invalid prefix (feat..ure/), then valid
    inputMock
      .mockResolvedValueOnce('main')         // valid baseBranch
      .mockResolvedValueOnce('feat..ure/')   // invalid — contains ..
      .mockResolvedValueOnce('feature/');    // valid

    await cmdInit();

    expect(inputMock).toHaveBeenCalledTimes(3);
    const config = readConfig();
    expect(config.git.branchPrefix).toBe('feature/');
  });
});
