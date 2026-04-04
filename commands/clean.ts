import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execa } from 'execa';
import { getSpecDir, getSteelDir, loadConfig } from '../src/config.js';
import { resolveSpecId } from '../src/git-config.js';
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

  // Resolve specId: state first, then branch/specs-dir fallback (FR-5)
  let specId = state.specId ?? null;
  if (!specId) {
    specId = await resolveSpecId(projectRoot, config);
  }

  // Show what will be removed
  log.info('The following will be removed:');
  log.info('  - .steel/state.json');
  log.info('  - .steel/tasks.json');
  if (specId) {
    log.info(`  - ${config.specsDir}/${specId}/artifacts/ (iteration artifacts only)`);
  }
  if (specId) {
    log.info(`  - Git tags matching steel/${specId}/*-complete (local only)`);
  } else {
    log.info('  - All steel/*/*-complete git tags (local only)');
  }

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
    const artifactsDir = resolve(getSpecDir(projectRoot, config, specId), 'artifacts');
    if (existsSync(artifactsDir)) {
      await rm(artifactsDir, { recursive: true });
      log.info(`Deleted ${config.specsDir}/${specId}/artifacts/`);
    }
  }

  // Delete ephemeral state files
  const stateFile = resolve(steelDir, 'state.json');
  const tasksFile = resolve(steelDir, 'tasks.json');
  if (existsSync(stateFile)) await rm(stateFile);
  if (existsSync(tasksFile)) await rm(tasksFile);

  // Remove namespaced tags scoped to specId (FR-5)
  const tagPattern = specId ? `steel/${specId}/*-complete` : 'steel/*/*-complete';
  if (!specId) {
    log.warn('Cannot determine active spec — removing all namespaced tags');
  }
  const tagResult = await execa('git', ['tag', '-l', tagPattern], {
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
    log.info(`Removed ${tags.length} git tag(s)${specId ? ` for ${specId}` : ''}`);
  }

  const freshState = createInitialState();
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
