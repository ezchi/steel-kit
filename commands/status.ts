import { existsSync } from 'node:fs';
import { getSteelDir } from '../src/config.js';
import { loadState, type StageName } from '../src/workflow.js';
import { log } from '../src/utils.js';
import chalk from 'chalk';

const STAGE_LABELS: Record<StageName, string> = {
  specification: 'Specification',
  clarification: 'Clarification',
  planning: 'Planning',
  task_breakdown: 'Task Breakdown',
  implementation: 'Implementation',
  validation: 'Validation',
  retrospect: 'Retrospect',
};

const STATUS_ICONS: Record<string, string> = {
  complete: chalk.green('[done]'),
  in_progress: chalk.yellow('[>>>]'),
  pending: chalk.gray('[   ]'),
};

export async function cmdStatus(): Promise<void> {
  const projectRoot = process.cwd();
  const steelDir = getSteelDir(projectRoot);

  if (!existsSync(steelDir)) {
    log.info('Project not initialized. Run `steel init` to get started.');
    return;
  }

  const state = await loadState(projectRoot);

  console.log('');
  console.log(chalk.bold('Steel-Kit Workflow Status'));
  console.log(chalk.gray('─'.repeat(40)));

  if (state.specId) {
    console.log(`  Spec:    ${chalk.cyan(state.specId)}`);
  }
  if (state.branch) {
    console.log(`  Branch:  ${chalk.cyan(state.branch)}`);
  }
  if (state.description) {
    console.log(`  Feature: ${state.description}`);
  }

  console.log('');
  console.log(chalk.bold('  Stages:'));

  const stages = Object.entries(state.stages) as [StageName, any][];
  for (const [name, info] of stages) {
    const label = STAGE_LABELS[name] ?? name;
    const icon = STATUS_ICONS[info.status] ?? STATUS_ICONS.pending;
    const isCurrent = name === state.currentStage;
    const iterInfo =
      info.iteration && info.status === 'in_progress'
        ? chalk.gray(` (iteration ${info.iteration})`)
        : '';

    const line = `  ${icon} ${isCurrent ? chalk.bold.white(label) : label}${iterInfo}`;
    console.log(line);
  }

  console.log('');
  console.log(
    `  Current: ${chalk.bold(STAGE_LABELS[state.currentStage])} (iteration ${state.iteration})`,
  );
  console.log('');
}
