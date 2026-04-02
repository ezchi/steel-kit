import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { installProjectCommands } from '../src/command-installer.js';
import { log, die } from '../src/utils.js';

export async function cmdUpdate(): Promise<void> {
  const projectRoot = process.cwd();

  if (!existsSync(resolve(projectRoot, '.steel'))) {
    die('Project not initialized. Run `steel init` first.');
  }

  log.info('Updating project commands for Claude Code, Gemini CLI, and Codex CLI...');
  const result = await installProjectCommands(projectRoot);
  log.success(
    `Updated commands: Claude=${result.claude}, Gemini=${result.gemini}, Codex skills=${result.codex}`,
  );
  if (result.codex > 0) {
    log.info('Codex skills were refreshed in `.agents/skills/`.');
    log.info('In Codex, invoke them as `$steel-constitution`, `$steel-specify`, `$steel-plan`, and so on.');
  }
  for (const warning of result.warnings) {
    log.warn(`Command update warning: ${warning}`);
  }
  log.info('To update the Steel-Kit CLI itself, run `steel upgrade`.');
}
