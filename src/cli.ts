#!/usr/bin/env node

import { Command } from 'commander';
import { killActiveProcesses } from './process-tracker.js';
import { cmdInit } from '../commands/init.js';
import { cmdStatus } from '../commands/status.js';
import { cmdNext } from '../commands/next.js';
import { cmdRunAll } from '../commands/run-all.js';
import { cmdUpdate } from '../commands/update.js';
import { cmdUpgrade } from '../commands/upgrade.js';
import { cmdClean } from '../commands/clean.js';
import { cmdDoctor } from '../commands/doctor.js';
import { cmdShowConfig } from '../commands/show-config.js';
import { cmdResolveSpecId } from '../commands/resolve-spec-id.js';
import { cmdNewSpecId } from '../commands/new-spec-id.js';
import { cmdBranchInit } from '../commands/branch-init.js';
import { cmdCommitStep } from '../commands/commit-step.js';
import { cmdTagStage } from '../commands/tag-stage.js';
import { cmdSaveArtifact } from '../commands/save-artifact.js';
import { cmdRenderPrompt } from '../commands/render-prompt.js';
import { cmdRunForge } from '../commands/run-forge.js';
import { cmdRunGauge } from '../commands/run-gauge.js';
import {
  cmdStateInit,
  cmdStateIter,
  cmdStateAdvance,
  cmdStateMark,
  cmdStateGet,
  cmdStateReset,
  cmdStateSetSkills,
} from '../commands/state.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const program = new Command();

program
  .name('steel')
  .description('Dual-agent AI development framework')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize Steel-Kit in the current project')
  .action(cmdInit);

// Per-stage workflow verbs (specify, constitution, clarify, plan, tasks,
// implement, validate, retrospect) are no longer exposed as user-facing CLI
// commands. They are driven by /steel-* slash commands via the helper CLIs
// below. For headless / CI use, run `steel run-all` (which invokes each stage
// internally through the existing modules + ClaudeProvider).

program
  .command('status')
  .description('Show current workflow status')
  .action(cmdStatus);

program
  .command('next')
  .description('Run the next stage in the workflow')
  .action(cmdNext);

program
  .command('run-all')
  .description('Run all remaining stages automatically')
  .action(cmdRunAll);

program
  .command('update')
  .description('Refresh Claude/Antigravity/Codex command files in the current project')
  .action(cmdUpdate);

program
  .command('upgrade')
  .description('Upgrade the Steel-Kit CLI to the latest npm release')
  .action(cmdUpgrade);

program
  .command('clean')
  .description('Remove artifacts and reset workflow state')
  .action(cmdClean);

program
  .command('doctor')
  .description('Diagnose project setup, workflow state, and provider health')
  .option('--json', 'Output diagnostics as JSON')
  .action(cmdDoctor);

// -- Helper subcommands invoked by /steel-* slash commands --

program
  .command('show-config')
  .description('Print resolved Steel-Kit config as JSON')
  .action(cmdShowConfig);

program
  .command('resolve-spec-id')
  .description('Print the current spec ID detected from branch or specs/ dir')
  .action(cmdResolveSpecId);

program
  .command('new-spec-id')
  .description('Generate the next spec ID for a feature description')
  .requiredOption('--description <text>', 'Feature description')
  .option('--id <value>', 'Custom spec ID prefix (e.g., Jira ticket)')
  .action((opts: { description: string; id?: string }) => cmdNewSpecId(opts));

program
  .command('branch-init')
  .description('Create a new spec branch and record state.baseBranch')
  .requiredOption('--spec-id <id>', 'Spec identifier')
  .requiredOption('--base-branch <name>', 'Branch name to record as the per-spec base')
  .option('--description <text>', 'Feature description (recorded in state)')
  .option('--from <branch>', 'Checkout this branch before forking (default: current HEAD)')
  .action((opts: { specId: string; baseBranch: string; description?: string; from?: string }) =>
    cmdBranchInit(opts),
  );

program
  .command('commit-step')
  .description('Stage and commit Steel-Kit workflow changes')
  .requiredOption('--role <role>', 'forge | gauge')
  .requiredOption('--stage <stage>', 'Stage name')
  .requiredOption('--iter <n>', 'Iteration number', (v) => parseInt(v, 10))
  .requiredOption('--msg <text>', 'Commit message body')
  .option('--paths <paths...>', 'Specific paths to stage (default: all changes)')
  .option('--force', 'Pass -f to git add (override gitignore)')
  .action((opts: { role: string; stage: string; iter: number; msg: string; paths?: string[]; force?: boolean }) => {
    if (opts.role !== 'forge' && opts.role !== 'gauge') {
      throw new Error(`Invalid --role '${opts.role}'. Must be 'forge' or 'gauge'.`);
    }
    return cmdCommitStep({
      role: opts.role,
      stage: opts.stage,
      iter: opts.iter,
      msg: opts.msg,
      paths: opts.paths,
      force: opts.force,
    });
  });

program
  .command('tag-stage')
  .description('Tag a stage as complete: steel/<specId>/<stage>-complete')
  .requiredOption('--stage <stage>', 'Stage name')
  .option('--spec-id <id>', 'Spec ID (default: from state.json)')
  .action((opts: { stage: string; specId?: string }) => cmdTagStage(opts));

