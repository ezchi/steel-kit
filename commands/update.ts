import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { log, die, STEEL_KIT_ROOT } from '../src/utils.js';

export async function cmdUpdate(): Promise<void> {
  const projectRoot = process.cwd();

  if (!existsSync(resolve(projectRoot, '.steel'))) {
    die('Project not initialized. Run `steel init` first.');
  }

  const sourceDir = resolve(STEEL_KIT_ROOT, '.claude', 'commands');
  const targetDir = resolve(projectRoot, '.claude', 'commands');

  if (!existsSync(sourceDir)) {
    die('Slash command source directory not found in steel-kit installation.');
  }

  log.info('Updating Claude Code slash commands...');
  await mkdir(targetDir, { recursive: true });

  const files = await readdir(sourceDir);
  const steelFiles = files.filter((f) => f.startsWith('steel-') && f.endsWith('.md'));

  for (const file of steelFiles) {
    await copyFile(resolve(sourceDir, file), resolve(targetDir, file));
  }

  log.success(`Updated ${steelFiles.length} slash commands.`);
}
