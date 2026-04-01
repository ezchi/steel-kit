import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { select } from '@inquirer/prompts';
import { parse as parseYaml } from 'yaml';
import { log } from './utils.js';

export interface ProviderConfig {
  provider: string;
  model?: string;
}

export interface SteelConfig {
  forge: ProviderConfig;
  gauge: ProviderConfig;
  maxIterations: number;
  autoCommit: boolean;
  specsDir: string;
}

const DEFAULT_CONFIG: SteelConfig = {
  forge: { provider: 'claude' },
  gauge: { provider: 'gemini' },
  maxIterations: 5,
  autoCommit: true,
  specsDir: 'specs',
};

const PROVIDERS = ['claude', 'gemini', 'codex'];

export function getSteelDir(projectRoot: string): string {
  return resolve(projectRoot, '.steel');
}

export function getSpecsDir(projectRoot: string, config: SteelConfig): string {
  return resolve(projectRoot, config.specsDir);
}

export function getSpecDir(
  projectRoot: string,
  config: SteelConfig,
  specId: string,
): string {
  return resolve(getSpecsDir(projectRoot, config), specId);
}

export function getConfigPath(projectRoot: string): string {
  return resolve(getSteelDir(projectRoot), 'config.json');
}

export async function loadConfig(projectRoot: string): Promise<SteelConfig> {
  let config = { ...DEFAULT_CONFIG };

  // Try loading steel.config.yaml from project root
  const yamlPath = resolve(projectRoot, 'steel.config.yaml');
  if (existsSync(yamlPath)) {
    try {
      const raw = await readFile(yamlPath, 'utf-8');
      const parsed = parseYaml(raw);
      config = mergeConfig(config, parsed);
    } catch {
      log.warn('Failed to parse steel.config.yaml, using defaults');
    }
  }

  // Try loading .steel/config.json (overrides yaml)
  const jsonPath = getConfigPath(projectRoot);
  if (existsSync(jsonPath)) {
    try {
      const raw = await readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw);
      config = mergeConfig(config, parsed);
    } catch {
      log.warn('Failed to parse .steel/config.json, using defaults');
    }
  }

  // Environment variable overrides
  if (process.env.STEEL_FORGE_PROVIDER) {
    config.forge.provider = process.env.STEEL_FORGE_PROVIDER;
  }
  if (process.env.STEEL_FORGE_MODEL) {
    config.forge.model = process.env.STEEL_FORGE_MODEL;
  }
  if (process.env.STEEL_GAUGE_PROVIDER) {
    config.gauge.provider = process.env.STEEL_GAUGE_PROVIDER;
  }
  if (process.env.STEEL_GAUGE_MODEL) {
    config.gauge.model = process.env.STEEL_GAUGE_MODEL;
  }
  if (process.env.STEEL_MAX_ITERATIONS) {
    config.maxIterations = parseInt(process.env.STEEL_MAX_ITERATIONS, 10);
  }

  return config;
}

function mergeConfig(base: SteelConfig, override: Partial<any>): SteelConfig {
  return {
    forge: {
      ...base.forge,
      ...(override.forge ?? {}),
    },
    gauge: {
      ...base.gauge,
      ...(override.gauge ?? {}),
    },
    maxIterations: override.maxIterations ?? base.maxIterations,
    autoCommit: override.autoCommit ?? base.autoCommit,
    specsDir: override.specsDir ?? base.specsDir,
  };
}

export async function initConfig(
  projectRoot: string,
  opts?: { skipWrite?: boolean },
): Promise<SteelConfig> {
  const forgeProvider = await select({
    message: 'Select Forge (primary) LLM provider:',
    choices: PROVIDERS.map((p) => ({ name: p, value: p })),
  });

  const gaugeProvider = await select({
    message: 'Select Gauge (inspector) LLM provider:',
    choices: PROVIDERS.map((p) => ({ name: p, value: p })),
  });

  const config: SteelConfig = {
    ...DEFAULT_CONFIG,
    forge: { provider: forgeProvider },
    gauge: { provider: gaugeProvider },
  };

  if (!opts?.skipWrite) {
    const steelDir = getSteelDir(projectRoot);
    await mkdir(steelDir, { recursive: true });
    await writeFile(getConfigPath(projectRoot), JSON.stringify(config, null, 2));
    log.success(`Config saved to .steel/config.json`);
  } else {
    log.info('Skipped overwriting .steel/config.json');
  }

  return config;
}

export async function saveConfig(
  projectRoot: string,
  config: SteelConfig,
): Promise<void> {
  const steelDir = getSteelDir(projectRoot);
  await mkdir(steelDir, { recursive: true });
  await writeFile(getConfigPath(projectRoot), JSON.stringify(config, null, 2));
}
