import { readFile, writeFile } from 'node:fs/promises';
import { loadConfig } from '../src/config.js';
import { getProvider } from '../src/providers/index.js';
import { RateLimitError } from '../src/errors.js';
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
  let result: string;
  try {
    ({ output: result } = await provider.invoke(prompt, {
      model: config.gauge.model,
      workingDir: projectRoot,
    }));
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.error(`Gauge provider (${err.provider}) reached a rate/usage limit:`);
      log.error(`  ${err.detail || err.message}`);
      die('Rate limit reached. Stopped — retry once the limit resets.');
    }
    throw err;
  }

  if (opts.output) {
    await writeFile(opts.output, result, 'utf-8');
    log.success(`Gauge output written to ${opts.output}`);
  } else {
    process.stdout.write(result);
  }
}
