import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSpecDir, loadConfig } from '../src/config.js';
import { loadConstitutionIfReady } from '../src/constitution.js';
import {
  loadState,
  runForgeGaugeLoop,
  advanceStage,
} from '../src/workflow.js';
import { log, die } from '../src/utils.js';

export async function cmdValidate(): Promise<void> {
  log.step('Starting validation stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (state.currentStage !== 'validation') {
    die(
      `Cannot validate: current stage is '${state.currentStage}'. Expected 'validation'.`,
    );
  }

  if (!state.specId) {
    die('No active specification.');
  }

  const specDir = getSpecDir(projectRoot, config, state.specId);
  log.info('Loading spec, plan, and constitution...');
  const specPath = resolve(specDir, 'spec.md');
  const planPath = resolve(specDir, 'plan.md');

  const specContent = existsSync(specPath)
    ? await readFile(specPath, 'utf-8')
    : undefined;
  const planContent = existsSync(planPath)
    ? await readFile(planPath, 'utf-8')
    : undefined;
  const constitution = await loadConstitutionIfReady(projectRoot);

  log.info(`Validating implementation for: ${state.specId}`);
  log.step('Starting Forge-Gauge validation loop...');

  await runForgeGaugeLoop(projectRoot, config, state, {
    specContent,
    planContent,
    constitution,
    description:
      'Run tests, verify the implementation against the specification, and report results.',
  });

  log.step('Validation complete. Advancing to retrospect...');
  await advanceStage(projectRoot, state, config);
}
