import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getSteelDir, getSpecsDir, getSpecDir, loadConfig } from './config.js';
import type { SteelConfig } from './config.js';
import type { WorkflowState, StageName } from './workflow.js';
import { isPlaceholderConstitution } from './utils.js';
import {
  renderGeminiCommandToml,
  renderCodexSkill,
} from './command-installer.js';
import { STEEL_KIT_ROOT } from './utils.js';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Diagnostic {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  summary: string;
  details?: string;
  remediation?: string;
}

export interface DoctorResult {
  status: 'pass' | 'warn' | 'fail';
  diagnostics: Diagnostic[];
  counts: { pass: number; warn: number; fail: number };
}

// ---------------------------------------------------------------------------
// Severity matrix (FR-27) — single source of truth
// ---------------------------------------------------------------------------

const SEVERITY_MATRIX: Record<string, 'warn' | 'fail'> = {
  'init-steel-dir': 'fail',
  'init-config': 'fail',
  'init-constitution': 'fail',
  'init-gitignore': 'warn',
  'init-state-corrupt': 'fail',
  'constitution-ready': 'fail',
  'drift-specid-branch': 'fail',
  'drift-state-branch': 'warn',
  'drift-specid-dir': 'fail',
  'drift-branch-state-branch': 'warn',
  'stage-files-prior': 'fail',
  'stage-files-current': 'warn',
  'state-recovery': 'warn',
  'canonical-commands': 'fail',
  'canonical-prompts': 'warn',
  'canonical-templates': 'warn',
  'surface-missing': 'fail',
  'surface-stale': 'warn',
  'provider-configured': 'fail',
  'provider-unconfigured': 'warn',
  'provider-auth': 'warn',
};

function severity(id: string): 'warn' | 'fail' {
  return SEVERITY_MATRIX[id] ?? 'warn';
}

// ---------------------------------------------------------------------------
// Stage file prerequisites (FR-7) — cumulative
// ---------------------------------------------------------------------------

const STAGE_ORDER: StageName[] = [
  'specification',
  'clarification',
  'planning',
  'task_breakdown',
  'implementation',
  'validation',
  'retrospect',
];

const STAGE_FILE_MAP: Record<string, string> = {
  specification: 'spec.md',
  clarification: 'clarifications.md',
  planning: 'plan.md',
  task_breakdown: 'tasks.md',
  // implementation has no primary output file
  validation: 'validation.md',
  retrospect: 'retrospect.md',
};

function getRequiredFiles(stage: StageName): string[] {
  const files: string[] = [];
  for (const s of STAGE_ORDER) {
    const f = STAGE_FILE_MAP[s];
    if (f) files.push(f);
    if (s === stage) break;
  }
  return files;
}

// ---------------------------------------------------------------------------
// Provider env vars (FR-17)
// ---------------------------------------------------------------------------

const PROVIDER_CLI: Record<string, string> = {
  claude: 'claude',
  gemini: 'gemini',
  codex: 'codex',
};

const PROVIDER_ENV_VARS: Record<string, string[]> = {
  claude: ['ANTHROPIC_API_KEY'],
  codex: ['CODEX_API_KEY', 'OPENAI_API_KEY'],
  gemini: ['GEMINI_API_KEY'],
};

// ---------------------------------------------------------------------------
// Helper: check if a binary is on PATH
// ---------------------------------------------------------------------------

