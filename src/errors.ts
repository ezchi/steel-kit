/**
 * Raised when a provider CLI fails in a way that looks like an API rate or
 * usage limit. Detection is heuristic (CLIs do not expose a stable machine
 * code for this), so it is only applied to the failure path — a non-zero exit
 * — to avoid false positives from output that merely mentions "rate limit".
 */
export class RateLimitError extends Error {
  readonly provider: string;
  readonly detail: string;

  constructor(provider: string, detail: string) {
    super(`${provider} CLI hit a rate or usage limit`);
    this.name = 'RateLimitError';
    this.provider = provider;
    this.detail = detail;
  }
}

const RATE_LIMIT_PATTERNS: RegExp[] = [
  /rate[\s_-]?limit/i,
  /\btoo many requests\b/i,
  /\b429\b/,
  /\b529\b/,
  /\boverloaded\b/i,
  /quota/i,
  /resource[\s_-]?exhausted/i,
  /\busage limit\b/i,
  /insufficient_quota/i,
];

/** True if `text` contains a recognized rate/usage-limit signal. */
export function isRateLimitMessage(text: string | undefined | null): boolean {
  if (!text) return false;
  return RATE_LIMIT_PATTERNS.some((re) => re.test(text));
}
