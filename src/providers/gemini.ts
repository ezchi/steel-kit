import { execa } from 'execa';
import type { LLMProvider, InvokeOptions } from './index.js';
import { log } from '../utils.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<string> {
    const args: string[] = ['-p', prompt];

    if (opts?.model) {
      args.push('--model', opts.model);
    }

    if (opts?.allowFileEdits) {
      args.push('-y');
    }

    log.debug(`gemini ${args.slice(0, 2).join(' ')}...`);

    const result = await execa('gemini', args, {
      cwd: opts?.workingDir,
      timeout: 600_000,
      reject: false,
      stdin: 'ignore',
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `Gemini CLI failed (exit ${result.exitCode}): ${result.stderr}`,
      );
    }

    return result.stdout;
  }

  async check(): Promise<boolean> {
    try {
      const result = await execa('gemini', ['--version'], { reject: false });
      if (result.exitCode !== 0) return false;

      if (process.env.GEMINI_API_KEY) return true;

      log.debug('No GEMINI_API_KEY set, assuming Google account auth');
      return true;
    } catch {
      return false;
    }
  }
}
