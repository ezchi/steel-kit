import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { type SteelConfig, getSteelDir } from './config.js';
import { forgeExecute, type ForgeContext } from './forge.js';
import { gaugeReview, type GaugeContext } from './gauge.js';
import { commitStep, tagStage } from './git-ops.js';
import { log, confirm, die } from './utils.js';

// -- Stage Definitions --

export type StageName =
  | 'constitution'
  | 'specification'
  | 'clarification'
  | 'planning'
  | 'task_breakdown'
  | 'implementation'
  | 'validation';

export type StageStatus = 'pending' | 'in_progress' | 'complete';

interface StageInfo {
  status: StageStatus;
  iteration?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface WorkflowState {
  currentStage: StageName;
  iteration: number;
  specId?: string;
  branch?: string;
  description?: string;
  stages: Record<StageName, StageInfo>;
}

const STAGE_ORDER: StageName[] = [
  'constitution',
  'specification',
  'clarification',
  'planning',
  'task_breakdown',
  'implementation',
  'validation',
];

const HUMAN_APPROVAL_GATES: Set<string> = new Set([
  'specification->clarification',
  'clarification->planning',
]);

// -- State Management --

function getStatePath(projectRoot: string): string {
  return resolve(getSteelDir(projectRoot), 'state.json');
}

function getArtifactsDir(projectRoot: string, stage: string): string {
  return resolve(getSteelDir(projectRoot), 'artifacts', stage);
}

export function createInitialState(): WorkflowState {
  const stages: Record<StageName, StageInfo> = {} as any;
  for (const stage of STAGE_ORDER) {
    stages[stage] = { status: 'pending' };
  }
  return {
    currentStage: 'constitution',
    iteration: 1,
    stages,
  };
}

export async function loadState(projectRoot: string): Promise<WorkflowState> {
  const path = getStatePath(projectRoot);
  if (!existsSync(path)) {
    throw new Error('Project not initialized. Run `steel init` first.');
  }
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw);
}

export async function saveState(
  projectRoot: string,
  state: WorkflowState,
): Promise<void> {
  const steelDir = getSteelDir(projectRoot);
  await mkdir(steelDir, { recursive: true });
  await writeFile(getStatePath(projectRoot), JSON.stringify(state, null, 2));
}

// -- Stage Transitions --

function getNextStage(current: StageName): StageName | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function requiresApproval(from: StageName, to: StageName): boolean {
  return HUMAN_APPROVAL_GATES.has(`${from}->${to}`);
}

export async function advanceStage(
  projectRoot: string,
  state: WorkflowState,
  config: SteelConfig,
): Promise<boolean> {
  const next = getNextStage(state.currentStage);
  if (!next) {
    log.success('All stages complete!');
    return false;
  }

  if (requiresApproval(state.currentStage, next)) {
    log.info(
      `Human approval required to advance from ${state.currentStage} to ${next}`,
    );
    const approved = await confirm(
      `Approve advancing from "${state.currentStage}" to "${next}"?`,
    );
    if (!approved) {
      log.warn('Advancement declined by user');
      return false;
    }
  }

  // Tag completed stage
  if (config.autoCommit) {
    await tagStage(state.currentStage, projectRoot);
  }

  // Advance
  state.stages[state.currentStage].status = 'complete';
  state.stages[state.currentStage].completedAt = new Date().toISOString();
  state.currentStage = next;
  state.iteration = 1;
  state.stages[next].status = 'in_progress';
  state.stages[next].startedAt = new Date().toISOString();

  await saveState(projectRoot, state);
  log.success(`Advanced to stage: ${next}`);
  return true;
}

// -- Forge-Gauge Loop --

export interface LoopContext {
  description?: string;
  specContent?: string;
  planContent?: string;
  taskContent?: string;
  constitution?: string;
}

