import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getSteelDir } from './config.js';
import { die, isPlaceholderConstitution } from './utils.js';

const CONSTITUTION_BLOCK_MESSAGE =
  'Constitution stage is not complete. Run `steel constitution` or finish editing `.steel/constitution.md` before continuing the workflow.';

export async function loadConstitutionIfReady(
  projectRoot: string,
): Promise<string> {
  const constitutionPath = resolve(getSteelDir(projectRoot), 'constitution.md');
  const constitution = existsSync(constitutionPath)
    ? await readFile(constitutionPath, 'utf-8')
    : undefined;

  if (!constitution || isPlaceholderConstitution(constitution)) {
    die(CONSTITUTION_BLOCK_MESSAGE);
  }

  return constitution;
}

export function getConstitutionBlockMessage(): string {
  return CONSTITUTION_BLOCK_MESSAGE;
}
