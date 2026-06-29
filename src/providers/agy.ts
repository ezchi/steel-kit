import { execa } from 'execa';
import type { LLMProvider, InvokeOptions, InvokeResult } from './index.js';
import { writePromptFile } from './index.js';
import { registerPid, unregisterPid } from '../process-tracker.js';
import { RateLimitError, isRateLimitMessage } from '../errors.js';
import { log } from '../utils.js';

/**
 * Google Antigravity CLI (`agy`), the successor to the discontinued Gemini CLI.
 *
 * Session reuse is intentionally NOT implemented: in headless (`--print`) mode
 * `agy` does not surface the conversation ID it generates, and there is no
 * confirmed way to create a conversation with a caller-supplied ID, so a
 * specific conversation cannot be resumed (see google-antigravity/antigravity-cli
 * issue #7). `sessionId`/`resumeSession` are therefore ignored and no session
 * ID is returned.
 */
export class AgyProvider implements LLMProvider {
  readonly name = 'agy';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<InvokeResult> {
    const args: string[] = [];

    if (opts?.model) {
      args.push('-m', opts.model);
    }

    if (opts?.allowFileEdits) {
      args.push('--dangerously-skip-permissions');
    }

    // Write prompt to file and reference it via -p (no stdin piping)
    const promptFile = await writePromptFile(prompt, {
      workingDir: opts?.workingDir,
      role: 'agy',
    });

    args.push('-p', `Read and follow the instructions in ${promptFile}`);

    if (opts?.resumeSession) {
      log.debug('agy does not support headless session resume; running fresh');
    }

    log.debug(`agy ${args.slice(0, 2).join(' ')}... (prompt: ${promptFile})`);

    const proc = execa('agy', args, {
      cwd: opts?.workingDir,
      timeout: 600_000,
      reject: false,
      stdin: 'ignore',
    });

    if (proc.pid) registerPid(proc.pid);

    try {
      const result = await proc;

      if (result.exitCode !== 0) {
        const detail = result.stderr || result.stdout || '';
        if (isRateLimitMessage(detail)) {
          throw new RateLimitError(this.name, detail.trim());
        }
        throw new Error(
          `Antigravity CLI (agy) failed (exit ${result.exitCode}): ${result.stderr}`,
        );
      }

      return { output: result.stdout };
    } finally {
      if (proc.pid) unregisterPid(proc.pid);
    }
  }

  async check(): Promise<boolean> {
    try {
      const result = await execa('agy', ['--version'], { reject: false });
      if (result.exitCode !== 0) return false;

      // agy authenticates via account login, not an API-key env var.
      return true;
    } catch {
      return false;
    }
  }
}
