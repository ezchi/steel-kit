import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSpecDir, getSteelDir, loadConfig } from '../src/config.js';
import { loadConstitutionIfReady } from '../src/constitution.js';
import {
  loadState,
  saveState,
  runForgeGaugeLoop,
  advanceStage,
} from '../src/workflow.js';
import { log, die } from '../src/utils.js';

interface Task {
  id: number;
  title: string;
  description: string;
}

export async function cmdImplement(): Promise<void> {
  log.step('Starting implementation stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (state.currentStage !== 'implementation') {
    die(
      `Cannot implement: current stage is '${state.currentStage}'. Expected 'implementation'.`,
    );
  }

  if (!state.specId) {
    die('No active specification.');
  }

  // Load tasks
  log.info('Loading task list...');
  const tasksJsonPath = resolve(getSteelDir(projectRoot), 'tasks.json');
  if (!existsSync(tasksJsonPath)) {
    die('No tasks found. Run `steel tasks` first.');
  }

  const tasks: Task[] = JSON.parse(
    await readFile(tasksJsonPath, 'utf-8'),
  );

  if (tasks.length === 0) {
    die('Task list is empty.');
  }

  const specDir = getSpecDir(projectRoot, config, state.specId);
  // Load context files
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

  log.info(`Implementing ${tasks.length} tasks for: ${state.specId}`);

  // Execute each task through the forge-gauge loop
  for (const task of tasks) {
    log.step(`\n=== Task ${task.id}/${tasks.length}: ${task.title} ===`);

    // Reset iteration for each task
    state.iteration = 1;
    await saveState(projectRoot, state);

    const taskContent = `## Task ${task.id}: ${task.title}\n\n${task.description}`;

    log.step(`Starting Forge-Gauge loop for task ${task.id}...`);
    await runForgeGaugeLoop(projectRoot, config, state, {
      specContent,
      planContent,
      taskContent,
      constitution,
      description: state.description,
    });

    log.success(`Task ${task.id}/${tasks.length} complete: ${task.title}`);
  }

  // Mark implementation complete and advance
  log.info('All tasks complete. Updating state...');
  state.stages.implementation.status = 'complete';
  state.stages.implementation.completedAt = new Date().toISOString();
  await saveState(projectRoot, state);

  // Auto-advance to validation
  log.step('Implementation complete. Advancing to validation...');
  await advanceStage(projectRoot, state, config);
}
