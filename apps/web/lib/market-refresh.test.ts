import { describe, expect, it } from 'vitest';
import { getQuoteRefreshIntervalMs, shouldPollQuotes } from './market-refresh';

describe('market refresh helpers', () => {
  it('uses faster interval while visible', () => {
    expect(getQuoteRefreshIntervalMs(true)).toBe(20000);
    expect(getQuoteRefreshIntervalMs(false)).toBe(60000);
  });

  it('pauses polling when document is hidden', () => {
    expect(shouldPollQuotes(true)).toBe(false);
    expect(shouldPollQuotes(false)).toBe(true);
  });
});

