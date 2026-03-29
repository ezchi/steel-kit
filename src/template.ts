import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STEEL_KIT_ROOT, substituteTemplate } from './utils.js';

export async function loadTemplate(
  category: 'templates' | 'prompts/forge' | 'prompts/gauge',
  name: string,
  projectRoot?: string,
): Promise<string> {
  // Check project-local override first
  if (projectRoot) {
    const localPath = resolve(projectRoot, '.steel', category, `${name}.md`);
    if (existsSync(localPath)) {
      return readFile(localPath, 'utf-8');
    }
  }

  // Fall back to package defaults
  const defaultPath = resolve(STEEL_KIT_ROOT, category, `${name}.md`);
  if (existsSync(defaultPath)) {
    return readFile(defaultPath, 'utf-8');
  }

  throw new Error(`Template not found: ${category}/${name}.md`);
}

export async function renderTemplate(
  category: 'templates' | 'prompts/forge' | 'prompts/gauge',
  name: string,
  vars: Record<string, string>,
  projectRoot?: string,
): Promise<string> {
  const template = await loadTemplate(category, name, projectRoot);
  return substituteTemplate(template, vars);
}
