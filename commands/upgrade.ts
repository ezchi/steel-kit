import { execa } from 'execa';
import { log, die } from '../src/utils.js';

const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/ezchi/steel-kit/main/install.sh';

export async function cmdUpgrade(): Promise<void> {
  log.step('Upgrading Steel-Kit...');
  log.info(`Running installer from ${INSTALL_SCRIPT_URL}...`);

  const result = await execa(
    'bash',
    ['-lc', `curl -fsSL ${INSTALL_SCRIPT_URL} | bash`],
    {
    reject: false,
    stdin: 'ignore',
    },
  );

  if (result.exitCode !== 0) {
    die(
      `Upgrade failed: ${result.stderr || result.stdout || 'installer returned a non-zero exit code.'}`,
    );
  }

  log.success('Steel-Kit upgraded successfully.');
  log.info('Run `steel update` inside each project to refresh Claude/Gemini/Codex command files.');
}
