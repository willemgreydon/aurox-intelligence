import { describe, expect, it } from 'vitest';
import { normalizeProviderErrorMessage } from './provider-error-normalizer';

describe('normalizeProviderErrorMessage', () => {
  it('normalizes rate-limited provider errors', () => {
    expect(normalizeProviderErrorMessage({ code: 'rate_limited' })).toMatch(/rate limit/i);
  });

  it('normalizes nested selection errors', () => {
    const message = normalizeProviderErrorMessage({
      selection: { errors: [{ code: 'missing_config', message: 'Missing key' }] },
    });
    expect(message).toMatch(/api key/i);
  });
});

