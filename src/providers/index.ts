import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ClaudeProvider } from './claude.js';
import { AgyProvider } from './agy.js';
import { CodexProvider } from './codex.js';

export interface InvokeOptions {
  model?: string;
  allowFileEdits?: boolean;
  workingDir?: string;
  systemPrompt?: string;
  /**
   * Session ID to reuse across calls. When set on a fresh call the provider
   * starts (or adopts) a session with this ID; on a resume call it continues
   * the existing session, keeping prior context warm instead of cold-loading
   * config and re-exploring the project every invocation.
   */
  sessionId?: string;
  /** When true, resume the existing `sessionId` rather than create a new one. */
  resumeSession?: boolean;
}

export interface InvokeResult {
  /** The model's textual output. */
  output: string;
  /**
   * The effective session ID for this call. For providers that accept a
   * caller-supplied ID this echoes `opts.sessionId`; for providers that
   * generate their own (e.g. codex) this is the captured ID to resume next.
   */
  sessionId?: string;
}

export interface LLMProvider {
  readonly name: string;
  invoke(prompt: string, opts?: InvokeOptions): Promise<InvokeResult>;
  check(): Promise<boolean>;
}

/**
 * Write a prompt to a temp file under .steel/tmp/ so it can be piped via
 * stdin instead of passed as a CLI argument (which hits shell arg limits
 * and causes timeouts on large prompts).
 *
 * Returns the absolute path to the written file.
 */
export async function writePromptFile(
  prompt: string,
  opts: { workingDir?: string; role: string; stage?: string; iteration?: number },
): Promise<string> {
  const root = opts.workingDir ?? process.cwd();
  const tmpDir = resolve(root, '.steel', 'tmp');
  await mkdir(tmpDir, { recursive: true });

  const ts = Date.now();
  const parts = [opts.role, opts.stage, opts.iteration != null ? `iter${opts.iteration}` : null, ts]
    .filter(Boolean)
    .join('-');
  const filePath = resolve(tmpDir, `${parts}.md`);
  await writeFile(filePath, prompt, 'utf-8');
  return filePath;
}

const registry: Record<string, () => LLMProvider> = {
  claude: () => new ClaudeProvider(),
  agy: () => new AgyProvider(),
  codex: () => new CodexProvider(),
};

export function getProvider(name: string): LLMProvider {
  const factory = registry[name];
  if (!factory) {
    throw new Error(
      `Unknown provider: ${name}. Available: ${Object.keys(registry).join(', ')}`,
    );
  }
  return factory();
}

export function listProviders(): string[] {
  return Object.keys(registry);
}
