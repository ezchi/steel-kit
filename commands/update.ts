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
    `Updated commands: Claude=${result.claude}, Gemini=${result.gemini}, Codex(project)=${result.codexProject}, Codex(user)=${result.codexUser}`,
  );
  if (result.codexUser > 0) {
    log.info('Codex prompts were also refreshed in ~/.codex/prompts so `/steel-*` stays available in Codex CLI.');
  }
  for (const warning of result.warnings) {
    log.warn(`Command update warning: ${warning}`);
  }
  log.info('To update the Steel-Kit CLI itself, run `steel upgrade`.');
}
