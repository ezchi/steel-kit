import { execa } from 'execa';
import { log, die } from '../src/utils.js';

const PACKAGE_NAME = '@steel-kit/core';

export async function cmdUpgrade(): Promise<void> {
  log.step('Upgrading Steel-Kit...');
  log.info(`Installing latest npm release for ${PACKAGE_NAME}...`);

  const result = await execa('npm', ['install', '-g', `${PACKAGE_NAME}@latest`], {
    reject: false,
    stdin: 'ignore',
  });

  if (result.exitCode !== 0) {
    die(
      `Upgrade failed: ${result.stderr || result.stdout || 'npm install returned a non-zero exit code.'}`,
    );
  }

  log.success('Steel-Kit upgraded successfully.');
  log.info('Run `steel update` inside each project to refresh Claude/Gemini/Codex command files.');
}
