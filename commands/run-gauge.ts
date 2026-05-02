import { readFile, writeFile } from 'node:fs/promises';
import { loadConfig } from '../src/config.js';
import { getProvider } from '../src/providers/index.js';
import { die, log } from '../src/utils.js';

export interface RunGaugeOpts {
  provider?: string;       // override config.gauge.provider
  promptFile: string;      // path to rendered review prompt
  output?: string;         // write review output here; default stdout
}

export async function cmdRunGauge(opts: RunGaugeOpts): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  const providerName = opts.provider ?? config.gauge.provider;
  const provider = getProvider(providerName);

  const prompt = await readFile(opts.promptFile, 'utf-8');
  if (!prompt.trim()) {
    die(`Empty prompt at ${opts.promptFile}`);
  }

  log.step(`Gauge (${provider.name}) reviewing with prompt at ${opts.promptFile}`);
  const result = await provider.invoke(prompt, {
    model: config.gauge.model,
    workingDir: projectRoot,
  });

  if (opts.output) {
    await writeFile(opts.output, result, 'utf-8');
    log.success(`Gauge output written to ${opts.output}`);
  } else {
    process.stdout.write(result);
  }
}
