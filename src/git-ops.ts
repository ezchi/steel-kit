import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';
import { validateComposedRef } from './git-config.js';
import { log } from './utils.js';

export interface InitBranchOptions {
  /** Spec ID; gets composed with branchPrefix to produce the new branch name. */
  specId: string;
  /** Branch name to record as the per-spec base. Validated to exist locally or as origin/<name>. */
  baseBranch: string;
  /** Branch prefix from resolved git config (e.g., 'spec/' or 'feature/'). */
  branchPrefix: string;
  /** If provided, checkout this branch before forking. If absent, fork from current HEAD. */
  from?: string;
}

/**
 * Create a new spec branch.
 *
 * Forks from current HEAD by default (or from `from` if provided). The
 * `baseBranch` argument is recorded into state.json as the per-spec base — it
 * is *not* automatically checked out. The caller (slash command) is responsible
 * for prompting the user when current branch differs from the project default.
 *
 * Invariants:
 *  - working tree is clean
 *  - composed ref `<prefix><specId>` is a legal git ref
 *  - `baseBranch` exists somewhere (locally or as origin/<name>)
 */
export async function initBranch(
  opts: InitBranchOptions,
  projectRoot: string,
): Promise<{ branchName: string; baseBranch: string }> {
  validateComposedRef(opts.branchPrefix, opts.specId);

  const clean = await ensureClean(projectRoot);
  if (!clean) {
    throw new Error(
      'Working tree has uncommitted changes. Commit or stash them before creating a new spec branch.',
    );
  }

  // Ensure the recorded baseBranch exists somewhere reachable.
  await ensureBranchExists(projectRoot, opts.baseBranch);

  // Optional pre-fork checkout.
  if (opts.from) {
    await ensureBranchExists(projectRoot, opts.from);
    await execa('git', ['checkout', opts.from], { cwd: projectRoot, stdin: 'ignore' });
  }

  const branchName = `${opts.branchPrefix}${opts.specId}`;
  log.info(`Creating branch: ${branchName}`);
  await execa('git', ['checkout', '-b', branchName], { cwd: projectRoot, stdin: 'ignore' });

  return { branchName, baseBranch: opts.baseBranch };
}

/**
 * Verify a branch exists locally; if not, try to create a local tracking branch
 * from origin/<name>. Throws if neither is reachable.
 */
async function ensureBranchExists(projectRoot: string, branch: string): Promise<void> {
  const localExists = await execa('git', ['rev-parse', '--verify', branch], {
    cwd: projectRoot,
    reject: false,
    stdin: 'ignore',
  });
  if (localExists.exitCode === 0) return;

  const remoteRef = `origin/${branch}`;
  const remoteExists = await execa('git', ['rev-parse', '--verify', remoteRef], {
    cwd: projectRoot,
    reject: false,
    stdin: 'ignore',
  });
  if (remoteExists.exitCode === 0) {
    log.info(`Creating local tracking branch '${branch}' from '${remoteRef}'`);
    await execa('git', ['branch', branch, remoteRef], { cwd: projectRoot, stdin: 'ignore' });
    return;
  }

  throw new Error(
    `Branch '${branch}' does not exist locally or as remote-tracking branch 'origin/${branch}'`,
  );
}

