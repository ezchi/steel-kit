import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSpecDir, getSteelDir, loadConfig } from '../src/config.js';
import {
  advanceStage,
  loadState,
  runForgeGaugeLoop,
} from '../src/workflow.js';
import { die, log } from '../src/utils.js';

export async function cmdRetrospect(): Promise<void> {
  log.step('Starting retrospect stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (state.currentStage !== 'retrospect') {
    die(
      `Cannot run retrospect: current stage is '${state.currentStage}'. Expected 'retrospect'.`,
    );
  }

  if (!state.specId) {
    die('No active specification.');
  }

  const specDir = getSpecDir(projectRoot, config, state.specId);
  log.info('Loading workflow artifacts...');
  const specPath = resolve(specDir, 'spec.md');
  const planPath = resolve(specDir, 'plan.md');
  const tasksPath = resolve(specDir, 'tasks.md');
  const validationPath = resolve(specDir, 'validation.md');
  const constitutionPath = resolve(getSteelDir(projectRoot), 'constitution.md');

  const specContent = existsSync(specPath)
    ? await readFile(specPath, 'utf-8')
    : undefined;
  const planContent = existsSync(planPath)
    ? await readFile(planPath, 'utf-8')
    : undefined;
  const tasksContent = existsSync(tasksPath)
    ? await readFile(tasksPath, 'utf-8')
    : undefined;
  const validationContent = existsSync(validationPath)
    ? await readFile(validationPath, 'utf-8')
    : undefined;
  const constitution = existsSync(constitutionPath)
    ? await readFile(constitutionPath, 'utf-8')
    : undefined;

  const reviewContext = [
    specContent ? `## Specification\n${specContent}` : '',
    planContent ? `## Plan\n${planContent}` : '',
    tasksContent ? `## Tasks\n${tasksContent}` : '',
    validationContent ? `## Validation\n${validationContent}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  log.step('Starting Forge-Gauge retrospect loop...');
  await runForgeGaugeLoop(projectRoot, config, state, {
    description:
      'Summarize what happened during this workflow, what worked well, what did not, and what should change next time.',
    specContent: reviewContext,
    planContent: validationContent,
    constitution,
  });

  log.step('Retrospect complete. Finalizing workflow...');
  await advanceStage(projectRoot, state, config);
}
