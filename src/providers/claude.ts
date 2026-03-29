import { execa } from 'execa';
import type { LLMProvider, InvokeOptions } from './index.js';
import { log } from '../utils.js';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<string> {
    const args: string[] = ['-p', '--output-format', 'text'];

    if (opts?.model) {
      args.push('--model', opts.model);
    }

    if (opts?.allowFileEdits) {
      args.push('--dangerously-skip-permissions');
    }

    if (opts?.systemPrompt) {
      args.push('--append-system-prompt', opts.systemPrompt);
    }

    args.push(prompt);

    log.debug(`claude ${args.slice(0, 3).join(' ')}...`);

    const result = await execa('claude', args, {
      cwd: opts?.workingDir,
      timeout: 600_000, // 10 min
      reject: false,
      stdin: 'ignore',
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `Claude CLI failed (exit ${result.exitCode}): ${result.stderr}`,
      );
    }

    return result.stdout;
  }

  async check(): Promise<boolean> {
    try {
      const result = await execa('claude', ['--version'], { reject: false });
      if (result.exitCode !== 0) return false;

      if (process.env.ANTHROPIC_API_KEY) return true;

      // If no API key, claude might still work via subscription login
      log.debug('No ANTHROPIC_API_KEY set, assuming subscription auth');
      return true;
    } catch {
      return false;
    }
  }
}