export async function commitStep(
  prefix: string,
  stage: string,
  iteration: number,
  message: string,
  projectRoot: string,
  paths?: string[],
  force?: boolean,
): Promise<void> {
  const fullMessage = `${prefix}(${stage}): ${message} [iteration ${iteration}]`;

  log.debug(`Staging and committing: ${fullMessage}`);

  // Stage only the files touched by steel-kit, or all changes if no paths specified.
  // paths=undefined → git add -A (e.g. implementation stage)
  // paths=[]       → nothing to stage
  // paths=[...]    → stage only listed paths
  // force=true     → pass -f to git add, overriding gitignore
  const addFlags = force ? ['-f'] : [];
  if (paths !== undefined && paths.length === 0) {
    log.debug('No paths to commit, skipping');
    return;
  } else if (paths && paths.length > 0) {
    // Partition into paths that exist on disk vs deleted tracked paths
    const onDisk: string[] = [];
    const removed: string[] = [];
    for (const p of paths) {
      if (existsSync(resolve(projectRoot, p))) {
        onDisk.push(p);
      } else {
        // Check if it was a tracked path (now deleted)
        const tracked = await execa(
          'git', ['ls-files', '--error-unmatch', '--', p],
          { cwd: projectRoot, reject: false, stdin: 'ignore' },
        );
        if (tracked.exitCode === 0) {
          removed.push(p);
        }
      }
    }
    if (onDisk.length > 0) {
      await execa('git', ['add', ...addFlags, '--', ...onDisk], { cwd: projectRoot, stdin: 'ignore' });
    }
    if (removed.length > 0) {
      await execa('git', ['rm', '-r', '--cached', '--', ...removed], { cwd: projectRoot, stdin: 'ignore' });
    }
  } else {
    await execa('git', ['add', '-A', ...addFlags], { cwd: projectRoot, stdin: 'ignore' });
  }

  // Check if there are staged changes
  const status = await execa('git', ['diff', '--cached', '--quiet'], {
    cwd: projectRoot,
    reject: false,
    stdin: 'ignore',
  });

  if (status.exitCode === 0) {
    log.debug('No changes to commit, skipping');
    return;
  }

  await execa('git', ['commit', '-m', fullMessage], {
    cwd: projectRoot,
    stdin: 'ignore',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  log.success(`Committed: ${fullMessage}`);
}

export async function tagStage(
  specId: string,
  stage: string,
  projectRoot: string,
): Promise<void> {
  const tagName = `steel/${specId}/${stage}-complete`;
  await execa('git', ['tag', '-f', tagName], {
    cwd: projectRoot,
    stdin: 'ignore',
  });
  log.info(`Tagged: ${tagName}`);
}

export async function ensureClean(projectRoot: string): Promise<boolean> {
  const result = await execa('git', ['status', '--porcelain'], {
    cwd: projectRoot,
  });
  return result.stdout.trim() === '';
}

export async function getCurrentBranch(projectRoot: string): Promise<string> {
  const result = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: projectRoot,
  });
  return result.stdout.trim();
}

export interface IgnoredPath {
  path: string;
  rule: string;
}

export async function checkIgnoredPaths(
  projectRoot: string,
  paths: string[],
): Promise<IgnoredPath[]> {
  if (paths.length === 0) return [];
  // --no-index: report based on gitignore patterns alone, ignoring whether the
  // path is already tracked. Without it, `git check-ignore` says "not ignored"
  // for tracked files even when their parent dir matches an ignore rule — yet
  // `git add` still refuses with the directory-level ignore error.
  const result = await execa(
    'git',
    ['check-ignore', '-v', '--no-index', '--', ...paths],
    { cwd: projectRoot, reject: false, stdin: 'ignore' },
  );
  // exit 0 = at least one path ignored; exit 1 = none ignored; other = error
  if (result.exitCode === 1) return [];
  if (result.exitCode !== 0) {
    log.debug(
      `git check-ignore failed (exit ${result.exitCode}): ${result.stderr.trim()}`,
    );
    return [];
  }
  // Output format per line: "<source>:<linenum>:<pattern>\t<pathname>"
  const ignored: IgnoredPath[] = [];
  for (const line of result.stdout.split('\n')) {
    if (!line) continue;
    const tabIdx = line.indexOf('\t');
    if (tabIdx === -1) continue;
    ignored.push({
      rule: line.slice(0, tabIdx),
      path: line.slice(tabIdx + 1),
    });
  }
  return ignored;
}

export async function getWorkingTreeDiff(projectRoot: string): Promise<string> {
  const result = await execa(
    'git',
    ['diff', '--no-ext-diff', '--stat', '--patch', 'HEAD'],
    {
      cwd: projectRoot,
      stdin: 'ignore',
    },
  );

  return result.stdout.trim();
}