async function isOnPath(name: string): Promise<boolean> {
  try {
    await execFileAsync('which', [name]);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: get current git branch (tolerates non-git repos)
// ---------------------------------------------------------------------------

async function safeGetBranch(projectRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: projectRoot },
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: list git tags matching a pattern
// ---------------------------------------------------------------------------

async function safeListTags(
  projectRoot: string,
  pattern: string,
): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('git', ['tag', '-l', pattern], {
      cwd: projectRoot,
    });
    return stdout
      .trim()
      .split('\n')
      .filter((t) => t.length > 0);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Check implementations
// ---------------------------------------------------------------------------

function checkInitStructure(projectRoot: string): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const steelDir = getSteelDir(projectRoot);

  const checks: Array<{ id: string; path: string; label: string }> = [
    { id: 'init-steel-dir', path: steelDir, label: '.steel/ directory' },
    {
      id: 'init-config',
      path: resolve(steelDir, 'config.json'),
      label: '.steel/config.json',
    },
    {
      id: 'init-constitution',
      path: resolve(steelDir, 'constitution.md'),
      label: '.steel/constitution.md',
    },
    {
      id: 'init-gitignore',
      path: resolve(steelDir, '.gitignore'),
      label: '.steel/.gitignore',
    },
  ];

  for (const { id, path, label } of checks) {
    if (existsSync(path)) {
      diags.push({ id, status: 'pass', summary: `${label} exists` });
    } else {
      diags.push({
        id,
        status: severity(id),
        summary: `${label} missing`,
        remediation: 'Run `steel init` to initialize the project.',
      });
    }
  }

  return diags;
}

async function checkStateCorrupt(projectRoot: string): Promise<Diagnostic[]> {
  const statePath = resolve(getSteelDir(projectRoot), 'state.json');
  if (!existsSync(statePath)) return []; // Absence handled by state-recovery check
  try {
    const raw = await readFile(statePath, 'utf-8');
    JSON.parse(raw);
    return []; // Valid — no diagnostic needed
  } catch {
    return [
      {
        id: 'init-state-corrupt',
        status: 'fail',
        summary: '.steel/state.json exists but is not valid JSON',
        remediation:
          'Delete `.steel/state.json` and run any `steel` command to recover from artifacts.',
      },
    ];
  }
}

async function checkConstitution(projectRoot: string): Promise<Diagnostic[]> {
  const path = resolve(getSteelDir(projectRoot), 'constitution.md');
  if (!existsSync(path)) return []; // Already flagged by init check
  const content = await readFile(path, 'utf-8');
  if (isPlaceholderConstitution(content)) {
    return [
      {
        id: 'constitution-ready',
        status: 'fail',
        summary: 'Constitution is still a placeholder template',
        remediation:
          'Run `steel constitution` or manually edit `.steel/constitution.md`.',
      },
    ];
  }
  return [
    {
      id: 'constitution-ready',
      status: 'pass',
      summary: 'Constitution is ready',
    },
  ];
}

async function checkDrift(
  projectRoot: string,
  state: WorkflowState | null,
  config: SteelConfig | null,
): Promise<Diagnostic[]> {
  if (!state || !state.specId) return [];
  const diags: Diagnostic[] = [];

  const gitBranch = await safeGetBranch(projectRoot);
  const expectedBranch = `spec/${state.specId}`;

  // state.branch vs spec/<specId>
  if (state.branch && state.branch !== expectedBranch) {
    diags.push({
      id: 'drift-branch-state-branch',
      status: severity('drift-branch-state-branch'),
      summary: `state.branch (${state.branch}) differs from expected spec/${state.specId}`,
      details: `state.branch is "${state.branch}" but specId "${state.specId}" implies branch "${expectedBranch}"`,
    });
  }

  if (gitBranch) {
    // state.specId vs git branch
    if (gitBranch.startsWith('spec/')) {
      const gitSpecId = gitBranch.slice('spec/'.length);
      if (gitSpecId !== state.specId) {
        diags.push({
          id: 'drift-specid-branch',
          status: severity('drift-specid-branch'),
          summary: `state.specId (${state.specId}) does not match git branch (${gitBranch})`,
          remediation: `Switch to branch "${expectedBranch}" or update state.`,
        });
      }
    }

    // current git branch vs state.branch
    if (state.branch && gitBranch !== state.branch) {
      diags.push({
        id: 'drift-state-branch',
        status: severity('drift-state-branch'),
        summary: `Current branch (${gitBranch}) differs from state.branch (${state.branch})`,
        remediation: `Switch to branch "${state.branch}" to resume the workflow.`,
      });
    }
  }

  // specId set but spec directory missing
  if (config) {
    const specDir = getSpecDir(projectRoot, config, state.specId);
    if (!existsSync(specDir)) {
      diags.push({
        id: 'drift-specid-dir',
        status: severity('drift-specid-dir'),
        summary: `Spec directory for "${state.specId}" does not exist`,
        details: `Expected: ${specDir}`,
        remediation: 'The specId in state.json points to a missing spec directory.',
      });
    }
  }

  // If no drift issues, report pass for the category
  if (diags.length === 0) {
    diags.push({
      id: 'drift-specid-branch',
      status: 'pass',
      summary: 'State, branch, and spec directory are consistent',
    });
  }

  return diags;
}

async function checkStageFiles(
  projectRoot: string,
  state: WorkflowState | null,
  config: SteelConfig | null,
): Promise<Diagnostic[]> {
  if (!state || !state.specId || !config) return [];
  const diags: Diagnostic[] = [];
  const specDir = getSpecDir(projectRoot, config, state.specId);
  if (!existsSync(specDir)) return []; // Handled by drift check

  const requiredFiles = getRequiredFiles(state.currentStage);

  for (const file of requiredFiles) {
    const filePath = resolve(specDir, file);
    const stageForFile = Object.entries(STAGE_FILE_MAP).find(
      ([, f]) => f === file,
    )?.[0] as StageName | undefined;

    if (existsSync(filePath)) {
      diags.push({
        id: 'stage-files-prior',
        status: 'pass',
        summary: `${file} exists`,
      });
    } else {
      // Is this a file for a prior completed stage or the current stage?
      const isCurrentStage = stageForFile === state.currentStage;
      const id = isCurrentStage ? 'stage-files-current' : 'stage-files-prior';
      diags.push({
        id,
        status: severity(id),
        summary: `${file} missing in spec directory`,
        details: isCurrentStage
          ? `${state.currentStage} stage is in progress — file may not be produced yet`
          : `File should exist from a prior completed stage`,
        remediation: isCurrentStage
          ? undefined
          : `Re-run the stage that produces ${file}.`,
      });
    }
  }

  return diags;
}

async function checkStateRecovery(
  projectRoot: string,
  config: SteelConfig | null,
): Promise<Diagnostic[]> {
  const statePath = resolve(getSteelDir(projectRoot), 'state.json');
  if (existsSync(statePath)) return []; // State exists, recovery not needed

  const tags = await safeListTags(projectRoot, 'steel/*-complete');
  let hasSpecFiles = false;

  if (config) {
    const specsDir = getSpecsDir(projectRoot, config);
    if (existsSync(specsDir)) {
      try {
        const entries = await readdir(specsDir);
        for (const entry of entries) {
          const specDir = resolve(specsDir, entry);
          for (const file of Object.values(STAGE_FILE_MAP)) {
            if (existsSync(resolve(specDir, file))) {
              hasSpecFiles = true;
              break;
            }
          }
          if (hasSpecFiles) break;
        }
      } catch {
        // ignore readdir errors
      }
    }
  }

  if (tags.length > 0 || hasSpecFiles) {
    return [
      {
        id: 'state-recovery',
        status: 'warn',
        summary:
          'state.json missing but recoverable — run any `steel` command to trigger automatic recovery',
      },
    ];
  }

  return [];
}

async function checkCanonicalSources(): Promise<Diagnostic[]> {
  const diags: Diagnostic[] = [];
  const commandsDir = resolve(STEEL_KIT_ROOT, 'resources', 'commands');

  if (!existsSync(commandsDir)) {
    diags.push({
      id: 'canonical-commands',
      status: 'fail',
      summary: 'resources/commands/ directory missing from Steel-Kit installation',
      remediation: 'Reinstall Steel-Kit.',
    });
  } else {
    try {
      const files = (await readdir(commandsDir)).filter(
        (f) => f.startsWith('steel-') && f.endsWith('.md'),
      );
      if (files.length === 0) {
        diags.push({
          id: 'canonical-commands',
          status: 'fail',
          summary: 'resources/commands/ contains no steel-*.md files',
          remediation: 'Reinstall Steel-Kit.',
        });
      } else {
        diags.push({
          id: 'canonical-commands',
          status: 'pass',
          summary: `resources/commands/ has ${files.length} canonical command file(s)`,
        });
      }
    } catch {
      diags.push({
        id: 'canonical-commands',
        status: 'fail',
        summary: 'Failed to read resources/commands/',
        remediation: 'Reinstall Steel-Kit.',
      });
    }
  }

  // prompts/ and templates/ — installation health (not staleness inputs)
  for (const [dir, id] of [
    ['prompts', 'canonical-prompts'],
    ['templates', 'canonical-templates'],
  ] as const) {
    const path = resolve(STEEL_KIT_ROOT, dir);
    if (existsSync(path)) {
      diags.push({ id, status: 'pass', summary: `${dir}/ directory exists` });
    } else {
      diags.push({
        id,
        status: severity(id),
        summary: `${dir}/ directory missing from Steel-Kit installation`,
        remediation: 'Reinstall Steel-Kit.',
      });
    }
  }

  return diags;
}

async function checkSurfaces(projectRoot: string): Promise<Diagnostic[]> {
  const diags: Diagnostic[] = [];
  const commandsDir = resolve(STEEL_KIT_ROOT, 'resources', 'commands');

  if (!existsSync(commandsDir)) return []; // Already flagged by canonical check

  let commandFiles: string[];
  try {
    commandFiles = (await readdir(commandsDir))
      .filter((f) => f.startsWith('steel-') && f.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }

  if (commandFiles.length === 0) return [];

  for (const file of commandFiles) {
    const stem = file.replace(/\.md$/, '');
    let canonicalContent: string;
    try {
      canonicalContent = await readFile(resolve(commandsDir, file), 'utf-8');
    } catch {
      continue;
    }

    // Claude Code: direct copy
    const claudePath = resolve(projectRoot, '.claude', 'commands', file);
    await checkSurfaceFile(
      diags,
      claudePath,
      canonicalContent,
      `Claude command ${file}`,
    );

    // Gemini CLI: TOML render
    const geminiPath = resolve(
      projectRoot,
      '.gemini',
      'commands',
      file.replace(/\.md$/, '.toml'),
    );
    const expectedGemini = renderGeminiCommandToml(file, canonicalContent);
    await checkSurfaceFile(
      diags,
      geminiPath,
      expectedGemini,
      `Gemini command ${stem}.toml`,
    );

    // Codex: SKILL.md render
    const codexPath = resolve(
      projectRoot,
      '.agents',
      'skills',
      stem,
      'SKILL.md',
    );
    const expectedCodex = renderCodexSkill(file, canonicalContent);
    await checkSurfaceFile(
      diags,
      codexPath,
      expectedCodex,
      `Codex skill ${stem}/SKILL.md`,
    );
  }

  return diags;
}

async function checkSurfaceFile(
  diags: Diagnostic[],
  filePath: string,
  expectedContent: string,
  label: string,
): Promise<void> {
  if (!existsSync(filePath)) {
    diags.push({
      id: 'surface-missing',
      status: severity('surface-missing'),
      summary: `${label} is missing`,
      remediation: 'Run `steel update` to regenerate agent surfaces.',
    });
    return;
  }

  try {
    const actual = await readFile(filePath, 'utf-8');
    // Normalize line endings for comparison
    const normalizedActual = actual.replace(/\r\n/g, '\n');
    const normalizedExpected = expectedContent.replace(/\r\n/g, '\n');

    if (normalizedActual !== normalizedExpected) {
      diags.push({
        id: 'surface-stale',
        status: severity('surface-stale'),
        summary: `${label} is stale (differs from canonical source)`,
        remediation: 'Run `steel update` to regenerate agent surfaces.',
      });
    }
    // pass diagnostics omitted for surfaces to reduce noise — only report problems
  } catch {
    diags.push({
      id: 'surface-stale',
      status: severity('surface-stale'),
      summary: `${label} could not be read for comparison`,
      remediation: 'Run `steel update` to regenerate agent surfaces.',
    });
  }
}

async function checkProviders(
  config: SteelConfig | null,
): Promise<Diagnostic[]> {
  const diags: Diagnostic[] = [];
  const allProviders = ['claude', 'gemini', 'codex'];

  const configuredSet = new Set<string>();
  if (config) {
    configuredSet.add(config.forge.provider);
    configuredSet.add(config.gauge.provider);
  }

  for (const provider of allProviders) {
    const cliName = PROVIDER_CLI[provider];
    const onPath = await isOnPath(cliName);
    const isConfigured = configuredSet.has(provider);

    if (onPath) {
      diags.push({
        id: isConfigured ? 'provider-configured' : 'provider-unconfigured',
        status: 'pass',
        summary: `${provider} CLI (${cliName}) is available`,
      });
    } else if (isConfigured) {
      diags.push({
        id: 'provider-configured',
        status: 'fail',
        summary: `Configured provider ${provider} CLI (${cliName}) not found on PATH`,
        remediation: `Install ${cliName} or change the configured provider.`,
      });
    } else {
      diags.push({
        id: 'provider-unconfigured',
        status: 'warn',
        summary: `${provider} CLI (${cliName}) not found on PATH`,
        details: 'Not currently configured as Forge or Gauge, but needed for full surface parity.',
        remediation: `Install ${cliName} for full provider surface support.`,
      });
    }
  }

  return diags;
}

function checkAuth(config: SteelConfig | null): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const allProviders = ['claude', 'gemini', 'codex'];

  for (const provider of allProviders) {
    const envVars = PROVIDER_ENV_VARS[provider];
    const hasAny = envVars.some((v) => !!process.env[v]);

    if (hasAny) {
      diags.push({
        id: 'provider-auth',
        status: 'pass',
        summary: `${provider} auth environment variable is set`,
      });
    } else {
      diags.push({
        id: 'provider-auth',
        status: 'warn',
        summary: `${provider} auth environment variable not set (${envVars.join(' or ')})`,
        details: 'Subscription or account-based auth may still work.',
      });
    }
  }

  return diags;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runDoctor(projectRoot: string): Promise<DoctorResult> {
  const diagnostics: Diagnostic[] = [];

  // Phase 1: Init structure
  const initDiags = checkInitStructure(projectRoot);
  diagnostics.push(...initDiags);

  const steelDirExists = initDiags.some(
    (d) => d.id === 'init-steel-dir' && d.status === 'pass',
  );

  // If .steel/ doesn't exist, skip all downstream checks
  if (!steelDirExists) {
    return aggregateResult(diagnostics);
  }

  // Phase 1b: State corruption
  diagnostics.push(...(await checkStateCorrupt(projectRoot)));
  const stateCorrupt = diagnostics.some(
    (d) => d.id === 'init-state-corrupt',
  );

  // Phase 2: Constitution
  diagnostics.push(...(await checkConstitution(projectRoot)));

  // Load config (gracefully)
  let config: SteelConfig | null = null;
  try {
    config = await loadConfig(projectRoot);
  } catch {
    // Config load failure already reflected by init-config check
  }

  // Load state (gracefully)
  let state: WorkflowState | null = null;
  if (!stateCorrupt) {
    const statePath = resolve(getSteelDir(projectRoot), 'state.json');
    if (existsSync(statePath)) {
      try {
        const raw = await readFile(statePath, 'utf-8');
        state = JSON.parse(raw);
      } catch {
        // Already flagged by state-corrupt check
      }
    }
  }

  // Phase 3: Drift + stage files + recovery
  diagnostics.push(...(await checkDrift(projectRoot, state, config)));
  diagnostics.push(...(await checkStageFiles(projectRoot, state, config)));
  diagnostics.push(...(await checkStateRecovery(projectRoot, config)));

  // Phase 4: Canonical sources + surfaces
  diagnostics.push(...(await checkCanonicalSources()));
  diagnostics.push(...(await checkSurfaces(projectRoot)));

  // Phase 5: Providers + auth
  diagnostics.push(...(await checkProviders(config)));
  diagnostics.push(...checkAuth(config));

  return aggregateResult(diagnostics);
}

function aggregateResult(diagnostics: Diagnostic[]): DoctorResult {
  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const d of diagnostics) {
    counts[d.status]++;
  }
  const status: DoctorResult['status'] =
    counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : 'pass';
  return { status, diagnostics, counts };
}
