import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, getSteelDir } from '../src/config.js';
import {
  loadState,
  saveState,
  runForgeGaugeLoop,
  advanceStage,
} from '../src/workflow.js';
import { initBranch } from '../src/git-ops.js';
import { log, die } from '../src/utils.js';

export async function cmdSpecify(description: string): Promise<void> {
  log.step(`Starting specification: "${description}"`);
  const projectRoot = process.cwd();
  log.info('Loading config and state...');
  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  if (
    state.currentStage !== 'specification' &&
    state.stages.specification.status !== 'pending'
  ) {
    die(
      `Cannot specify: current stage is '${state.currentStage}'. Expected 'specification'.`,
    );
  }

  // Generate spec ID from description
  const specId = generateSpecId(projectRoot, description);
  state.specId = specId;
  state.description = description;

  // Create feature branch
  try {
    await initBranch(specId, projectRoot);
    state.branch = `spec/${specId}`;
  } catch {
    log.warn('Could not create branch (may already exist), continuing on current branch');
  }

  state.currentStage = 'specification';
  await saveState(projectRoot, state);

  // Load constitution
  log.info('Loading constitution...');
  const constitutionPath = resolve(getSteelDir(projectRoot), 'constitution.md');
  const constitution = existsSync(constitutionPath)
    ? await readFile(constitutionPath, 'utf-8')
    : undefined;

  // Run forge-gauge loop
  log.step('Starting Forge-Gauge specification loop...');
  await runForgeGaugeLoop(projectRoot, config, state, {
    description,
    constitution,
  });

  // Advance to clarification (requires human approval)
  log.step('Specification complete. Checking stage advancement...');
  await advanceStage(projectRoot, state, config);
}

function generateSpecId(projectRoot: string, description: string): string {
  // Count existing specs for sequential numbering
  const specsDir = resolve(projectRoot, 'specs');
  let nextNum = 1;
  if (existsSync(specsDir)) {
    const entries = readdirSync(specsDir);
    const nums = entries
      .map((e) => parseInt(e.split('-')[0], 10))
      .filter((n) => !isNaN(n));
    if (nums.length > 0) {
      nextNum = Math.max(...nums) + 1;
    }
  }

  // Create semantic name from description
  const semantic = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);

  return `${String(nextNum).padStart(3, '0')}-${semantic}`;
}
