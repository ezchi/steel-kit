import { existsSync } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installProjectCommands } from '../src/command-installer.js';
import { log, die } from '../src/utils.js';

export async function cmdUpdate(): Promise<void> {
  const projectRoot = process.cwd();

  if (!existsSync(resolve(projectRoot, '.steel'))) {
    die('Project not initialized. Run `steel init` first.');
  }

  // Clean up stale Gemini TOML files from previous installations
  await cleanupStaleGeminiCommands(projectRoot);

  log.info('Updating project commands for .claude/commands/ and .agents/skills/...');
  const result = await installProjectCommands(projectRoot);
  log.success(
    `Updated commands: Claude=${result.claude}, Agent skills=${result.codex}`,
  );
  if (result.codex > 0) {
    log.info('Agent skills were refreshed in `.agents/skills/`.');
  }
  for (const warning of result.warnings) {
    log.warn(`Command update warning: ${warning}`);
  }
  log.info('To update the Steel-Kit CLI itself, run `steel upgrade`.');
}

async function cleanupStaleGeminiCommands(projectRoot: string): Promise<void> {
  const geminiDir = resolve(projectRoot, '.gemini', 'commands');
  if (!existsSync(geminiDir)) return;

  try {
    const files = await readdir(geminiDir);
    const staleFiles = files.filter(
      (f) => f.startsWith('steel-') && f.endsWith('.toml'),
    );
    if (staleFiles.length === 0) return;

    for (const file of staleFiles) {
      await unlink(resolve(geminiDir, file));
    }
    log.info(`Removed ${staleFiles.length} stale Gemini TOML command files`);
  } catch {
    // Best-effort cleanup — don't fail update
  }
}
