import { execa } from 'execa';
import { log } from './utils.js';

export async function initBranch(
  specId: string,
  projectRoot: string,
): Promise<void> {
  const branchName = `spec/${specId}`;
  log.info(`Creating branch: ${branchName}`);
  await execa('git', ['checkout', '-b', branchName], { cwd: projectRoot, stdin: 'ignore' });
}

export async function commitStep(
  prefix: string,
  stage: string,
  iteration: number,
  message: string,
  projectRoot: string,
): Promise<void> {
  const fullMessage = `${prefix}(${stage}): ${message} [iteration ${iteration}]`;

  log.debug(`Staging and committing: ${fullMessage}`);

  // Stage all changes
  await execa('git', ['add', '-A'], { cwd: projectRoot, stdin: 'ignore' });

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
  stage: string,
  projectRoot: string,
): Promise<void> {
  const tagName = `steel/${stage}-complete`;
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
