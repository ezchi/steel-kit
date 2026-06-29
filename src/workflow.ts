import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execa } from 'execa';
import {
  type SteelConfig,
  getSpecDir,
  getSpecsDir,
  getSteelDir,
  loadConfig,
} from './config.js';
import { forgeExecute, type ForgeContext, type ForgeResult } from './forge.js';
import { gaugeReview, type GaugeContext, type GaugeResult } from './gauge.js';
import {
  commitStep,
  getCurrentBranch,
  getWorkingTreeDiff,
  tagStage,
} from './git-ops.js';
import { log, confirm, die } from './utils.js';
import { RateLimitError } from './errors.js';

// -- Stage Definitions --

export type StageName =
  | 'specification'
  | 'clarification'
  | 'planning'
  | 'task_breakdown'
  | 'implementation'
  | 'validation'
  | 'retrospect';

export type StageStatus = 'pending' | 'in_progress' | 'complete';

interface StageInfo {
  status: StageStatus;
  iteration?: number;
  startedAt?: string;
  completedAt?: string;
  /** Gauge session ID, reused across this stage's iterations (warm context). */
  gaugeSessionId?: string;
}

export interface WorkflowState {
  currentStage: StageName;
  iteration: number;
  specId?: string;
  branch?: string;
  baseBranch?: string;
  description?: string;
  stages: Record<StageName, StageInfo>;
  skillsUsed?: Partial<Record<StageName, string[]>>;
}

export function isCompletedWorkflow(state: WorkflowState): boolean {
  return state.stages?.retrospect?.status === 'complete';
}

const STAGE_ORDER: StageName[] = [
  'specification',
  'clarification',
  'planning',
  'task_breakdown',
  'implementation',
  'validation',
  'retrospect',
];

const HUMAN_APPROVAL_GATES: Set<string> = new Set([
  'specification->clarification',
  'clarification->planning',
]);

// -- State Management --

function getStatePath(projectRoot: string): string {
  return resolve(getSteelDir(projectRoot), 'state.json');
}

function getArtifactsDir(
  projectRoot: string,
  config: SteelConfig,
  state: WorkflowState,
  stage: string,
): string {
  if (!state.specId) {
    throw new Error(`Cannot resolve artifacts path for stage "${stage}" without a spec ID.`);
  }
  return resolve(getSpecDir(projectRoot, config, state.specId), 'artifacts', stage);
}

export function createInitialState(): WorkflowState {
  const stages: Record<StageName, StageInfo> = {} as any;
  for (const stage of STAGE_ORDER) {
    stages[stage] = { status: 'pending' };
  }
  return {
    currentStage: 'specification',
    iteration: 1,
    stages,
  };
}

export async function loadState(projectRoot: string): Promise<WorkflowState> {
  const path = getStatePath(projectRoot);
  if (existsSync(path)) {
    const raw = await readFile(path, 'utf-8');
    return normalizeState(JSON.parse(raw));
  }

  // state.json is gitignored — try to recover from committed artifacts
  const steelDir = getSteelDir(projectRoot);
  if (!existsSync(resolve(steelDir, 'config.json'))) {
    throw new Error('Project not initialized. Run `steel init` first.');
  }

  log.info('state.json not found — recovering state from committed artifacts...');
  const config = await loadConfig(projectRoot);
  const state = await recoverState(projectRoot, config);
  await saveState(projectRoot, state);
  log.success(`Recovered state: stage=${state.currentStage}, specId=${state.specId ?? 'none'}`);
  return state;
}

function normalizeState(raw: any): WorkflowState {
  const initial = createInitialState();
  const stages = { ...initial.stages };

  for (const stage of STAGE_ORDER) {
    if (raw?.stages?.[stage]) {
      stages[stage] = {
        status: raw.stages[stage].status,
        iteration: raw.stages[stage].iteration,
        startedAt: raw.stages[stage].startedAt,
        completedAt: raw.stages[stage].completedAt,
        gaugeSessionId: typeof raw.stages[stage].gaugeSessionId === 'string'
          ? raw.stages[stage].gaugeSessionId
          : undefined,
      };
    }
  }

  const currentStage =
    raw?.currentStage === 'constitution' || !STAGE_ORDER.includes(raw?.currentStage)
      ? 'specification'
      : raw.currentStage;

  let skillsUsed: Partial<Record<StageName, string[]>> | undefined;
  if (raw?.skillsUsed && typeof raw.skillsUsed === 'object') {
    skillsUsed = {};
    for (const stage of STAGE_ORDER) {
      const value = raw.skillsUsed[stage];
      if (Array.isArray(value) && value.every((s) => typeof s === 'string')) {
        skillsUsed[stage] = value;
      }
    }
    if (Object.keys(skillsUsed).length === 0) skillsUsed = undefined;
  }

  return {
    currentStage,
    iteration: typeof raw?.iteration === 'number' ? raw.iteration : 1,
    specId: raw?.specId,
    branch: raw?.branch,
    baseBranch: typeof raw?.baseBranch === 'string' ? raw.baseBranch : undefined,
    description: raw?.description,
    stages,
    skillsUsed,
  };
}

