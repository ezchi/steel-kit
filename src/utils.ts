import chalk from 'chalk';
import { confirm as inquirerConfirm } from '@inquirer/prompts';
import { execaCommand } from 'execa';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// __dirname at runtime is dist/src/, so go up two levels to reach the repo root
export const STEEL_KIT_ROOT = resolve(__dirname, '..', '..');

export const log = {
  info: (msg: string) => console.error(chalk.blue('info'), msg),
  warn: (msg: string) => console.error(chalk.yellow('warn'), msg),
  error: (msg: string) => console.error(chalk.red('error'), msg),
  debug: (msg: string) => {
    if (process.env.STEEL_DEBUG) {
      console.error(chalk.gray('debug'), msg);
    }
  },
  success: (msg: string) => console.error(chalk.green('ok'), msg),
  step: (msg: string) => console.error(chalk.cyan('>>>'), msg),
};

export function die(msg: string): never {
  log.error(msg);
  process.exit(1);
}

export async function requireCommand(cmd: string): Promise<void> {
  try {
    await execaCommand(`which ${cmd}`);
  } catch {
    die(`Required command '${cmd}' not found in PATH`);
  }
}

export async function confirm(msg: string): Promise<boolean> {
  return inquirerConfirm({ message: msg });
}

export function substituteTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return vars[key] ?? match;
  });
}

export async function loadFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export function isPlaceholderConstitution(content: string): boolean {
  return content.includes('<!-- Define the core principles');
}
