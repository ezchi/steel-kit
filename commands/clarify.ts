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

export async function cmdClarify(): Promise<void> {
  log.step('Starting clarification stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (state.currentStage !== 'clarification') {
    die(
      `Cannot clarify: current stage is '${state.currentStage}'. Expected 'clarification'.`,
    );
  }

  if (!state.specId) {
    die('No active specification. Run `steel specify` first.');
  }

  // Load spec and constitution
  log.info('Loading spec and constitution...');
  const specPath = resolve(getSpecDir(projectRoot, config, state.specId), 'spec.md');
  const specContent = existsSync(specPath)
    ? await readFile(specPath, 'utf-8')
    : undefined;
  const constitution = await loadConstitutionIfReady(projectRoot);

  if (!specContent) {
    die(`Spec file not found: ${specPath}`);
  }

  log.info(`Clarifying spec: ${state.specId}`);
  log.step('Starting Forge-Gauge clarification loop...');

  await runForgeGaugeLoop(projectRoot, config, state, {
    specContent,
    constitution,
    description: state.description,
  });

  // Human approval required to advance to planning
  log.step('Clarification complete. Checking stage advancement...');
  await advanceStage(projectRoot, state, config);
}
