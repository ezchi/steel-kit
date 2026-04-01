import { getProvider } from './providers/index.js';
import type { SteelConfig } from './config.js';
import { renderTemplate } from './template.js';
import { log } from './utils.js';

export interface ForgeResult {
  output: string;
  stage: string;
  iteration: number;
}

export interface ForgeContext {
  stage: string;
  iteration: number;
  description?: string;
  specContent?: string;
  planContent?: string;
  taskContent?: string;
  priorFeedback?: string;
  constitution?: string;
  projectRoot: string;
}

export async function forgeExecute(
  config: SteelConfig,
  ctx: ForgeContext,
): Promise<ForgeResult> {
  const provider = getProvider(config.forge.provider);

  // Build template variables
  const vars: Record<string, string> = {
    STAGE: ctx.stage,
    ITERATION: String(ctx.iteration),
    DESCRIPTION: ctx.description ?? '',
    SPEC: ctx.specContent ?? '',
    PLAN: ctx.planContent ?? '',
    TASK: ctx.taskContent ?? '',
    FEEDBACK: ctx.priorFeedback
      ? `## Prior Review Feedback\nCritically evaluate each item below. Accept feedback that improves quality and aligns with the constitution. REJECT feedback that contradicts the constitution or adds unnecessary complexity. Do NOT blindly accept all suggestions.\n\n${ctx.priorFeedback}`
      : '',
    CONSTITUTION: ctx.constitution ?? '',
  };

  // Map stage to prompt template name
  const promptName = stageToPromptName(ctx.stage);
  let prompt: string;
  try {
    prompt = await renderTemplate(
      'prompts/forge',
      promptName,
      vars,
      ctx.projectRoot,
    );
  } catch {
    // If no template found, build a basic prompt
    prompt = buildFallbackPrompt(ctx);
  }

  log.step(
    `Forge (${provider.name}) executing: ${ctx.stage} iteration ${ctx.iteration}`,
  );
  log.info('Waiting for LLM response (this may take a few minutes)...');

  const output = await provider.invoke(prompt, {
    model: config.forge.model,
    allowFileEdits: ctx.stage === 'implementation',
    workingDir: ctx.projectRoot,
  });

  log.success(`Forge completed: ${ctx.stage} iteration ${ctx.iteration}`);

  return {
    output,
    stage: ctx.stage,
    iteration: ctx.iteration,
  };
}

function stageToPromptName(stage: string): string {
  const map: Record<string, string> = {
    constitution: 'constitution',
    specification: 'specify',
    clarification: 'clarify',
    planning: 'plan',
    task_breakdown: 'tasks',
    implementation: 'implement',
    validation: 'validate',
    retrospect: 'retrospect',
  };
  return map[stage] ?? stage;
}

function buildFallbackPrompt(ctx: ForgeContext): string {
  const parts: string[] = [];

  parts.push(`You are the Forge — the primary execution agent in a dual-agent development workflow.`);
  parts.push(`Current stage: ${ctx.stage}, iteration: ${ctx.iteration}`);
  parts.push(``);
  parts.push(`CRITICAL INSTRUCTIONS:`);
  parts.push(`- Output ONLY the document content in Markdown format.`);
  parts.push(`- Do NOT include any conversational text, explanations, questions, or commentary.`);
  parts.push(`- Do NOT ask for permissions, confirmations, or clarifications.`);
  parts.push(`- Do NOT wrap the output in code fences or say "here is the document".`);
  parts.push(`- Start directly with the document content (e.g., "# Title").`);

  if (ctx.constitution) {
    parts.push(`\n## Project Constitution (AUTHORITATIVE — this overrides conflicting feedback)\n${ctx.constitution}`);
    parts.push(`\nIMPORTANT: The Project Constitution is the highest authority. If the Gauge's review feedback contradicts the constitution, IGNORE that feedback and follow the constitution. Do not blindly accept all review suggestions — critically evaluate each one against the constitution and project requirements.`);
  }
  if (ctx.description) {
    parts.push(`\n## Task Description\n${ctx.description}`);
  }
  if (ctx.specContent) {
    parts.push(`\n## Specification\n${ctx.specContent}`);
  }
  if (ctx.planContent) {
    parts.push(`\n## Implementation Plan\n${ctx.planContent}`);
  }
  if (ctx.taskContent) {
    parts.push(`\n## Current Task\n${ctx.taskContent}`);
  }
  if (ctx.priorFeedback) {
    parts.push(`\n## Prior Review Feedback`);
    parts.push(`Critically evaluate each item below. Accept feedback that improves quality and aligns with the constitution. REJECT feedback that contradicts the constitution or adds unnecessary complexity.`);
    parts.push(ctx.priorFeedback);
  }

  parts.push(`\nProduce your output for the ${ctx.stage} stage. Be thorough and precise.`);
  parts.push(`Remember: output ONLY the Markdown document. No preamble, no questions, no commentary.`);

  return parts.join('\n');
}
