import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { slugify, generateSpecId } from './spec-id.js';

function makeTempDir(): string {
  const dir = resolve(tmpdir(), `steel-specid-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('slugify', () => {
  it('lowercases and strips special chars (AC-31)', () => {
    expect(slugify('Add Auth!!!')).toBe('add-auth');
  });

  it('trims whitespace, no leading/trailing hyphens (AC-32)', () => {
    expect(slugify('  spaced  out  ')).toBe('spaced-out');
  });

  it('truncates to 40 chars (AC-33)', () => {
    const long = 'this is a very long feature description that exceeds the limit';
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it('collapses multiple spaces to single hyphen', () => {
    expect(slugify('add   user   auth')).toBe('add-user-auth');
  });

  it('parity across modes (AC-34)', () => {
    const desc = '  Spaced  Out!!  ';
    expect(slugify(desc)).toBe('spaced-out');
  });
});

describe('generateSpecId', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('with --id produces custom prefix (AC-4)', () => {
    const result = generateSpecId({
      projectRoot: tempDir,
      specsDir: 'specs',
      description: 'add auth',
      customId: 'PROJ-21',
    });
    expect(result).toBe('PROJ-21-add-auth');
  });

  it('without --id auto-increments (AC-5)', () => {
    // Create one existing spec dir
    mkdirSync(resolve(tempDir, 'specs', '001-first-spec'), { recursive: true });
    const result = generateSpecId({
      projectRoot: tempDir,
      specsDir: 'specs',
      description: 'add auth',
    });
    expect(result).toBe('002-add-auth');
  });

  it('starts at 001 with no existing specs', () => {
    const result = generateSpecId({
      projectRoot: tempDir,
      specsDir: 'specs',
      description: 'test',
    });
    expect(result).toBe('001-test');
  });

  it('detects collision with existing dir (AC-30)', () => {
    mkdirSync(resolve(tempDir, 'specs', 'PROJ-21-add-auth'), { recursive: true });
    expect(() =>
      generateSpecId({
        projectRoot: tempDir,
        specsDir: 'specs',
        description: 'add auth',
        customId: 'PROJ-21',
      })
    ).toThrow("Spec directory 'specs/PROJ-21-add-auth' already exists");
  });

  it('rejects invalid --id with space (AC-19)', () => {
    expect(() =>
      generateSpecId({
        projectRoot: tempDir,
        specsDir: 'specs',
        description: 'test',
        customId: 'hello world',
      })
    ).toThrow(' ');
  });

  it('rejects invalid --id with tilde (AC-20)', () => {
    expect(() =>
      generateSpecId({
        projectRoot: tempDir,
        specsDir: 'specs',
        description: 'test',
        customId: 'feat~1',
      })
    ).toThrow('~');
  });

  it('rejects invalid --id with slash (AC-22)', () => {
    expect(() =>
      generateSpecId({
        projectRoot: tempDir,
        specsDir: 'specs',
        description: 'test',
        customId: 'foo/bar',
      })
    ).toThrow('/');
  });

  it('slugification parity across modes (AC-34)', () => {
    const desc = '  Spaced  Out!!  ';
    const withId = generateSpecId({
      projectRoot: tempDir,
      specsDir: 'specs',
      description: desc,
      customId: 'PROJ-21',
    });
    // The semantic portion should be the same
    expect(withId).toBe('PROJ-21-spaced-out');

    const withoutId = generateSpecId({
      projectRoot: tempDir,
      specsDir: 'specs',
      description: desc,
    });
    // The semantic portion (after NNN-) should be the same
    expect(withoutId).toBe('001-spaced-out');
  });
});
