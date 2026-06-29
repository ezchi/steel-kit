import { loadState } from '../src/workflow.js';
import { tagStage } from '../src/git-ops.js';
import { die } from '../src/utils.js';

export async function cmdTagStage(opts: { stage: string; specId?: string }): Promise<void> {
  const projectRoot = process.cwd();
  let specId = opts.specId;
  if (!specId) {
    const state = await loadState(projectRoot);
    specId = state.specId;
  }
  if (!specId) {
    die('No spec ID provided and none in state.json. Pass --spec-id explicitly.');
  }
  await tagStage(specId, opts.stage, projectRoot);
}
