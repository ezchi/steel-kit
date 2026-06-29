import { loadConfig } from '../src/config.js';
import { resolveGitConfig } from '../src/git-config.js';
import { initBranch } from '../src/git-ops.js';
import { loadState, saveState } from '../src/workflow.js';
import { log } from '../src/utils.js';

export interface BranchInitOpts {
  specId: string;
  baseBranch: string;
  description?: string;
  from?: string;
}

export async function cmdBranchInit(opts: BranchInitOpts): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const gitConfig = resolveGitConfig(config);

  const { branchName, baseBranch } = await initBranch(
    {
      specId: opts.specId,
      baseBranch: opts.baseBranch,
      branchPrefix: gitConfig.branchPrefix,
      from: opts.from,
    },
    projectRoot,
  );

  // Persist the result into state.json so downstream helpers
  // (render-prompt, validation, etc.) can pick up the per-spec base.
  const state = await loadState(projectRoot);
  state.specId = opts.specId;
  state.branch = branchName;
  state.baseBranch = baseBranch;
  if (opts.description !== undefined) state.description = opts.description;
  await saveState(projectRoot, state);

  log.success(`Branch ${branchName} created (base: ${baseBranch})`);
  process.stdout.write(
    JSON.stringify({ branchName, baseBranch, specId: opts.specId }) + '\n',
  );
}
