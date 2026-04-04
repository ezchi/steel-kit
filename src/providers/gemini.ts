import { execa } from 'execa';
import type { LLMProvider, InvokeOptions } from './index.js';
import { writePromptFile } from './index.js';
import { registerPid, unregisterPid } from '../process-tracker.js';
import { log } from '../utils.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<string> {
    const args: string[] = [];

    if (opts?.model) {
      args.push('--model', opts.model);
    }

    if (opts?.allowFileEdits) {
      args.push('-y');
    }

    // Write prompt to file and let gemini read it directly (no stdin piping)
    const promptFile = await writePromptFile(prompt, {
      workingDir: opts?.workingDir,
      role: 'gemini',
    });

    args.push(`Read and follow the instructions in ${promptFile}`);

    log.debug(`gemini ${args.join(' ')}... (prompt: ${promptFile})`);

    const proc = execa('gemini', args, {
      cwd: opts?.workingDir,
      timeout: 600_000,
      reject: false,
      stdin: 'ignore',
    });

    if (proc.pid) registerPid(proc.pid);

    try {
      const result = await proc;

      if (result.exitCode !== 0) {
        throw new Error(
          `Gemini CLI failed (exit ${result.exitCode}): ${result.stderr}`,
        );
      }

      return result.stdout;
    } finally {
      if (proc.pid) unregisterPid(proc.pid);
    }
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
