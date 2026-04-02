import { loadConfig } from '../src/config.js';
import { loadConstitutionIfReady } from '../src/constitution.js';
import { loadState } from '../src/workflow.js';
import { log, die } from '../src/utils.js';
import { cmdClarify } from './clarify.js';
import { cmdPlan } from './plan.js';
import { cmdTasks } from './tasks.js';
import { cmdImplement } from './implement.js';
import { cmdValidate } from './validate.js';
import { cmdRetrospect } from './retrospect.js';
import { cmdStatus } from './status.js';

const STAGE_ORDER = [
  'clarification',
  'planning',
  'task_breakdown',
  'implementation',
  'validation',
  'retrospect',
] as const;

const STAGE_COMMANDS: Record<string, () => Promise<void>> = {
  clarification: cmdClarify,
  planning: cmdPlan,
  task_breakdown: cmdTasks,
  implementation: cmdImplement,
  validation: cmdValidate,
  retrospect: cmdRetrospect,
};

export async function cmdRunAll(): Promise<void> {
  log.step('Starting run-all: running all remaining stages...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  const stage = state.currentStage;

  if (stage === 'specification') {
    await loadConstitutionIfReady(projectRoot);
    die(`Cannot use 'run-all' at stage '${stage}'. Run 'steel specify "<desc>"' first.`);
  }

  if (state.specId) {
    await loadConstitutionIfReady(projectRoot);
  }

  // Find where we are in the stage order
  const startIdx = STAGE_ORDER.indexOf(stage as any);
  if (startIdx === -1) {
    log.info('Workflow is complete. Nothing to do.');
    await cmdStatus();
    return;
  }

  const remaining = STAGE_ORDER.slice(startIdx);
  log.info(
    `Running all remaining stages: ${remaining.join(' -> ')} -> status`,
  );

  for (const s of remaining) {
    const handler = STAGE_COMMANDS[s];
    if (!handler) break;

    log.info(`\n${'='.repeat(50)}`);
    log.info(`Stage: ${s}`);
    log.info('='.repeat(50));

    await handler();

    // Reload state to check if we actually advanced
    const updated = await loadState(projectRoot);
    if (updated.currentStage === s) {
      // Stage didn't advance (e.g., human declined approval)
      log.warn(`Stopped at stage '${s}' — did not advance.`);
      break;
    }
  }

  await cmdStatus();
}
