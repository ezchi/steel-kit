import { execa } from 'execa';
import type { LLMProvider, InvokeOptions, InvokeResult } from './index.js';
import { writePromptFile } from './index.js';
import { registerPid, unregisterPid } from '../process-tracker.js';
import { RateLimitError, isRateLimitMessage } from '../errors.js';
import { log } from '../utils.js';

export class CodexProvider implements LLMProvider {
  readonly name = 'codex';

  async invoke(prompt: string, opts?: InvokeOptions): Promise<InvokeResult> {
    // Write prompt to file and let codex read it directly (no stdin piping)
    const promptFile = await writePromptFile(prompt, {
      workingDir: opts?.workingDir,
      role: 'codex',
    });
    const promptArg = `Read and follow the instructions in ${promptFile}`;

    // Codex does not accept a caller-supplied session ID on creation: it
    // generates its own and emits it as the `thread.started` event in the
    // JSONL stream. We therefore drive codex in --json mode to (a) capture the
    // generated ID so the next call can resume, and (b) extract the agent's
    // final message. To resume, pass that captured ID to `exec resume`.
    let args: string[];
    if (opts?.sessionId && opts.resumeSession) {
      args = ['exec', 'resume', opts.sessionId, '--json', promptArg];
    } else {
      args = ['exec', '--json'];
      if (opts?.allowFileEdits) {
        args.push('--full-auto');
      }
      args.push(promptArg);
    }

    log.debug(`codex ${args.slice(0, 4).join(' ')}... (prompt: ${promptFile})`);

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
        const detail = result.stderr || result.stdout || '';
        if (isRateLimitMessage(detail)) {
          throw new RateLimitError(this.name, detail.trim());
        }
        throw new Error(
          `Codex CLI failed (exit ${result.exitCode}): ${result.stderr}`,
        );
      }

      return parseCodexJsonl(result.stdout);
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

/**
 * Parse codex's `--json` JSONL stream: collect agent messages as the textual
 * output and capture the thread (session) ID for later resume. Non-JSON lines
 * (codex status banners) are ignored.
 */
function parseCodexJsonl(stdout: string): InvokeResult {
  const messages: string[] = [];
  let sessionId: string | undefined;

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;

    let evt: any;
    try {
      evt = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (evt.type === 'thread.started' && typeof evt.thread_id === 'string') {
      sessionId = evt.thread_id;
    } else if (
      evt.type === 'item.completed' &&
      evt.item?.type === 'agent_message' &&
      typeof evt.item.text === 'string'
    ) {
      messages.push(evt.item.text);
    }
  }

  return { output: messages.join('\n').trim(), sessionId };
}
