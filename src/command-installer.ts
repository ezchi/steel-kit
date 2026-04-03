import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STEEL_KIT_ROOT } from './utils.js';

interface CommandInstallResult {
  claude: number;
  gemini: number;
  codex: number;
  warnings: string[];
}

const COMMAND_SOURCE_DIR = resolve(STEEL_KIT_ROOT, 'resources', 'commands');

export async function installProjectCommands(
  projectRoot: string,
): Promise<CommandInstallResult> {
  if (!existsSync(COMMAND_SOURCE_DIR)) {
    throw new Error('Command source directory not found in steel-kit installation.');
  }

  const commandFiles = (await readdir(COMMAND_SOURCE_DIR))
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
  const codex = await attemptInstall(
    () => installCodexSkills(projectRoot, commandFiles),
    'Codex skills',
    warnings,
  );

  return { claude, gemini, codex, warnings };
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
    await copyFile(resolve(COMMAND_SOURCE_DIR, file), resolve(targetDir, file));
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
    const sourcePath = resolve(COMMAND_SOURCE_DIR, file);
    const prompt = await readFile(sourcePath, 'utf-8');
    const targetName = file.replace(/\.md$/, '.toml');
    await writeFile(
      resolve(targetDir, targetName),
      renderGeminiCommandToml(file, prompt),
    );
  }

  return commandFiles.length;
}

async function installCodexSkills(
  projectRoot: string,
  commandFiles: string[],
): Promise<number> {
  const targetDir = resolve(projectRoot, '.agents', 'skills');
  await mkdir(targetDir, { recursive: true });

  for (const file of commandFiles) {
    const sourcePath = resolve(COMMAND_SOURCE_DIR, file);
    const prompt = await readFile(sourcePath, 'utf-8');
    const skillName = file.replace(/\.md$/, '');
    const skillDir = resolve(targetDir, skillName);
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      resolve(skillDir, 'SKILL.md'),
      renderCodexSkill(file, prompt),
    );
  }

  return commandFiles.length;
}

export function renderGeminiCommandToml(filename: string, markdown: string): string {
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

export function renderCodexSkill(filename: string, markdown: string): string {
  const stem = filename.replace(/\.md$/, '');
  const description = extractDescription(markdown, stem);
  const body = adaptMarkdownForCodexSkill(markdown);

  return [
    '---',
    `name: ${stem}`,
    `description: ${JSON.stringify(`Steel-Kit workflow skill: ${description}`)}`,
    '---',
    '',
    `# ${stem}`,
    '',
    `Use this skill when the user invokes \`$${stem}\` or asks to run the corresponding Steel-Kit workflow step in Codex.`,
    '',
    body,
    '',
  ].join('\n');
}

function adaptMarkdownForCodexSkill(markdown: string): string {
  return markdown
    .replace(/\$ARGUMENTS/g, 'the user-provided input')
    .replace(/\/steel-/g, '$steel-');
}

function toTomlString(value: string): string {
  return JSON.stringify(value);
}
