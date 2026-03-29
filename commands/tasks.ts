import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, getSteelDir } from '../src/config.js';
import {
  loadState,
  runForgeGaugeLoop,
  advanceStage,
} from '../src/workflow.js';
import { log, die } from '../src/utils.js';

export async function cmdTasks(): Promise<void> {
  log.step('Starting task breakdown stage...');
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (state.currentStage !== 'task_breakdown') {
    die(
      `Cannot break down tasks: current stage is '${state.currentStage}'. Expected 'task_breakdown'.`,
    );
  }

  if (!state.specId) {
    die('No active specification. Run `steel specify` first.');
  }

  log.info('Loading spec, plan, and constitution...');
  const specPath = resolve(projectRoot, 'specs', state.specId, 'spec.md');
  const planPath = resolve(projectRoot, 'specs', state.specId, 'plan.md');
  const constitutionPath = resolve(getSteelDir(projectRoot), 'constitution.md');

  const specContent = existsSync(specPath)
    ? await readFile(specPath, 'utf-8')
    : undefined;
  const planContent = existsSync(planPath)
    ? await readFile(planPath, 'utf-8')
    : undefined;
  const constitution = existsSync(constitutionPath)
    ? await readFile(constitutionPath, 'utf-8')
    : undefined;

  if (!planContent) {
    die(`Plan file not found: ${planPath}`);
  }

  log.info(`Breaking down tasks for: ${state.specId}`);
  log.step('Starting Forge-Gauge task breakdown loop...');

  await runForgeGaugeLoop(projectRoot, config, state, {
    specContent,
    planContent,
    constitution,
    description: state.description,
  });

  // Also save tasks as JSON for the implement command
  const tasksPath = resolve(projectRoot, 'specs', state.specId, 'tasks.md');
  if (existsSync(tasksPath)) {
    log.info('Parsing tasks into JSON...');
    const tasksMd = await readFile(tasksPath, 'utf-8');
    const tasksJson = parseTasksMarkdown(tasksMd);
    const jsonPath = resolve(getSteelDir(projectRoot), 'tasks.json');
    await writeFile(jsonPath, JSON.stringify(tasksJson, null, 2));
    log.success(`Tasks saved to .steel/tasks.json (${tasksJson.length} tasks)`);
  }

  // Auto-advance to implementation
  log.step('Task breakdown complete. Advancing to implementation...');
  await advanceStage(projectRoot, state, config);
}

interface Task {
  id: number;
  title: string;
  description: string;
  parallel: boolean;
}

function parseTasksMarkdown(md: string): Task[] {
  const tasks: Task[] = [];
  const lines = md.split('\n');
  let currentTask: Partial<Task> | null = null;
  let taskId = 0;

  for (const line of lines) {
    // Match numbered list items or checkbox items
    const match = line.match(
      /^(?:\d+\.\s+|\-\s+\[[ xP]\]\s+)(.+)/,
    );
    if (match) {
      if (currentTask?.title) {
        tasks.push(currentTask as Task);
      }
      taskId++;
      const title = match[1].trim();
      currentTask = {
        id: taskId,
        title,
        description: '',
        parallel: line.includes('[P]'),
      };
    } else if (currentTask && line.trim() && !line.startsWith('#')) {
      currentTask.description += line.trim() + '\n';
    }
  }

  if (currentTask?.title) {
    tasks.push(currentTask as Task);
  }

  return tasks;
}
