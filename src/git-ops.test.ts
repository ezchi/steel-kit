import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { checkIgnoredPaths } from './git-ops.js';

function makeTempRepo(): string {
  const dir = resolve(
    tmpdir(),
    `steel-git-ops-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function gitInit(dir: string): Promise<void> {
  await execa('git', ['init', '-q'], { cwd: dir });
  await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await execa('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
}

describe('checkIgnoredPaths', () => {
  let repo: string;

  beforeEach(async () => {
    repo = makeTempRepo();
    await gitInit(repo);
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('returns [] when no paths given', async () => {
    expect(await checkIgnoredPaths(repo, [])).toEqual([]);
  });

  it('returns [] when paths are not ignored', async () => {
    writeFileSync(resolve(repo, 'foo.txt'), 'hi');
    expect(await checkIgnoredPaths(repo, ['foo.txt'])).toEqual([]);
  });

  it('reports paths matched by gitignore rules', async () => {
    writeFileSync(resolve(repo, '.gitignore'), '.steel\n');
    mkdirSync(resolve(repo, '.steel'));
    writeFileSync(resolve(repo, '.steel', '.gitignore'), '*\n');
    const result = await checkIgnoredPaths(repo, ['.steel/.gitignore']);
    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('.steel/.gitignore');
    expect(result[0]?.rule).toContain('.steel');
  });

  // Regression: a tracked file inside an ignored directory must still be
  // reported as ignored. Without --no-index, git check-ignore returns
  // "not ignored" for tracked paths even when the parent dir matches an
  // ignore rule — yet `git add` still refuses with the dir-level ignore
  // error. This caused steel init to crash on re-init when a previous run
  // had force-added .steel/.gitignore.
  it('reports tracked files inside ignored directories', async () => {
    writeFileSync(resolve(repo, '.gitignore'), '.steel\n');
    mkdirSync(resolve(repo, '.steel'));
    writeFileSync(resolve(repo, '.steel', '.gitignore'), '*\n');
    await execa('git', ['add', '-f', '.gitignore', '.steel/.gitignore'], { cwd: repo });
    await execa('git', ['commit', '-m', 'seed'], { cwd: repo });

    const result = await checkIgnoredPaths(repo, ['.steel/.gitignore']);
    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('.steel/.gitignore');
  });

  it('handles whitelist-style gitignore (* with !exceptions)', async () => {
    writeFileSync(
      resolve(repo, '.gitignore'),
      '*\n!README.md\n!/lisp/\n/lisp/*\n!/lisp/*.el\n',
    );
    mkdirSync(resolve(repo, '.steel'));
    writeFileSync(resolve(repo, '.steel', '.gitignore'), 'x');
    const result = await checkIgnoredPaths(repo, [
      resolve(repo, '.steel/.gitignore'),
    ]);
    expect(result).toHaveLength(1);
  });
});
