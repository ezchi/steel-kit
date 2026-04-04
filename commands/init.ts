import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { input } from '@inquirer/prompts';
import { type SteelConfig, initConfig, getSteelDir, getConfigPath } from '../src/config.js';
import { validateBranchName, validateBranchPrefix } from '../src/git-config.js';
import { installProjectCommands } from '../src/command-installer.js';
import { commitStep } from '../src/git-ops.js';
import {
  createInitialState,
  saveState,
} from '../src/workflow.js';
import { log, confirm } from '../src/utils.js';
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

  const reinit = existsSync(steelDir);

  log.info(reinit ? 'Re-initializing Steel-Kit...' : 'Initializing Steel-Kit...');

  // Create directory structure
  if (!reinit) {
    log.info('Creating .steel/ directory...');
  }
  await mkdir(steelDir, { recursive: true });

  // Create .steel/.gitignore to exclude ephemeral working state
  const steelGitignore = resolve(steelDir, '.gitignore');
  if (await shouldWriteFile(steelGitignore)) {
    await writeFile(
      steelGitignore,
      `# Ephemeral working state — do not commit
state.json
tasks.json
`,
    );
  }

  // Interactive config setup
  const configPath = getConfigPath(projectRoot);

  // Use deferWrite to get provider selections without writing yet
  const baseConfig = await initConfig(projectRoot, { deferWrite: true });

  // Prompt for git config
  const gitSettings = await promptGitConfig();

  // Merge and write config — preserving existing keys on re-init
  const config = await mergeAndWriteConfig(configPath, baseConfig, gitSettings);

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
  if (await shouldWriteFile(constitutionPath)) {
    await writeFile(constitutionPath, PLACEHOLDER_CONSTITUTION);
    log.success('Created .steel/constitution.md (edit this to define your project principles)');
  }

  // Install project commands for supported CLIs
  await installSlashCommands(projectRoot);

  const statePath = resolve(steelDir, 'state.json');
  if (await shouldWriteFile(statePath)) {
    await saveState(projectRoot, state);
  }

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
  log.info('  2. Run: steel constitution  (or edit .steel/constitution.md manually)');
  log.info('  3. Review the constitution and make sure it is project-specific');
  log.info('  4. Run: steel specify "<feature description>"');
}

async function shouldWriteFile(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) return true;
  const relPath = filePath.includes('.steel/')
    ? '.steel/' + filePath.split('.steel/')[1]
    : filePath;
  log.warn(`${relPath} already exists.`);
  return confirm(`Overwrite ${relPath}?`);
}

interface GitSettings {
  baseBranch: string;
  branchPrefix: string;
}

async function promptGitConfig(): Promise<GitSettings> {
  let baseBranch: string;
  for (;;) {
    baseBranch = await input({
      message: 'Base branch for new feature branches:',
      default: 'main',
    });
    try {
      validateBranchName(baseBranch, 'baseBranch');
      break;
    } catch (err) {
      log.warn((err as Error).message + ' — please try again.');
    }
  }

  let branchPrefix: string;
  for (;;) {
    branchPrefix = await input({
      message: 'Branch prefix for spec branches:',
      default: 'spec/',
    });
    try {
      validateBranchPrefix(branchPrefix);
      break;
    } catch (err) {
      log.warn((err as Error).message + ' — please try again.');
    }
  }

  return { baseBranch, branchPrefix };
}

async function mergeAndWriteConfig(
  configPath: string,
  baseConfig: SteelConfig,
  gitSettings: GitSettings,
): Promise<SteelConfig> {
  // Start from existing config on re-init to preserve unknown keys
  let raw: Record<string, any> = {};
  if (existsSync(configPath)) {
    try {
      raw = JSON.parse(await readFile(configPath, 'utf-8'));
    } catch {
      // Corrupt file — start fresh
    }
  }

  // Apply provider selections from interactive prompts
  raw.forge = baseConfig.forge;
  raw.gauge = baseConfig.gauge;
  raw.maxIterations = raw.maxIterations ?? baseConfig.maxIterations;
  raw.autoCommit = raw.autoCommit ?? baseConfig.autoCommit;
  raw.specsDir = raw.specsDir ?? baseConfig.specsDir;

  // Apply git settings
  raw.git = {
    ...(raw.git ?? {}),
    baseBranch: gitSettings.baseBranch,
    branchPrefix: gitSettings.branchPrefix,
  };

  // Write the merged config
  const steelDir = resolve(configPath, '..');
  await mkdir(steelDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(raw, null, 2));
  log.success('Config saved to .steel/config.json');

  // Return a typed config for downstream use
  return {
    forge: raw.forge,
    gauge: raw.gauge,
    maxIterations: raw.maxIterations ?? 5,
    autoCommit: raw.autoCommit ?? true,
    specsDir: raw.specsDir ?? 'specs',
    git: raw.git,
  };
}

async function installSlashCommands(projectRoot: string): Promise<void> {
  try {
    const result = await installProjectCommands(projectRoot);
    log.success(
      `Installed commands: Claude=${result.claude}, Gemini=${result.gemini}, Codex skills=${result.codex}`,
    );
    if (result.codex > 0) {
      log.info('Codex skills were written to `.agents/skills/`.');
      log.info('In Codex, invoke them as `$steel-constitution`, `$steel-specify`, `$steel-plan`, and so on.');
    }
    for (const warning of result.warnings) {
      log.warn(`Command install warning: ${warning}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`Command installation skipped: ${message}`);
  }
}
