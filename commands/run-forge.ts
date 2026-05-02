import { readFile, writeFile } from 'node:fs/promises';
import { loadConfig } from '../src/config.js';
import { getProvider } from '../src/providers/index.js';
import { die, log } from '../src/utils.js';

export interface RunForgeOpts {
  provider?: string;       // override config.forge.provider
  promptFile: string;      // path to rendered prompt
  output?: string;         // write LLM output here; default stdout
  allowEdits?: boolean;
}

export async function cmdRunForge(opts: RunForgeOpts): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const providerName = opts.provider ?? config.forge.provider;
  const provider = getProvider(providerName);

  const prompt = await readFile(opts.promptFile, 'utf-8');
  if (!prompt.trim()) {
    die(`Empty prompt at ${opts.promptFile}`);
  }

  log.step(`Forge (${provider.name}) running with prompt at ${opts.promptFile}`);
  const result = await provider.invoke(prompt, {
    model: config.forge.model,
    allowFileEdits: opts.allowEdits,
    workingDir: projectRoot,
  });

  if (opts.output) {
    await writeFile(opts.output, result, 'utf-8');
    log.success(`Forge output written to ${opts.output}`);
  } else {
    process.stdout.write(result);
  }
}
