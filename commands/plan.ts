import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSpecDir, getSteelDir, loadConfig } from '../src/config.js';
import {
  loadState,
  runForgeGaugeLoop,
  advanceStage,
} from '../src/workflow.js';
import { log, die } from '../src/utils.js';

export async function cmdPlan(): Promise<void> {
  log.step('Starting planning stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (state.currentStage !== 'planning') {
    die(
      `Cannot plan: current stage is '${state.currentStage}'. Expected 'planning'.`,
    );
  }

  if (!state.specId) {
    die('No active specification. Run `steel specify` first.');
  }

  const specDir = getSpecDir(projectRoot, config, state.specId);
  log.info('Loading spec, clarifications, and constitution...');
  const specPath = resolve(specDir, 'spec.md');
  const clarPath = resolve(specDir, 'clarifications.md');
  const constitutionPath = resolve(getSteelDir(projectRoot), 'constitution.md');

  const specContent = existsSync(specPath)
    ? await readFile(specPath, 'utf-8')
    : undefined;
  const constitution = existsSync(constitutionPath)
    ? await readFile(constitutionPath, 'utf-8')
    : undefined;

  if (!specContent) {
    die(`Spec file not found: ${specPath}`);
  }

  // Append clarifications to spec if they exist
  let fullSpec = specContent;
  if (existsSync(clarPath)) {
    const clarContent = await readFile(clarPath, 'utf-8');
    fullSpec += `\n\n## Clarifications\n${clarContent}`;
  }

  log.info(`Planning implementation for: ${state.specId}`);
  log.step('Starting Forge-Gauge planning loop...');

  await runForgeGaugeLoop(projectRoot, config, state, {
    specContent: fullSpec,
    constitution,
    description: state.description,
  });

  // Auto-advance to task_breakdown (no human approval needed)
  log.step('Planning complete. Advancing to task breakdown...');
  await advanceStage(projectRoot, state, config);
}
