import { getProvider } from './providers/index.js';
import type { SteelConfig } from './config.js';
import { renderTemplate } from './template.js';
import { log } from './utils.js';

export type Verdict = 'approve' | 'revise';

export interface GaugeResult {
  verdict: Verdict;
  feedback: string;
  rawOutput: string;
  stage: string;
  iteration: number;
}

export interface GaugeContext {
  stage: string;
  iteration: number;
  forgeOutput: string;
  specContent?: string;
  planContent?: string;
  constitution?: string;
  projectRoot: string;
}

export async function gaugeReview(
  config: SteelConfig,
  ctx: GaugeContext,
): Promise<GaugeResult> {
  const provider = getProvider(config.gauge.provider);

  const vars: Record<string, string> = {
    STAGE: ctx.stage,
    ITERATION: String(ctx.iteration),
    FORGE_OUTPUT: ctx.forgeOutput,
    SPEC: ctx.specContent ?? '',
    PLAN: ctx.planContent ?? '',
    CONSTITUTION: ctx.constitution ?? '',
  };

  const promptName = stageToReviewName(ctx.stage);
  let prompt: string;
  try {
    prompt = await renderTemplate(
      'prompts/gauge',
      promptName,
      vars,
      ctx.projectRoot,
    );
  } catch {
    prompt = buildFallbackReviewPrompt(ctx);
  }

  log.step(
    `Gauge (${provider.name}) reviewing: ${ctx.stage} iteration ${ctx.iteration}`,
  );
  log.info('Waiting for LLM review response...');

  const rawOutput = await provider.invoke(prompt, {
    model: config.gauge.model,
    workingDir: ctx.projectRoot,
  });

  log.success(`Gauge completed: ${ctx.stage} iteration ${ctx.iteration}`);

  const { verdict, feedback } = parseVerdict(rawOutput);

  log.info(
    `Gauge verdict: ${verdict === 'approve' ? '✓ APPROVE' : '✗ REVISE'}`,
  );

  return {
    verdict,
    feedback,
    rawOutput,
    stage: ctx.stage,
    iteration: ctx.iteration,
  };
}

function parseVerdict(output: string): { verdict: Verdict; feedback: string } {
  const lines = output.trim().split('\n');

  // Scan last 10 lines for VERDICT pattern
  const searchLines = lines.slice(-10);
  for (let i = searchLines.length - 1; i >= 0; i--) {
    const line = searchLines[i].trim().toUpperCase();
    if (line.includes('VERDICT:')) {
      if (line.includes('APPROVE')) {
        const verdictIdx = lines.length - (searchLines.length - i);
        return {
          verdict: 'approve',
          feedback: lines.slice(0, verdictIdx).join('\n').trim(),
        };
      }
      if (line.includes('REVISE')) {
        const verdictIdx = lines.length - (searchLines.length - i);
        return {
          verdict: 'revise',
          feedback: lines.slice(0, verdictIdx).join('\n').trim(),
        };
      }
    }
  }

  // No verdict found — treat as revise with the full output as feedback
  log.warn('No VERDICT line found in Gauge output, treating as REVISE');
  return {
    verdict: 'revise',
    feedback: output.trim(),
  };
}

function stageToReviewName(stage: string): string {
  const map: Record<string, string> = {
    constitution: 'review-spec',
    specification: 'review-spec',
    clarification: 'review-spec',
    planning: 'review-plan',
    task_breakdown: 'review-plan',
    implementation: 'review-code',
    validation: 'review-tests',
  };
  return map[stage] ?? 'review-spec';
}

function buildFallbackReviewPrompt(ctx: GaugeContext): string {
  const parts: string[] = [];

  parts.push(`You are the Gauge — the inspector agent in a dual-agent development workflow.`);
  parts.push(`Your role is to critically review the Forge's output and either approve it or request revisions.`);
  parts.push(`\nCurrent stage: ${ctx.stage}, iteration: ${ctx.iteration}`);

  if (ctx.constitution) {
    parts.push(`\n## Project Constitution\n${ctx.constitution}`);
  }
  if (ctx.specContent) {
    parts.push(`\n## Specification\n${ctx.specContent}`);
  }
  if (ctx.planContent) {
    parts.push(`\n## Plan\n${ctx.planContent}`);
  }

  parts.push(`\n## Forge Output to Review\n${ctx.forgeOutput}`);

  parts.push(`\n## Review Instructions`);
  parts.push(`1. Evaluate the output for completeness, correctness, and quality`);
  parts.push(`2. Check for inconsistencies, missing edge cases, or logical errors`);
  parts.push(`3. Provide specific, actionable feedback`);
  parts.push(`4. End your review with EXACTLY one of these lines:`);
  parts.push(`   VERDICT: APPROVE`);
  parts.push(`   VERDICT: REVISE`);

  return parts.join('\n');
}
