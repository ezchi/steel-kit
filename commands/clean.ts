import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execa } from 'execa';
import { getSteelDir, loadConfig } from '../src/config.js';
import { loadState, createInitialState, saveState } from '../src/workflow.js';
import { commitStep } from '../src/git-ops.js';
import { log, confirm, die } from '../src/utils.js';

export async function cmdClean(): Promise<void> {
  const projectRoot = process.cwd();
  const steelDir = getSteelDir(projectRoot);

  if (!existsSync(steelDir)) {
    die('Project not initialized. Nothing to clean.');
  }

  const state = await loadState(projectRoot);
  const config = await loadConfig(projectRoot);
  const specId = state.specId;

  // Show what will be removed
  log.info('The following will be removed:');
  log.info('  - .steel/state.json');
  log.info('  - .steel/tasks.json');
  if (specId) {
    log.info(`  - specs/${specId}/artifacts/ (iteration artifacts only)`);
  }
  log.info('  - All steel/*-complete git tags (local only)');

  const approved = await confirm(
    specId
      ? `Remove iteration artifacts for spec "${specId}" and reset workflow state?`
      : 'Reset workflow state?',
  );
  if (!approved) {
    log.warn('Clean cancelled.');
    return;
  }

  // Delete iteration artifacts only (keep spec.md, plan.md, etc.)
  if (specId) {
    const artifactsDir = resolve(projectRoot, 'specs', specId, 'artifacts');
    if (existsSync(artifactsDir)) {
      await rm(artifactsDir, { recursive: true });
      log.info(`Deleted specs/${specId}/artifacts/`);
    }
  }

  // Delete ephemeral state files
  const stateFile = resolve(steelDir, 'state.json');
  const tasksFile = resolve(steelDir, 'tasks.json');
  if (existsSync(stateFile)) await rm(stateFile);
  if (existsSync(tasksFile)) await rm(tasksFile);

  // Remove steel/*-complete tags (local only)
  const tagResult = await execa('git', ['tag', '-l', 'steel/*-complete'], {
    cwd: projectRoot,
    reject: false,
    stdin: 'ignore',
  });
  const tags = tagResult.stdout.trim().split('\n').filter(Boolean);
  for (const tag of tags) {
    await execa('git', ['tag', '-d', tag], {
      cwd: projectRoot,
      reject: false,
      stdin: 'ignore',
    });
  }
  if (tags.length > 0) {
    log.info(`Removed ${tags.length} git tag(s)`);
  }

  // Reset state to initial (constitution complete, ready for specification)
  const freshState = createInitialState();
  freshState.stages.constitution.status = 'complete';
  freshState.stages.constitution.completedAt = new Date().toISOString();
  freshState.currentStage = 'specification';
  freshState.stages.specification.status = 'pending';
  await saveState(projectRoot, freshState);

  // Git commit
  if (config.autoCommit) {
    await commitStep(
      'steel',
      'clean',
      1,
      `remove artifacts${specId ? ` for ${specId}` : ''}`,
      projectRoot,
    );
  }

  log.success('Workflow reset. Run `steel specify` to start a new feature.');
}
