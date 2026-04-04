import {
  type SteelConfig,
  getSpecsDir,
  loadConfig,
} from '../src/config.js';
import {
  loadState,
  saveState,
  runForgeGaugeLoop,
  advanceStage,
} from '../src/workflow.js';
import { initBranch } from '../src/git-ops.js';
import { resolveGitConfig } from '../src/git-config.js';
import { generateSpecId } from '../src/spec-id.js';
import { loadConstitutionIfReady } from '../src/constitution.js';
import { log, die } from '../src/utils.js';

export async function cmdSpecify(
  description: string,
  opts?: { id?: string },
): Promise<void> {
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

  const constitution = await loadConstitutionIfReady(projectRoot);

  const gitConfig = resolveGitConfig(config);

  const specId = generateSpecId({
    projectRoot,
    specsDir: config.specsDir,
    description,
    customId: opts?.id,
  });
  state.specId = specId;
  state.description = description;

  // Create feature branch — fail-fast on errors
  const branchName = await initBranch(specId, projectRoot, gitConfig);
  state.branch = branchName;

  state.currentStage = 'specification';
  await saveState(projectRoot, state);

  log.info('Loaded project constitution.');

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
