import { commitStep } from '../src/git-ops.js';

export interface CommitStepOpts {
  role: 'forge' | 'gauge';
  stage: string;
  iter: number;
  msg: string;
  paths?: string[];
  force?: boolean;
}

export async function cmdCommitStep(opts: CommitStepOpts): Promise<void> {
  const projectRoot = process.cwd();
  await commitStep(
    opts.role,
    opts.stage,
    opts.iter,
    opts.msg,
    projectRoot,
    opts.paths,
    opts.force,
  );
}
