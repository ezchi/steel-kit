import { describe, it, expect } from 'vitest';
import { RateLimitError, isRateLimitMessage } from './errors.js';

describe('isRateLimitMessage', () => {
  it('detects common rate/usage-limit signals', () => {
    const hits = [
      'Error: rate limit exceeded',
      'API error: rate-limit reached',
      'HTTP 429 Too Many Requests',
      'status 529 overloaded',
      'You have exceeded your quota',
      'RESOURCE_EXHAUSTED: quota exceeded',
      'Usage limit reached for this account',
      'insufficient_quota',
      'Too Many Requests',
    ];
    for (const msg of hits) {
      expect(isRateLimitMessage(msg), msg).toBe(true);
    }
  });

  it('does not flag unrelated failures', () => {
    const misses = [
      '',
      undefined,
      null,
      'command not found',
      'Permission denied',
      'exit code 1: syntax error near line 42',
      'connection refused (port 8080)',
    ];
    for (const msg of misses) {
      expect(isRateLimitMessage(msg), String(msg)).toBe(false);
    }
  });
});

describe('RateLimitError', () => {
  it('carries provider and detail', () => {
    const err = new RateLimitError('claude', '429 too many requests');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('RateLimitError');
    expect(err.provider).toBe('claude');
    expect(err.detail).toBe('429 too many requests');
  });
});
