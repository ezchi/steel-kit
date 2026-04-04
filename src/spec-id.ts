import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSpecIdComponent } from './git-config.js';

export interface GenerateSpecIdOpts {
  projectRoot: string;
  specsDir: string;
  description: string;
  customId?: string;
}

export function slugify(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

export function generateSpecId(opts: GenerateSpecIdOpts): string {
  const { projectRoot, specsDir, description, customId } = opts;
  const semantic = slugify(description);
  let specId: string;

  if (customId) {
    validateSpecIdComponent(customId);
    specId = `${customId}-${semantic}`;
  } else {
    const fullSpecsDir = resolve(projectRoot, specsDir);
    let nextNum = 1;
    if (existsSync(fullSpecsDir)) {
      const entries = readdirSync(fullSpecsDir);
      const nums = entries
        .map((e) => parseInt(e.split('-')[0], 10))
        .filter((n) => !isNaN(n));
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }
    specId = `${String(nextNum).padStart(3, '0')}-${semantic}`;
  }

  // Collision detection
  const specDir = resolve(projectRoot, specsDir, specId);
  if (existsSync(specDir)) {
    throw new Error(
      `Spec directory '${specsDir}/${specId}' already exists. Use a different --id or remove the existing spec.`
    );
  }

  return specId;
}
