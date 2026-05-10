import { describe, expect, it } from 'vitest';
import { redactMeta } from './performance-timer';

describe('performance-timer redactMeta', () => {
  it('redacts sensitive keys', () => {
    const redacted = redactMeta({
      apiKey: 'abc',
      Authorization: 'Bearer token',
      safe: 'ok',
    });

    expect(redacted.apiKey).toBe('[redacted]');
    expect(redacted.Authorization).toBe('[redacted]');
    expect(redacted.safe).toBe('ok');
  });
});
