import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ClaudeProvider } from './claude.js';
import { GeminiProvider } from './gemini.js';
import { CodexProvider } from './codex.js';

export interface InvokeOptions {
  model?: string;
  allowFileEdits?: boolean;
  workingDir?: string;
  systemPrompt?: string;
}

export interface LLMProvider {
  readonly name: string;
  invoke(prompt: string, opts?: InvokeOptions): Promise<string>;
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
  gemini: () => new GeminiProvider(),
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
