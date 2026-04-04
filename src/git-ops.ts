import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';
import type { ResolvedGitConfig } from './config.js';
import { validateComposedRef } from './git-config.js';
import { log } from './utils.js';

export async function initBranch(
  specId: string,
  projectRoot: string,
  gitConfig: ResolvedGitConfig,
): Promise<string> {
  // Validate composed ref defensively
  validateComposedRef(gitConfig.branchPrefix, specId);

  // Ensure working tree is clean before switching branches
  const clean = await ensureClean(projectRoot);
  if (!clean) {
    throw new Error('Working tree has uncommitted changes. Commit or stash them before creating a new spec branch.');
  }

  // Ensure baseBranch exists
  const baseBranch = gitConfig.baseBranch;
  const localExists = await execa('git', ['rev-parse', '--verify', baseBranch], {
    cwd: projectRoot,
    reject: false,
    stdin: 'ignore',
  });

  if (localExists.exitCode !== 0) {
    // Check if remote-tracking branch exists
    const remoteRef = `origin/${baseBranch}`;
    const remoteExists = await execa('git', ['rev-parse', '--verify', remoteRef], {
      cwd: projectRoot,
      reject: false,
      stdin: 'ignore',
    });

    if (remoteExists.exitCode === 0) {
      log.info(`Creating local tracking branch '${baseBranch}' from '${remoteRef}'`);
      await execa('git', ['branch', baseBranch, remoteRef], { cwd: projectRoot, stdin: 'ignore' });
    } else {
      throw new Error(
        `Branch '${baseBranch}' does not exist locally or as remote-tracking branch 'origin/${baseBranch}'`
      );
    }
  }

  // Checkout base branch
  await execa('git', ['checkout', baseBranch], { cwd: projectRoot, stdin: 'ignore' });

  // Create new branch
  const branchName = `${gitConfig.branchPrefix}${specId}`;
  log.info(`Creating branch: ${branchName}`);
  await execa('git', ['checkout', '-b', branchName], { cwd: projectRoot, stdin: 'ignore' });

  return branchName;
}

export async function commitStep(
  prefix: string,
  stage: string,
  iteration: number,
  message: string,
  projectRoot: string,
  paths?: string[],
): Promise<void> {
  const fullMessage = `${prefix}(${stage}): ${message} [iteration ${iteration}]`;

  log.debug(`Staging and committing: ${fullMessage}`);

  // Stage only the files touched by steel-kit, or all changes if no paths specified
  if (paths && paths.length > 0) {
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
      await execa('git', ['add', '--', ...onDisk], { cwd: projectRoot, stdin: 'ignore' });
    }
    if (removed.length > 0) {
      await execa('git', ['rm', '-r', '--cached', '--', ...removed], { cwd: projectRoot, stdin: 'ignore' });
    }
  } else {
    await execa('git', ['add', '-A'], { cwd: projectRoot, stdin: 'ignore' });
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
