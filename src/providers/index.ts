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
