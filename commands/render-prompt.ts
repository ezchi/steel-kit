import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig, getSpecDir, getSteelDir } from '../src/config.js';
import { resolveGitConfig } from '../src/git-config.js';
import { renderTemplate } from '../src/template.js';
import { loadState } from '../src/workflow.js';
import { die, log } from '../src/utils.js';

export interface RenderPromptOpts {
  role: 'forge' | 'gauge';
  stage: string;
  feedback?: string;       // path to prior gauge artifact (forge role)
  reviewTarget?: string;   // path to forge artifact (gauge role)
  task?: string;           // path to current task description (implement)
  output?: string;         // write rendered prompt here; default stdout
  iteration?: number;
  template?: string;       // override role+stage→template auto-mapping
}

const FORGE_STAGE_TEMPLATE: Record<string, string> = {
  constitution: 'constitution',
  specification: 'specify',
  clarification: 'clarify',
  planning: 'plan',
  task_breakdown: 'tasks',
  implementation: 'implement',
  validation: 'validate',
  retrospect: 'retrospect',
};

const GAUGE_STAGE_TEMPLATE: Record<string, string> = {
  constitution: 'review-spec',
  specification: 'review-spec',
  clarification: 'review-spec',
  planning: 'review-plan',
  task_breakdown: 'review-plan',
  implementation: 'review-code',
  validation: 'review-tests',
  retrospect: 'review-retrospect',
};

async function readIfExists(path: string | undefined): Promise<string> {
  if (!path) return '';
  if (!existsSync(path)) return '';
  return readFile(path, 'utf-8');
}

export async function cmdRenderPrompt(opts: RenderPromptOpts): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  // Resolve base branch — prefer per-spec, fall back to config default with a
  // warning so users know they're on the legacy path.
  let baseBranch: string;
  if (state.baseBranch) {
    baseBranch = state.baseBranch;
  } else {
    baseBranch = resolveGitConfig(config).baseBranch;
    log.warn(
      `state.baseBranch missing for spec ${state.specId ?? '(none)'}; ` +
        `using config default '${baseBranch}'. ` +
        `Run \`steel state init --spec-id <id> --base-branch <X>\` to lock it in.`,
    );
  }

  // Read constitution + spec + plan from canonical paths.
  const constitutionPath = resolve(getSteelDir(projectRoot), 'constitution.md');
  const constitution = await readIfExists(constitutionPath);

  let specContent = '';
  let planContent = '';
  if (state.specId) {
    const specDir = getSpecDir(projectRoot, config, state.specId);
    specContent = await readIfExists(resolve(specDir, 'spec.md'));
    planContent = await readIfExists(resolve(specDir, 'plan.md'));
  }

  const taskContent = await readIfExists(opts.task);
  const feedbackRaw = await readIfExists(opts.feedback);
  const feedback = feedbackRaw
    ? `## Prior Review Feedback\nCritically evaluate each item below. Accept feedback that improves quality and aligns with the constitution. REJECT feedback that contradicts the constitution or adds unnecessary complexity. Do NOT blindly accept all suggestions.\n\n${feedbackRaw}`
    : '';
  const reviewTarget = await readIfExists(opts.reviewTarget);

  const vars: Record<string, string> = {
    STAGE: opts.stage,
    ITERATION: String(opts.iteration ?? state.iteration),
    DESCRIPTION: state.description ?? '',
    SPEC: specContent,
    PLAN: planContent,
    TASK: taskContent,
    FEEDBACK: feedback,
    CONSTITUTION: constitution,
    BASE_BRANCH: baseBranch,
    FORGE_OUTPUT: opts.role === 'gauge' ? reviewTarget : '',
    REVIEW_INPUT: opts.role === 'gauge' ? reviewTarget : '',
  };

  const templateMap = opts.role === 'forge' ? FORGE_STAGE_TEMPLATE : GAUGE_STAGE_TEMPLATE;
  const templateName = opts.template ?? templateMap[opts.stage];
  if (!templateName) {
    die(`Unknown stage '${opts.stage}' for role '${opts.role}'. Pass --template to override.`);
  }

  const category = opts.role === 'forge' ? 'prompts/forge' : 'prompts/gauge';
  const rendered = await renderTemplate(category, templateName, vars, projectRoot);

  if (opts.output) {
    await writeFile(opts.output, rendered, 'utf-8');
    process.stdout.write(opts.output + '\n');
  } else {
    process.stdout.write(rendered);
  }
}
