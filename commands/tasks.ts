import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSpecDir, getSteelDir, loadConfig } from '../src/config.js';
import { loadConstitutionIfReady } from '../src/constitution.js';
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
  const tasksPath = resolve(specDir, 'tasks.md');
  if (existsSync(tasksPath)) {
    log.info('Parsing tasks into JSON...');
    const tasksMd = await readFile(tasksPath, 'utf-8');
    const tasksJson = parseTasksMarkdown(tasksMd);
    if (tasksJson.length === 0) {
      die('Failed to parse any tasks from tasks.md. Ensure the task list is under a "## Tasks" heading.');
    }
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
}

function parseTasksMarkdown(md: string): Task[] {
  const tasks: Task[] = [];
  const lines = md.split('\n');
  let inTasksSection = false;
  let currentTask: Partial<Task> | null = null;

  for (const line of lines) {
    if (/^##\s+Tasks\b/i.test(line)) {
      inTasksSection = true;
      continue;
    }

    if (inTasksSection && /^##\s+/.test(line)) {
      break;
    }

    if (!inTasksSection) {
      continue;
    }

    const match = line.match(/^(\d+)\.\s+(.+)/);
    if (match) {
      if (currentTask?.title) {
        tasks.push(currentTask as Task);
      }
      const id = parseInt(match[1], 10);
      const title = match[2].trim();
      currentTask = {
        id,
        title,
        description: '',
      };
      continue;
    }

    if (!currentTask) {
      continue;
    }

    if (/^\s*$/.test(line)) {
      currentTask.description += '\n';
      continue;
    }

    if (/^\s{2,}\S/.test(line) || /^(Description|Files|Dependencies|Verification):/.test(line.trim())) {
      currentTask.description += `${line.trim()}\n`;
    }
  }

  if (currentTask?.title) {
    tasks.push(currentTask as Task);
  }

  return tasks;
}
