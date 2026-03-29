import { execa } from 'execa';
import type { LLMProvider, InvokeOptions } from './index.js';
import { log } from '../utils.js';

export class CodexProvider implements LLMProvider {
  readonly name = 'codex';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<string> {
    const args: string[] = ['exec'];

    if (opts?.allowFileEdits) {
      args.push('--full-auto');
    }

    args.push(prompt);

    log.debug(`codex ${args.slice(0, 2).join(' ')}...`);

    const result = await execa('codex', args, {
      cwd: opts?.workingDir,
      timeout: 600_000,
      reject: false,
      stdin: 'ignore',
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `Codex CLI failed (exit ${result.exitCode}): ${result.stderr}`,
      );
    }

    return result.stdout;
  }

  async check(): Promise<boolean> {
    try {
      const result = await execa('codex', ['--version'], { reject: false });
      if (result.exitCode !== 0) return false;

      if (process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) return true;

      log.debug('No CODEX_API_KEY set, assuming login auth');
      return true;
    } catch {
      return false;
    }
  }
}
