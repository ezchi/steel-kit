import { execa } from 'execa';
import type { LLMProvider, InvokeOptions } from './index.js';
import { writePromptFile } from './index.js';
import { registerPid, unregisterPid } from '../process-tracker.js';
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

    // Write prompt to file and let claude read it directly (no stdin piping)
    const promptFile = await writePromptFile(prompt, {
      workingDir: opts?.workingDir,
      role: 'claude',
    });

    args.push(`Read and follow the instructions in ${promptFile}`);

    log.debug(`claude ${args.slice(0, 3).join(' ')}... (prompt: ${promptFile})`);

    const proc = execa('claude', args, {
      cwd: opts?.workingDir,
      timeout: 600_000, // 10 min
      reject: false,
      stdin: 'ignore',
    });

    if (proc.pid) registerPid(proc.pid);

    try {
      const result = await proc;

      if (result.exitCode !== 0) {
        throw new Error(
          `Claude CLI failed (exit ${result.exitCode}): ${result.stderr}`,
        );
      }

      return result.stdout;
    } finally {
      if (proc.pid) unregisterPid(proc.pid);
    }
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
