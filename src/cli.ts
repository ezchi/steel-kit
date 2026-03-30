#!/usr/bin/env node

import { Command } from 'commander';
import { cmdInit } from '../commands/init.js';
import { cmdConstitution } from '../commands/constitution.js';
import { cmdSpecify } from '../commands/specify.js';
import { cmdClarify } from '../commands/clarify.js';
import { cmdPlan } from '../commands/plan.js';
import { cmdTasks } from '../commands/tasks.js';
import { cmdImplement } from '../commands/implement.js';
import { cmdValidate } from '../commands/validate.js';
import { cmdStatus } from '../commands/status.js';
import { cmdNext } from '../commands/next.js';
import { cmdRunAll } from '../commands/run-all.js';
import { cmdUpdate } from '../commands/update.js';
import { cmdClean } from '../commands/clean.js';

const program = new Command();

program
  .name('steel')
  .description('Dual-agent AI development framework')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize Steel-Kit in the current project')
  .action(cmdInit);

program
  .command('constitution')
  .description('Generate project constitution via the Forge LLM')
  .argument('[prompt]', 'Optional guidance for constitution generation')
  .action(cmdConstitution);

program
  .command('specify')
  .description('Create a specification from a feature description')
  .argument('<description>', 'Feature description')
  .action(cmdSpecify);

program
  .command('clarify')
  .description('Run clarification on the current specification')
  .action(cmdClarify);

program
  .command('plan')
  .description('Generate an implementation plan')
  .action(cmdPlan);

program
  .command('tasks')
  .description('Break the plan into ordered tasks')
  .action(cmdTasks);

program
  .command('implement')
  .description('Run the implementation loop')
  .action(cmdImplement);

program
  .command('validate')
  .description('Run validation and testing')
  .action(cmdValidate);

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
  .description('Update slash commands to latest version')
  .action(cmdUpdate);

program
  .command('clean')
  .description('Remove artifacts and reset workflow state')
  .action(cmdClean);

program.parse();
