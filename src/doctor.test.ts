import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runDoctor } from './doctor.js';
import type { DoctorResult } from './doctor.js';

function makeTempDir(): string {
  const dir = resolve(tmpdir(), `steel-doctor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function initGitRepo(dir: string): void {
  const { execSync } = require('node:child_process');
  execSync('git init', { cwd: dir, stdio: 'ignore' });
  execSync('git commit --allow-empty -m "init"', { cwd: dir, stdio: 'ignore' });
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = resolve(dir, relPath);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function findDiag(result: DoctorResult, id: string) {
  return result.diagnostics.find((d) => d.id === id);
}

function findDiags(result: DoctorResult, id: string) {
  return result.diagnostics.filter((d) => d.id === id);
}

describe('runDoctor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('init checks', () => {
    it('reports fail when .steel/ is missing', async () => {
      const result = await runDoctor(tempDir);
      const diag = findDiag(result, 'init-steel-dir');
      expect(diag).toBeDefined();
      expect(diag!.status).toBe('fail');
      expect(result.status).toBe('fail');
    });

    it('reports fail for missing config.json', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/constitution.md', '# Real constitution\nSome content');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');

      const result = await runDoctor(tempDir);
      const diag = findDiag(result, 'init-config');
      expect(diag).toBeDefined();
      expect(diag!.status).toBe('fail');
    });

    it('reports warn for missing .gitignore', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', '{"forge":{"provider":"codex"},"gauge":{"provider":"codex"},"maxIterations":5,"autoCommit":true,"specsDir":"specs"}');
      writeFile(tempDir, '.steel/constitution.md', '# Real constitution\nContent');

      const result = await runDoctor(tempDir);
      const diag = findDiag(result, 'init-gitignore');
      expect(diag).toBeDefined();
      expect(diag!.status).toBe('warn');
    });

    it('reports fail for corrupt state.json', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', '{"forge":{"provider":"codex"},"gauge":{"provider":"codex"},"maxIterations":5,"autoCommit":true,"specsDir":"specs"}');
      writeFile(tempDir, '.steel/constitution.md', '# Real\nContent');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');
      writeFile(tempDir, '.steel/state.json', '{not valid json!!!');

      const result = await runDoctor(tempDir);
      const diag = findDiag(result, 'init-state-corrupt');
      expect(diag).toBeDefined();
      expect(diag!.status).toBe('fail');
    });
  });

  describe('constitution check', () => {
    it('reports fail for placeholder constitution', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', '{"forge":{"provider":"codex"},"gauge":{"provider":"codex"},"maxIterations":5,"autoCommit":true,"specsDir":"specs"}');
      writeFile(tempDir, '.steel/constitution.md', '<!-- Define the core principles for your project -->');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');

      const result = await runDoctor(tempDir);
      const diag = findDiag(result, 'constitution-ready');
      expect(diag).toBeDefined();
      expect(diag!.status).toBe('fail');
    });

    it('reports pass for real constitution', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', '{"forge":{"provider":"codex"},"gauge":{"provider":"codex"},"maxIterations":5,"autoCommit":true,"specsDir":"specs"}');
      writeFile(tempDir, '.steel/constitution.md', '# Project Constitution\nReal content here.');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');

      const result = await runDoctor(tempDir);
      const diag = findDiag(result, 'constitution-ready');
      expect(diag).toBeDefined();
      expect(diag!.status).toBe('pass');
    });
  });

  describe('stage file checks', () => {
    it('reports fail for missing prior-stage file', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', '{"forge":{"provider":"codex"},"gauge":{"provider":"codex"},"maxIterations":5,"autoCommit":true,"specsDir":"specs"}');
      writeFile(tempDir, '.steel/constitution.md', '# Real\nContent');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');
      writeFile(tempDir, '.steel/state.json', JSON.stringify({
        currentStage: 'planning',
        iteration: 1,
        specId: '001-test',
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
      // Create spec dir with only plan.md — missing spec.md and clarifications.md
      mkdirSync(resolve(tempDir, 'specs', '001-test'), { recursive: true });
      writeFile(tempDir, 'specs/001-test/plan.md', '# Plan');

      initGitRepo(tempDir);

      const result = await runDoctor(tempDir);
      const priorFails = findDiags(result, 'stage-files-prior').filter(
        (d) => d.status === 'fail',
      );
      expect(priorFails.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('legacy-prefix drift', () => {
    it('stale state.branch=spec/* does NOT suppress drift when live branch differs', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', JSON.stringify({
        forge: { provider: 'codex' },
        gauge: { provider: 'codex' },
        maxIterations: 5,
        autoCommit: true,
        specsDir: 'specs',
        git: { branchPrefix: 'feature/', baseBranch: 'main' },
      }));
      writeFile(tempDir, '.steel/constitution.md', '# Real\nContent');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');
      writeFile(tempDir, '.steel/state.json', JSON.stringify({
        currentStage: 'planning',
        iteration: 1,
        specId: '001-test',
        branch: 'spec/001-test', // stale state.branch with legacy prefix
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
      mkdirSync(resolve(tempDir, 'specs', '001-test'), { recursive: true });
      writeFile(tempDir, 'specs/001-test/spec.md', '# Spec');

      // Set up a real git repo on 'main' (not spec/*)
      const { execSync } = require('node:child_process');
      execSync('git init', { cwd: tempDir, stdio: 'ignore' });
      execSync('git checkout -b main', { cwd: tempDir, stdio: 'ignore' });
      execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

      const result = await runDoctor(tempDir);
      // Should NOT emit drift-legacy-prefix because live branch is 'main', not 'spec/*'
      const legacyDiag = findDiag(result, 'drift-legacy-prefix');
      expect(legacyDiag).toBeUndefined();
      // Should still flag drift-branch-state-branch because state.branch doesn't match expected
      const driftDiag = findDiag(result, 'drift-branch-state-branch');
      expect(driftDiag).toBeDefined();
    });
  });

  describe('aggregation', () => {
    it('returns pass when .steel/ is fully healthy', async () => {
      mkdirSync(resolve(tempDir, '.steel'), { recursive: true });
      writeFile(tempDir, '.steel/config.json', '{"forge":{"provider":"codex"},"gauge":{"provider":"codex"},"maxIterations":5,"autoCommit":true,"specsDir":"specs"}');
      writeFile(tempDir, '.steel/constitution.md', '# Real Constitution\nContent');
      writeFile(tempDir, '.steel/.gitignore', 'state.json');

      const result = await runDoctor(tempDir);
      // Should have no fail diagnostics for init checks
      const fails = result.diagnostics.filter((d) => d.id.startsWith('init-') && d.status === 'fail');
      expect(fails).toHaveLength(0);
    });

    it('returns correct counts', async () => {
      const result = await runDoctor(tempDir);
      expect(result.counts.pass + result.counts.warn + result.counts.fail).toBe(
        result.diagnostics.length,
      );
    });
  });

  describe('DoctorResult schema', () => {
    it('has required fields for JSON output', async () => {
      const result = await runDoctor(tempDir);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('diagnostics');
      expect(result).toHaveProperty('counts');
      expect(result.counts).toHaveProperty('pass');
      expect(result.counts).toHaveProperty('warn');
      expect(result.counts).toHaveProperty('fail');
      expect(['pass', 'warn', 'fail']).toContain(result.status);

      for (const d of result.diagnostics) {
        expect(d).toHaveProperty('id');
        expect(d).toHaveProperty('status');
        expect(d).toHaveProperty('summary');
        expect(['pass', 'warn', 'fail']).toContain(d.status);
      }
    });
  });
});
