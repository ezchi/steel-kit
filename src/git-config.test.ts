import { describe, expect, it } from 'vitest';
import {
  resolveGitConfig,
  validateBranchPrefix,
  validateBranchName,
  validateSpecIdComponent,
  validateComposedRef,
} from './git-config.js';
import type { SteelConfig } from './config.js';

function makeConfig(git?: SteelConfig['git']): SteelConfig {
  return {
    forge: { provider: 'claude' },
    gauge: { provider: 'gemini' },
    maxIterations: 5,
    autoCommit: true,
    specsDir: 'specs',
    git,
  };
}

describe('resolveGitConfig', () => {
  it('returns steel defaults with no config (AC-1)', () => {
    const result = resolveGitConfig(makeConfig());
    expect(result).toEqual({
      workflow: 'steel',
      branchPrefix: 'spec/',
      baseBranch: 'main',
    });
    expect(result).not.toHaveProperty('developBranch');
  });

  it('returns gitflow defaults (AC-2)', () => {
    const result = resolveGitConfig(makeConfig({ workflow: 'gitflow' }));
    expect(result).toEqual({
      workflow: 'gitflow',
      branchPrefix: 'feature/',
      baseBranch: 'develop',
      developBranch: 'develop',
    });
  });

  it('explicit override wins over preset (AC-3)', () => {
    const result = resolveGitConfig(makeConfig({ workflow: 'gitflow', branchPrefix: 'eda-' }));
    expect(result.branchPrefix).toBe('eda-');
    expect(result.baseBranch).toBe('develop');
  });

  it('github-flow preset', () => {
    const result = resolveGitConfig(makeConfig({ workflow: 'github-flow' }));
    expect(result).toEqual({
      workflow: 'github-flow',
      branchPrefix: 'feature/',
      baseBranch: 'main',
    });
  });

  it('validates explicit developBranch (NFR-5)', () => {
    expect(() =>
      resolveGitConfig(makeConfig({ developBranch: 'develop~1' }))
    ).toThrow('developBranch');
  });

  it('accepts valid explicit developBranch', () => {
    const result = resolveGitConfig(makeConfig({ developBranch: 'develop' }));
    expect(result.developBranch).toBe('develop');
  });

  it('runs composed-ref smoke test for non-preset prefix', () => {
    expect(() =>
      resolveGitConfig(makeConfig({ branchPrefix: 'eda-' }))
    ).not.toThrow();
  });

  it('rejects invalid non-preset prefix during resolution (AC-24)', () => {
    expect(() =>
      resolveGitConfig(makeConfig({ branchPrefix: 'feat..ure/' }))
    ).toThrow('..');
  });

  it('rejects empty branchPrefix during resolution (AC-25)', () => {
    expect(() =>
      resolveGitConfig(makeConfig({ branchPrefix: '' }))
    ).toThrow('non-empty');
  });

  it('falls back to steel for invalid workflow string', () => {
    const result = resolveGitConfig(makeConfig({ workflow: 'invalid' as any }));
    expect(result.workflow).toBe('steel');
    expect(result.branchPrefix).toBe('spec/');
  });

  it('rejects empty baseBranch when explicitly set', () => {
    expect(() =>
      resolveGitConfig(makeConfig({ baseBranch: '' }))
    ).toThrow('non-empty');
  });

  it('rejects empty developBranch when explicitly set', () => {
    expect(() =>
      resolveGitConfig(makeConfig({ developBranch: '' }))
    ).toThrow('non-empty');
  });
});

describe('validateBranchPrefix', () => {
  it('accepts spec/', () => {
    expect(() => validateBranchPrefix('spec/')).not.toThrow();
  });

  it('accepts feature/', () => {
    expect(() => validateBranchPrefix('feature/')).not.toThrow();
  });

  it('accepts eda-', () => {
    expect(() => validateBranchPrefix('eda-')).not.toThrow();
  });

  it('rejects empty (AC-18/25)', () => {
    expect(() => validateBranchPrefix('')).toThrow('non-empty');
  });

  it('rejects .. (AC-24)', () => {
    expect(() => validateBranchPrefix('feat..ure/')).toThrow('..');
  });

  it('rejects tilde', () => {
    expect(() => validateBranchPrefix('feat~ure/')).toThrow('~');
  });

  it('rejects just "/" as prefix', () => {
    expect(() => validateBranchPrefix('/')).toThrow("cannot be just '/'");
  });
});

describe('validateBranchName', () => {
  it('accepts main', () => {
    expect(() => validateBranchName('main', 'baseBranch')).not.toThrow();
  });

  it('accepts develop', () => {
    expect(() => validateBranchName('develop', 'baseBranch')).not.toThrow();
  });

  it('accepts release/v1', () => {
    expect(() => validateBranchName('release/v1', 'baseBranch')).not.toThrow();
  });

  it('rejects tilde (AC-26)', () => {
    expect(() => validateBranchName('main~1', 'baseBranch')).toThrow('~');
  });

  it('rejects trailing /', () => {
    expect(() => validateBranchName('main/', 'baseBranch')).toThrow('/');
  });

  it('rejects empty', () => {
    expect(() => validateBranchName('', 'baseBranch')).toThrow('non-empty');
  });
});

describe('validateSpecIdComponent', () => {
  it('rejects space (AC-19)', () => {
    expect(() => validateSpecIdComponent('hello world')).toThrow(' ');
  });

  it('rejects tilde (AC-20)', () => {
    expect(() => validateSpecIdComponent('feat~1')).toThrow('~');
  });

  it('rejects slash (AC-22)', () => {
    expect(() => validateSpecIdComponent('foo/bar')).toThrow('/');
  });

  it('rejects double-dot (AC-23)', () => {
    expect(() => validateSpecIdComponent('my..id')).toThrow('..');
  });

  it('accepts valid value (AC-21)', () => {
    expect(() => validateSpecIdComponent('PROJ-21')).not.toThrow();
  });

  it('accepts alphanumeric with hyphen', () => {
    expect(() => validateSpecIdComponent('add-auth')).not.toThrow();
  });
});

describe('validateComposedRef', () => {
  it('accepts spec/ + 001-test', () => {
    expect(() => validateComposedRef('spec/', '001-test')).not.toThrow();
  });

  it('accepts feature/ + PROJ-21-auth', () => {
    expect(() => validateComposedRef('feature/', 'PROJ-21-auth')).not.toThrow();
  });

  it('rejects composition with invalid chars', () => {
    expect(() => validateComposedRef('feat~/', '001-test')).toThrow('~');
  });

  it('rejects composition starting with /', () => {
    expect(() => validateComposedRef('/', '001-test')).toThrow("starts with '/'");
  });
});
