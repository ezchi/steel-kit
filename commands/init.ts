import { mkdir, writeFile, readdir, readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initConfig, getSteelDir } from '../src/config.js';
import { commitStep } from '../src/git-ops.js';
import {
  createInitialState,
  saveState,
} from '../src/workflow.js';
import { log, die, STEEL_KIT_ROOT } from '../src/utils.js';
import { getProvider } from '../src/providers/index.js';

const PLACEHOLDER_CONSTITUTION = `# Project Constitution

## Governing Principles
<!-- Define the core principles that guide development decisions -->

## Technology Stack
<!-- List the primary languages, frameworks, and tools -->

## Coding Standards
<!-- Define style, naming conventions, and code organization rules -->

## Development Guidelines
<!-- Define workflow rules: branching, testing, review requirements -->

## Constraints
<!-- List hard constraints: performance budgets, compatibility targets, etc. -->
`;

export async function cmdInit(): Promise<void> {
  const projectRoot = process.cwd();
  const steelDir = getSteelDir(projectRoot);

  if (existsSync(steelDir)) {
    die('.steel/ directory already exists. Project is already initialized.');
  }

  log.info('Initializing Steel-Kit...');

  // Create directory structure
  log.info('Creating .steel/ directory...');
  await mkdir(steelDir, { recursive: true });

  // Create .steel/.gitignore to exclude ephemeral working state
  const steelGitignore = resolve(steelDir, '.gitignore');
  await writeFile(
    steelGitignore,
    `# Ephemeral working state — do not commit
state.json
tasks.json
`,
  );

  // Interactive config setup
  const config = await initConfig(projectRoot);

  // Verify providers are available
  log.info('Checking LLM provider availability...');
  const forgeProvider = getProvider(config.forge.provider);
  const gaugeProvider = getProvider(config.gauge.provider);

  const forgeOk = await forgeProvider.check();
  const gaugeOk = await gaugeProvider.check();

  if (!forgeOk) {
    log.warn(
      `Forge provider '${config.forge.provider}' CLI not found or not authenticated. Set up auth before running 'steel specify'.`,
    );
  }
  if (!gaugeOk) {
    log.warn(
      `Gauge provider '${config.gauge.provider}' CLI not found or not authenticated. Set up auth before running 'steel specify'.`,
    );
  }

  // Initialize workflow state
  const state = createInitialState();

  // Create placeholder constitution
  const constitutionPath = resolve(steelDir, 'constitution.md');
  await writeFile(constitutionPath, PLACEHOLDER_CONSTITUTION);
  log.success('Created .steel/constitution.md (edit this to define your project principles)');

  // Install Claude Code slash commands
  await installSlashCommands(projectRoot);

  // Mark constitution stage complete, ready for specification
  state.stages.constitution.status = 'complete';
  state.stages.constitution.completedAt = new Date().toISOString();
  state.currentStage = 'specification';
  state.stages.specification.status = 'pending';
  await saveState(projectRoot, state);

  // Git commit
  log.info('Committing initialization...');
  if (config.autoCommit) {
    await commitStep(
      'steel',
      'init',
      1,
      'initialize project',
      projectRoot,
    );
  }

  log.success('Steel-Kit initialized!');
  log.info('Next steps:');
  log.info('  1. Set up LLM auth (e.g. ANTHROPIC_API_KEY, GEMINI_API_KEY, or login)');
  log.info('  2. Run: steel constitution  (generate project principles via LLM)');
  log.info('     Or edit .steel/constitution.md manually');
  log.info('  3. Run: steel specify "<feature description>"');
}

async function installSlashCommands(projectRoot: string): Promise<void> {
  const sourceDir = resolve(STEEL_KIT_ROOT, '.claude', 'commands');
  const targetDir = resolve(projectRoot, '.claude', 'commands');

  if (!existsSync(sourceDir)) {
    log.warn('Slash command source directory not found, skipping installation.');
    return;
  }

  log.info('Installing Claude Code slash commands to .claude/commands/...');
  await mkdir(targetDir, { recursive: true });

  const files = await readdir(sourceDir);
  const steelFiles = files.filter((f) => f.startsWith('steel-') && f.endsWith('.md'));

  let installed = 0;
  for (const file of steelFiles) {
    const sourcePath = resolve(sourceDir, file);
    const targetPath = resolve(targetDir, file);

    // Always overwrite to ensure latest version
    await copyFile(sourcePath, targetPath);
    installed++;
  }

  log.success(`Installed ${installed} slash commands (e.g. /steel-specify, /steel-status)`);
}