async function recoverState(
  projectRoot: string,
  config: SteelConfig,
): Promise<WorkflowState> {
  const state = createInitialState();

  // 1. Detect specId from branch name or specs directory
  const { resolveSpecId, resolveGitConfig } = await import('./git-config.js');
  state.specId = (await resolveSpecId(projectRoot, config)) ?? undefined;

  // Only set branch if the current branch actually derived the specId
  if (state.specId) {
    const gitConfig = resolveGitConfig(config);
    const branch = await getCurrentBranch(projectRoot).catch(() => 'unknown');
    const matchesConfigured = branch.startsWith(gitConfig.branchPrefix)
      && branch.slice(gitConfig.branchPrefix.length) === state.specId;
    const matchesLegacy = gitConfig.branchPrefix !== 'spec/'
      && branch.startsWith('spec/') && branch.slice(5) === state.specId;
    if (matchesConfigured || matchesLegacy) {
      state.branch = branch;
    }
  }

  // 2. Check git tags to determine completed stages (scoped by specId)
  const completedStages = state.specId
    ? await getCompletedStagesFromTags(projectRoot, state.specId)
    : new Set<string>();

  // 3. Check committed spec files to infer progress
  const specFiles = state.specId
    ? await detectSpecFiles(projectRoot, config, state.specId)
    : new Set<string>();

  // Map spec files to stages
  const fileToStage: Record<string, StageName> = {
    'spec.md': 'specification',
    'clarifications.md': 'clarification',
    'plan.md': 'planning',
    'tasks.md': 'task_breakdown',
    'validation.md': 'validation',
    'retrospect.md': 'retrospect',
  };

  let lastCompleted: StageName | null = null;
  for (const stage of STAGE_ORDER) {
    const tagComplete = completedStages.has(stage);
    const fileExists = Object.entries(fileToStage).some(
      ([file, s]) => s === stage && specFiles.has(file),
    );

    if (tagComplete || fileExists) {
      state.stages[stage].status = 'complete';
      lastCompleted = stage;
    }
  }

  if (!lastCompleted) {
    state.currentStage = 'specification';
    return state;
  }

  const nextStage = getNextStage(lastCompleted);
  state.currentStage = nextStage ?? lastCompleted;
  state.iteration = 1;

  return state;
}

async function getCompletedStagesFromTags(projectRoot: string, specId: string): Promise<Set<string>> {
  const result = await execa('git', ['tag', '-l', `steel/${specId}/*-complete`], {
    cwd: projectRoot,
    reject: false,
    stdin: 'ignore',
  });
  const tags = result.stdout.trim().split('\n').filter(Boolean);
  const stages = new Set<string>();
  for (const tag of tags) {
    // e.g., "steel/003-foo/specification-complete" → "specification"
    const match = tag.match(/^steel\/[^/]+\/(.+)-complete$/);
    if (match) stages.add(match[1]);
  }
  return stages;
}

