import { loadConfig } from '../src/config.js';
import { resolveSpecId } from '../src/git-config.js';

export async function cmdResolveSpecId(): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const specId = await resolveSpecId(projectRoot, config);
  process.stdout.write((specId ?? '') + '\n');
}
