import { loadConfig } from '../src/config.js';
import { loadState } from '../src/workflow.js';
import { log, die } from '../src/utils.js';
import { cmdClarify } from './clarify.js';
import { cmdPlan } from './plan.js';
import { cmdTasks } from './tasks.js';
import { cmdImplement } from './implement.js';
import { cmdValidate } from './validate.js';
import { cmdRetrospect } from './retrospect.js';
import { cmdStatus } from './status.js';

const STAGE_COMMANDS: Record<string, () => Promise<void>> = {
  clarification: cmdClarify,
  planning: cmdPlan,
  task_breakdown: cmdTasks,
  implementation: cmdImplement,
  validation: cmdValidate,
  retrospect: cmdRetrospect,
};

export async function cmdNext(): Promise<void> {
  log.step('Determining next stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  const stage = state.currentStage;

  if (stage === 'specification') {
    die(
      `Cannot use 'next' at stage '${stage}'. Run 'steel specify "<desc>"' first.`,
    );
  }

  const handler = STAGE_COMMANDS[stage];
  if (!handler) {
    log.info('Workflow is complete. Nothing to do.');
    await cmdStatus();
    return;
  }

  log.info(`Running next stage: ${stage}`);
  await handler();
}
