import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, getSteelDir } from '../src/config.js';
import { forgeExecute } from '../src/forge.js';
import { commitStep } from '../src/git-ops.js';
import { log, die, confirm } from '../src/utils.js';

export async function cmdConstitution(prompt?: string): Promise<void> {
  log.step('Starting constitution generation...');
  const projectRoot = process.cwd();
  const steelDir = getSteelDir(projectRoot);

  if (!existsSync(steelDir)) {
    die('Project not initialized. Run `steel init` first.');
  }

  log.info('Loading config...');
  const config = await loadConfig(projectRoot);
  const constitutionPath = resolve(steelDir, 'constitution.md');

  // Warn if constitution already has real content
  if (existsSync(constitutionPath)) {
    const existing = await readFile(constitutionPath, 'utf-8');
    const isPlaceholder = existing.includes('<!-- Define the core principles');
    if (!isPlaceholder) {
      const overwrite = await confirm(
        'A constitution already exists. Overwrite with a new LLM-generated one?',
      );
      if (!overwrite) {
        log.info('Keeping existing constitution.');
        return;
      }
    }
  }

  const defaultDescription =
    'Analyze this project and generate a constitution document that defines: ' +
    '1) Governing principles for development decisions, ' +
    '2) Technology stack and constraints, ' +
    '3) Coding standards and conventions, ' +
    '4) Development workflow guidelines, ' +
    '5) Hard constraints (performance, compatibility, security).';

  const description = prompt
    ? `${defaultDescription}\n\nAdditional guidance from the user:\n${prompt}`
    : defaultDescription;

  log.step('Generating project constitution via Forge...');
  if (prompt) {
    log.info(`User prompt: ${prompt}`);
  }
  log.info('This may take 1-3 minutes while the LLM analyzes your project.');

  const result = await forgeExecute(config, {
    stage: 'constitution',
    iteration: 1,
    description,
    projectRoot,
  });

  log.info('Saving constitution...');
  await writeFile(constitutionPath, result.output);
  log.success('Constitution generated: .steel/constitution.md');

  if (config.autoCommit) {
    log.info('Committing constitution...');
    await commitStep(
      'steel',
      'constitution',
      1,
      'generate project constitution',
      projectRoot,
      [constitutionPath],
    );
  }

  log.success('Done! Review .steel/constitution.md and edit as needed.');
}
