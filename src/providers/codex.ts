import { execa } from 'execa';
import type { LLMProvider, InvokeOptions } from './index.js';
import { writePromptFile } from './index.js';
import { registerPid, unregisterPid } from '../process-tracker.js';
import { log } from '../utils.js';

export class CodexProvider implements LLMProvider {
  readonly name = 'codex';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<string> {
    const args: string[] = ['exec'];

    if (opts?.allowFileEdits) {
      args.push('--full-auto');
    }

    // Write prompt to file and let codex read it directly (no stdin piping)
    const promptFile = await writePromptFile(prompt, {
      workingDir: opts?.workingDir,
      role: 'codex',
    });

    args.push(`Read and follow the instructions in ${promptFile}`);

    log.debug(`codex ${args.join(' ')}... (prompt: ${promptFile})`);

    const proc = execa('codex', args, {
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
          `Codex CLI failed (exit ${result.exitCode}): ${result.stderr}`,
        );
      }

      return result.stdout;
    } finally {
      if (proc.pid) unregisterPid(proc.pid);
    }
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
