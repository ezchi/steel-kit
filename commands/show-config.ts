import { loadConfig } from '../src/config.js';
import { resolveGitConfig } from '../src/git-config.js';

export async function cmdShowConfig(): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const git = resolveGitConfig(config);

  // Emit the merged config plus the resolved git settings (with preset
  // defaults filled in) so slash commands and scripts can read a single
  // canonical view without re-implementing resolution rules.
  const out = {
    forge: config.forge,
    gauge: config.gauge,
    maxIterations: config.maxIterations,
    autoCommit: config.autoCommit,
    specsDir: config.specsDir,
    git,
  };

  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