async function detectSpecFiles(
  projectRoot: string,
  config: SteelConfig,
  specId: string,
): Promise<Set<string>> {
  const specDir = getSpecDir(projectRoot, config, specId);
  if (!existsSync(specDir)) return new Set();
  const entries = await readdir(specDir);
  return new Set(entries);
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

  if (!state.specId) {
    throw new Error('Cannot tag stage completion: specId is not set');
  }
  await tagStage(state.specId, state.currentStage, projectRoot);

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

/**
 * If `err` is a rate/usage-limit error, report it clearly, persist state so the
 * stage can be resumed later, and halt the whole workflow. Otherwise rethrow.
 */
async function haltIfRateLimited(
  err: unknown,
  role: 'Forge' | 'Gauge',
  projectRoot: string,
  state: WorkflowState,
): Promise<never> {
  if (err instanceof RateLimitError) {
    log.error(`${role} provider (${err.provider}) reached a rate/usage limit:`);
    log.error(`  ${err.detail || err.message}`);
    log.warn(
      'Stopping the workflow. State has been saved — re-run the same command to resume this stage once the limit resets.',
    );
    await saveState(projectRoot, state);
    die(`Rate limit reached on ${role}. Stopped at stage '${state.currentStage}' iteration ${state.iteration}.`);
  }
  throw err;
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

  // Gauge session reuse: keep one session per stage so iteration 2+ resumes
  // the same conversation (warm context) instead of cold-loading every time.
  // A fresh stage entry (iteration 1) discards any stale ID; a mid-stage
  // restart (iteration > 1) keeps the persisted ID so resume still works.
  let gaugeSessionId =
    state.iteration > 1 ? state.stages[stage].gaugeSessionId : undefined;
  if (state.iteration <= 1) {
    state.stages[stage].gaugeSessionId = undefined;
  }

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
      baseBranch: state.baseBranch,
      priorFeedback,
      projectRoot,
    };

    let forgeResult: ForgeResult;
    try {
      forgeResult = await forgeExecute(config, forgeCtx);
    } catch (err) {
      await haltIfRateLimited(err, 'Forge', projectRoot, state);
      throw err; // unreachable: haltIfRateLimited always exits or rethrows
    }

    // Save forge artifact
    log.info('Saving forge output...');
    const artifactsDir = getArtifactsDir(projectRoot, config, state, stage);
    await mkdir(artifactsDir, { recursive: true });
    const forgeArtifactPath = resolve(
      artifactsDir,
      `iter${iter}-forge.md`,
    );
    await writeFile(forgeArtifactPath, forgeResult.output);

    // Update the stage output file (e.g., specs/NNN/spec.md)
    const stageOutputPath = getStageOutputPath(projectRoot, config, state);
    if (stageOutputPath) {
      await writeFile(stageOutputPath, forgeResult.output);
    }

    const reviewInput = stage === 'implementation'
      ? (await getWorkingTreeDiff(projectRoot)) ||
        `No git diff detected after Forge execution.\n\nForge summary:\n${forgeResult.output}`
      : forgeResult.output;

    // Git commit forge output
    if (config.autoCommit) {
      log.info('Committing forge output...');
      // For implementation stage, forge modifies arbitrary source files — stage everything.
      // For other stages, only commit the files steel-kit wrote.
      const forgePaths = stage === 'implementation'
        ? undefined
        : [forgeArtifactPath, ...(stageOutputPath ? [stageOutputPath] : [])];
      await commitStep(
        'forge',
        stage,
        iter,
        `iteration ${iter} output`,
        projectRoot,
        forgePaths,
      );
    }

    // -- Gauge Phase --
    const resumeSession = gaugeSessionId != null;
    const sessionId = gaugeSessionId ?? randomUUID();
    const gaugeCtx: GaugeContext = {
      stage,
      iteration: iter,
      forgeOutput: forgeResult.output,
      reviewInput,
      specContent: loopCtx.specContent,
      planContent: loopCtx.planContent,
      constitution: loopCtx.constitution,
      projectRoot,
      sessionId,
      resumeSession,
    };

    let gaugeResult: GaugeResult;
    try {
      gaugeResult = await gaugeReview(config, gaugeCtx);
    } catch (err) {
      await haltIfRateLimited(err, 'Gauge', projectRoot, state);
      throw err; // unreachable: haltIfRateLimited always exits or rethrows
    }

    // Persist the effective session ID (codex generates its own; claude
    // echoes ours; agy does not support resume) so the next iteration — even
    // after a restart — can resume it where supported.
    gaugeSessionId = gaugeResult.sessionId ?? sessionId;
    state.stages[stage].gaugeSessionId = gaugeSessionId;

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
        [gaugeArtifactPath],
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

// -- Helper: Resolve the stage output file path (e.g., specs/NNN/spec.md) --

const STAGE_OUTPUT_FILES: Partial<Record<StageName, string>> = {
  specification: 'spec.md',
  clarification: 'clarifications.md',
  planning: 'plan.md',
  task_breakdown: 'tasks.md',
  validation: 'validation.md',
  retrospect: 'retrospect.md',
};

function getStageOutputPath(
  projectRoot: string,
  config: SteelConfig,
  state: WorkflowState,
): string | null {
  const specId = state.specId;
  if (!specId) return null;

  const filename = STAGE_OUTPUT_FILES[state.currentStage];
  if (!filename) return null;

  return resolve(getSpecDir(projectRoot, config, specId), filename);
}
