import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { STEEL_KIT_ROOT } from './utils.js';

interface CommandInstallResult {
  claude: number;
  gemini: number;
  codexProject: number;
  codexUser: number;
  warnings: string[];
}

const CLAUDE_SOURCE_DIR = resolve(STEEL_KIT_ROOT, '.claude', 'commands');

export async function installProjectCommands(
  projectRoot: string,
): Promise<CommandInstallResult> {
  if (!existsSync(CLAUDE_SOURCE_DIR)) {
    throw new Error('Slash command source directory not found in steel-kit installation.');
  }

  const commandFiles = (await readdir(CLAUDE_SOURCE_DIR))
    .filter((file) => file.startsWith('steel-') && file.endsWith('.md'))
    .sort();

  const warnings: string[] = [];

  const claude = await attemptInstall(
    () => installClaudeCommands(projectRoot, commandFiles),
    'Claude Code commands',
    warnings,
  );
  const gemini = await attemptInstall(
    () => installGeminiCommands(projectRoot, commandFiles),
    'Gemini CLI commands',
    warnings,
  );
  const codexProject = await attemptInstall(
    () => installCodexProjectPrompts(projectRoot, commandFiles),
    'Codex project prompts',
    warnings,
  );
  const codexUser = await attemptInstall(
    () => installCodexUserPrompts(commandFiles),
    'Codex user prompts',
    warnings,
  );

  return { claude, gemini, codexProject, codexUser, warnings };
}

async function attemptInstall(
  fn: () => Promise<number>,
  label: string,
  warnings: string[],
): Promise<number> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`${label}: ${message}`);
    return 0;
  }
}

async function installClaudeCommands(
  projectRoot: string,
  commandFiles: string[],
): Promise<number> {
  const targetDir = resolve(projectRoot, '.claude', 'commands');
  await mkdir(targetDir, { recursive: true });

  for (const file of commandFiles) {
    await copyFile(resolve(CLAUDE_SOURCE_DIR, file), resolve(targetDir, file));
  }

  return commandFiles.length;
}

async function installGeminiCommands(
  projectRoot: string,
  commandFiles: string[],
): Promise<number> {
  const targetDir = resolve(projectRoot, '.gemini', 'commands');
  await mkdir(targetDir, { recursive: true });

  for (const file of commandFiles) {
    const sourcePath = resolve(CLAUDE_SOURCE_DIR, file);
    const prompt = await readFile(sourcePath, 'utf-8');
    const targetName = file.replace(/\.md$/, '.toml');
    await writeFile(
      resolve(targetDir, targetName),
      renderGeminiCommandToml(file, prompt),
    );
  }

  return commandFiles.length;
}

async function installCodexProjectPrompts(
  projectRoot: string,
  commandFiles: string[],
): Promise<number> {
  const targetDir = resolve(projectRoot, '.codex', 'prompts');
  await mkdir(targetDir, { recursive: true });

  for (const file of commandFiles) {
    await copyFile(resolve(CLAUDE_SOURCE_DIR, file), resolve(targetDir, file));
  }

  return commandFiles.length;
}

async function installCodexUserPrompts(
  commandFiles: string[],
): Promise<number> {
  const targetDir = resolve(homedir(), '.codex', 'prompts');
  await mkdir(targetDir, { recursive: true });

  for (const file of commandFiles) {
    await copyFile(resolve(CLAUDE_SOURCE_DIR, file), resolve(targetDir, file));
  }

  return commandFiles.length;
}

function renderGeminiCommandToml(filename: string, markdown: string): string {
  const commandName = filename.replace(/\.md$/, '');
  const description = extractDescription(markdown, commandName);
  const prompt = adaptMarkdownForGemini(markdown);

  return [
    `description = ${toTomlString(description)}`,
    '',
    'prompt = """',
    prompt.replace(/"""/g, '\\"\\"\\"'),
    '"""',
    '',
  ].join('\n');
}

function extractDescription(markdown: string, fallback: string): string {
  const line = markdown
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !entry.startsWith('#'));

  return line ?? `Steel-Kit workflow command: ${fallback}`;
}

function adaptMarkdownForGemini(markdown: string): string {
  return markdown.replace(/\$ARGUMENTS/g, '<args>');
}

function toTomlString(value: string): string {
  return JSON.stringify(value);
}
