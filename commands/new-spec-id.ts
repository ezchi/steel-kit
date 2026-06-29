import { loadConfig } from '../src/config.js';
import { generateSpecId } from '../src/spec-id.js';

export async function cmdNewSpecId(opts: {
  description: string;
  id?: string;
}): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const specId = generateSpecId({
    projectRoot,
    specsDir: config.specsDir,
    description: opts.description,
    customId: opts.id,
  });
  process.stdout.write(specId + '\n');
}