program
  .command('save-artifact')
  .description('Write a Forge or Gauge artifact to the canonical artifacts path')
  .requiredOption('--stage <stage>', 'Stage name')
  .requiredOption('--iter <n>', 'Iteration number', (v) => parseInt(v, 10))
  .requiredOption('--role <role>', 'forge | gauge | forge-prompt | gauge-prompt')
  .option('--content <text>', 'Content as a literal string')
  .option('--content-file <path>', 'Read content from this file')
  .option('--spec-id <id>', 'Spec ID (default: from state.json)')
  .action((opts: { stage: string; iter: number; role: string; content?: string; contentFile?: string; specId?: string }) =>
    cmdSaveArtifact(opts as any),
  );

program
  .command('render-prompt')
  .description('Render a Forge or Gauge prompt template with all current variables substituted')
  .requiredOption('--role <role>', 'forge | gauge')
  .requiredOption('--stage <stage>', 'Stage name')
  .option('--feedback <path>', 'Prior gauge artifact (forge role)')
  .option('--review-target <path>', 'Forge artifact to review (gauge role)')
  .option('--task <path>', 'Current task description (implementation stage)')
  .option('--output <path>', 'Write rendered prompt to this file (default: stdout)')
  .option('--iteration <n>', 'Override iteration number', (v) => parseInt(v, 10))
  .option('--template <name>', 'Override role+stage→template auto-mapping (e.g. review-verification)')
  .action((opts: { role: string; stage: string; feedback?: string; reviewTarget?: string; task?: string; output?: string; iteration?: number; template?: string }) => {
    if (opts.role !== 'forge' && opts.role !== 'gauge') {
      throw new Error(`Invalid --role '${opts.role}'. Must be 'forge' or 'gauge'.`);
    }
    return cmdRenderPrompt(opts as any);
  });

program
  .command('run-forge')
  .description('Invoke the Forge LLM with a rendered prompt file')
  .requiredOption('--prompt-file <path>', 'Path to rendered prompt')
  .option('--provider <name>', 'Override config.forge.provider (claude|agy|codex)')
  .option('--output <path>', 'Write LLM output to file (default: stdout)')
  .option('--allow-edits', 'Allow the provider to write files (implementation stage)')
  .action((opts: { promptFile: string; provider?: string; output?: string; allowEdits?: boolean }) =>
    cmdRunForge(opts),
  );

program
  .command('run-gauge')
  .description('Invoke the Gauge LLM with a rendered review prompt file')
  .requiredOption('--prompt-file <path>', 'Path to rendered review prompt')
  .option('--provider <name>', 'Override config.gauge.provider (claude|agy|codex)')
  .option('--output <path>', 'Write LLM output to file (default: stdout)')
  .action((opts: { promptFile: string; provider?: string; output?: string }) =>
    cmdRunGauge(opts),
  );

// state subcommands
const stateCmd = program
  .command('state')
  .description('Manipulate .steel/state.json (used by slash commands)');

stateCmd
  .command('init')
  .description('Initialize per-spec state fields atomically')
  .requiredOption('--spec-id <id>', 'Spec identifier')
  .requiredOption('--base-branch <name>', 'Per-spec base branch to record')
  .option('--description <text>', 'Feature description')
  .option('--branch <name>', 'Spec branch name (e.g., spec/001-foo)')
  .action((opts: { specId: string; baseBranch: string; description?: string; branch?: string }) =>
    cmdStateInit(opts),
  );

stateCmd
  .command('iter')
  .description('Manage the iteration counter (--inc | --reset | --set <n>)')
  .option('--inc', 'Increment by 1')
  .option('--reset', 'Reset to 1')
  .option('--set <n>', 'Set to specific value', (v) => parseInt(v, 10))
  .action((opts: { inc?: boolean; reset?: boolean; set?: number }) => cmdStateIter(opts));

stateCmd
  .command('advance-stage')
  .description('Move currentStage forward in the workflow')
  .action(cmdStateAdvance);

stateCmd
  .command('reset')
  .description(
    'Reset state.json to a fresh specification:pending shape (does NOT touch specs/, tasks.json, or git tags — see /steel-clean for full reset)',
  )
  .action(cmdStateReset);

stateCmd
  .command('mark')
  .description('Mark a stage with a status (pending|in_progress|complete)')
  .requiredOption('--stage <stage>', 'Stage name')
  .requiredOption('--status <status>', 'pending | in_progress | complete')
  .action((opts: { stage: string; status: string }) => cmdStateMark(opts));

stateCmd
  .command('get')
  .description('Print state.json (or a specific field) as JSON')
  .option('--field <path>', 'Dotted field path (e.g., stages.planning.status)')
  .action((opts: { field?: string }) => cmdStateGet(opts));

stateCmd
  .command('set-skills')
  .description('Record the skills used in a given stage')
  .requiredOption('--stage <stage>', 'Stage name')
  .requiredOption('--skills <items...>', 'Skill names (space-separated)')
  .action((opts: { stage: string; skills: string[] }) => cmdStateSetSkills(opts));

// Kill only processes we spawned — never broad pkill
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    killActiveProcesses(sig);
    process.exit(1);
  });
}

program.parse();