export async function runForgeGaugeLoop(
  projectRoot: string,
  config: SteelConfig,
  state: WorkflowState,
  loopCtx: LoopContext,
): Promise<void> {
  const stage = state.currentStage;
  const maxIter = config.maxIterations;

  state.stages[stage].status = 'in_progress';
  state.stages[stage].startedAt = new Date().toISOString();

  let priorFeedback: string | undefined;

  for (let iter = state.iteration; iter <= maxIter; iter++) {
    state.iteration = iter;
    state.stages[stage].iteration = iter;
    await saveState(projectRoot, state);

    log.info(`\n--- ${stage} iteration ${iter}/${maxIter} ---\n`);

    // -- Forge Phase --
    const forgeCtx: ForgeContext = {
      stage,
      iteration: iter,
      description: loopCtx.description,
      specContent: loopCtx.specContent,
      planContent: loopCtx.planContent,
      taskContent: loopCtx.taskContent,
      constitution: loopCtx.constitution,
      priorFeedback,
      projectRoot,
    };

    const forgeResult = await forgeExecute(config, forgeCtx);

    // Save forge artifact
    log.info('Saving forge output...');
    const artifactsDir = getArtifactsDir(projectRoot, stage);
    await mkdir(artifactsDir, { recursive: true });
    const forgeArtifactPath = resolve(
      artifactsDir,
      `iter${iter}-forge.md`,
    );
    await writeFile(forgeArtifactPath, forgeResult.output);

    // Update the stage output file (e.g., specs/NNN/spec.md)
    await updateStageOutput(projectRoot, state, forgeResult.output);

    // Git commit forge output
    if (config.autoCommit) {
      log.info('Committing forge output...');
      await commitStep(
        'forge',
        stage,
        iter,
        `iteration ${iter} output`,
        projectRoot,
      );
    }

    // -- Gauge Phase --
    const gaugeCtx: GaugeContext = {
      stage,
      iteration: iter,
      forgeOutput: forgeResult.output,
      specContent: loopCtx.specContent,
      planContent: loopCtx.planContent,
      constitution: loopCtx.constitution,
      projectRoot,
    };

    const gaugeResult = await gaugeReview(config, gaugeCtx);

    // Save gauge artifact
    log.info('Saving gauge review...');
    const gaugeArtifactPath = resolve(
      artifactsDir,
      `iter${iter}-gauge.md`,
    );
    await writeFile(gaugeArtifactPath, gaugeResult.rawOutput);

    // Git commit gauge review
    if (config.autoCommit) {
      log.info('Committing gauge review...');
      await commitStep(
        'gauge',
        stage,
        iter,
        `iteration ${iter} review — ${gaugeResult.verdict}`,
        projectRoot,
      );
    }

    // -- Check Verdict --
    if (gaugeResult.verdict === 'approve') {
      log.success(`Stage ${stage} approved at iteration ${iter}`);
      state.stages[stage].status = 'complete';
      state.stages[stage].completedAt = new Date().toISOString();
      await saveState(projectRoot, state);
      return;
    }

    // Revise — feed back to forge
    log.info(`Gauge requested revisions, continuing to iteration ${iter + 1}`);
    priorFeedback = gaugeResult.feedback;

    // Also update the loop context with the latest forge output so gauge
    // feedback references the right version
    if (stage === 'specification' || stage === 'clarification') {
      loopCtx.specContent = forgeResult.output;
    } else if (stage === 'planning') {
      loopCtx.planContent = forgeResult.output;
    }
  }

  // Max iterations reached
  log.warn(`Max iterations (${maxIter}) reached for stage: ${stage}`);
  const proceed = await confirm(
    'Max iterations reached. Accept current output and proceed anyway?',
  );
  if (proceed) {
    state.stages[stage].status = 'complete';
    state.stages[stage].completedAt = new Date().toISOString();
    await saveState(projectRoot, state);
  } else {
    die('Stage not completed. Re-run the command to try again.');
  }
}

// -- Helper: Write stage output to the appropriate location --

async function updateStageOutput(
  projectRoot: string,
  state: WorkflowState,
  output: string,
): Promise<void> {
  const stage = state.currentStage;
  const specId = state.specId;

  if (!specId) return; // constitution stage has no specId

  const specsDir = resolve(projectRoot, 'specs', specId);
  await mkdir(specsDir, { recursive: true });

  const fileMap: Partial<Record<StageName, string>> = {
    specification: 'spec.md',
    clarification: 'clarifications.md',
    planning: 'plan.md',
    task_breakdown: 'tasks.md',
    validation: 'validation.md',
  };

  const filename = fileMap[stage];
  if (filename) {
    await writeFile(resolve(specsDir, filename), output);
  }
}
