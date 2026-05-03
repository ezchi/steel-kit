import {
  createInitialState,
  loadState,
  saveState,
  type StageName,
  type StageStatus,
  type WorkflowState,
} from '../src/workflow.js';
import { die, log } from '../src/utils.js';

const STAGE_ORDER: StageName[] = [
  'specification',
  'clarification',
  'planning',
  'task_breakdown',
  'implementation',
  'validation',
  'retrospect',
];

const VALID_STATUSES: StageStatus[] = ['pending', 'in_progress', 'complete'];

function validateStage(stage: string): asserts stage is StageName {
  if (!STAGE_ORDER.includes(stage as StageName)) {
    die(`Invalid stage '${stage}'. Valid: ${STAGE_ORDER.join(', ')}`);
  }
}

function getNested(obj: any, fieldPath: string): unknown {
  const parts = fieldPath.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

// `steel state init --spec-id <id> --base-branch <name> [--desc <txt>] [--branch <name>]`
export interface StateInitOpts {
  specId: string;
  baseBranch: string;
  description?: string;
  branch?: string;
}

export async function cmdStateInit(opts: StateInitOpts): Promise<void> {
  const projectRoot = process.cwd();
  const state = await loadState(projectRoot);
  state.specId = opts.specId;
  state.baseBranch = opts.baseBranch;
  if (opts.description !== undefined) state.description = opts.description;
  if (opts.branch !== undefined) state.branch = opts.branch;
  await saveState(projectRoot, state);
  log.success(`state initialized for spec '${opts.specId}' (base: ${opts.baseBranch})`);
}

// `steel state iter --inc | --reset | --set <N>`
export interface StateIterOpts {
  inc?: boolean;
  reset?: boolean;
  set?: number;
}

export async function cmdStateIter(opts: StateIterOpts): Promise<void> {
  const projectRoot = process.cwd();
  const state = await loadState(projectRoot);
  const flags = [opts.inc, opts.reset, opts.set !== undefined].filter(Boolean).length;
  if (flags !== 1) {
    die('Provide exactly one of --inc, --reset, --set <N>');
  }
  if (opts.inc) state.iteration += 1;
  if (opts.reset) state.iteration = 1;
  if (opts.set !== undefined) {
    if (!Number.isFinite(opts.set) || opts.set < 1) {
      die(`Invalid iteration value: ${opts.set}`);
    }
    state.iteration = opts.set;
  }
  state.stages[state.currentStage].iteration = state.iteration;
  await saveState(projectRoot, state);
  process.stdout.write(String(state.iteration) + '\n');
}

// `steel state advance-stage` — move currentStage forward (no human-gate logic
// here; that's the slash command's responsibility).
export async function cmdStateAdvance(): Promise<void> {
  const projectRoot = process.cwd();
  const state = await loadState(projectRoot);
  const idx = STAGE_ORDER.indexOf(state.currentStage);
  if (idx < 0) die(`Unknown current stage '${state.currentStage}'`);
  if (idx === STAGE_ORDER.length - 1) {
    log.info('Already on final stage; nothing to advance.');
    return;
  }
  state.stages[state.currentStage].status = 'complete';
  state.stages[state.currentStage].completedAt = new Date().toISOString();
  state.currentStage = STAGE_ORDER[idx + 1];
  state.iteration = 1;
  await saveState(projectRoot, state);
  log.success(`Advanced to stage: ${state.currentStage}`);
  process.stdout.write(state.currentStage + '\n');
}

// `steel state mark --stage <X> --status <pending|in_progress|complete>`
export interface StateMarkOpts {
  stage: string;
  status: string;
}

export async function cmdStateMark(opts: StateMarkOpts): Promise<void> {
  validateStage(opts.stage);
  if (!VALID_STATUSES.includes(opts.status as StageStatus)) {
    die(`Invalid status '${opts.status}'. Valid: ${VALID_STATUSES.join(', ')}`);
  }
  const projectRoot = process.cwd();
  const state = await loadState(projectRoot);
  state.stages[opts.stage as StageName].status = opts.status as StageStatus;
  if (opts.status === 'in_progress' && !state.stages[opts.stage as StageName].startedAt) {
    state.stages[opts.stage as StageName].startedAt = new Date().toISOString();
  }
  if (opts.status === 'complete') {
    state.stages[opts.stage as StageName].completedAt = new Date().toISOString();
  }
  await saveState(projectRoot, state);
  log.success(`Marked ${opts.stage} as ${opts.status}`);
}

// `steel state get [--field <path>]` — emits the full state as JSON or a
// single field value (resolves dotted paths like `stages.planning.status`).
export interface StateGetOpts {
  field?: string;
}

export async function cmdStateGet(opts: StateGetOpts): Promise<void> {
  const projectRoot = process.cwd();
  const state = await loadState(projectRoot);
  if (opts.field) {
    const value = getNested(state as unknown as Record<string, unknown>, opts.field);
    if (value === undefined) {
      process.stdout.write('\n');
      return;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      process.stdout.write(String(value) + '\n');
    } else {
      process.stdout.write(JSON.stringify(value) + '\n');
    }
  } else {
    process.stdout.write(JSON.stringify(state, null, 2) + '\n');
  }
}

// `steel state set-skills --stage <X> --skills <s1,s2,...>` — record skills used in a stage.
export interface StateSetSkillsOpts {
  stage: string;
  skills: string[];
}

export async function cmdStateSetSkills(opts: StateSetSkillsOpts): Promise<void> {
  validateStage(opts.stage);
  const projectRoot = process.cwd();
  const state = await loadState(projectRoot);
  state.skillsUsed = state.skillsUsed ?? {};
  state.skillsUsed[opts.stage as StageName] = opts.skills;
  await saveState(projectRoot, state);
  log.success(`Recorded skills for ${opts.stage}: ${opts.skills.join(', ') || '(none)'}`);
}

// `steel state reset` — replace state.json with createInitialState() output.
// Does NOT touch specs/, .steel/tasks.json, or git tags. Used by /steel-specify
// step 0a-y (preserve-history reset path).
export async function cmdStateReset(): Promise<void> {
  const projectRoot = process.cwd();
  const fresh = createInitialState();
  await saveState(projectRoot, fresh);
  log.success(
    'State reset to fresh specification:pending (prior specs/, tasks.json, and git tags are NOT touched)',
  );
}

// Used by cli.ts to keep `WorkflowState` import surface consistent.
export type { WorkflowState };
