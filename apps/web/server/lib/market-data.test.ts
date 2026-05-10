import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getFreshnessState } from './market-data';

describe('getFreshnessState', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });
  it('never returns market_closed for crypto', () => {
    vi.setSystemTime(new Date('2026-05-10T18:00:00.000Z'));
    const ts = '2026-05-10T10:00:00.000Z';
    expect(getFreshnessState(ts, 'crypto')).not.toBe('market_closed');
  });

  it('returns market_closed for older stock quotes outside market hours', () => {
    vi.setSystemTime(new Date('2026-05-10T18:00:00.000Z'));
    const ts = '2026-05-10T10:00:00.000Z';
    expect(getFreshnessState(ts, 'stock')).toBe('market_closed');
  });

  it('returns market_closed for older ETF quotes outside market hours', () => {
    vi.setSystemTime(new Date('2026-05-10T18:00:00.000Z'));
    const ts = '2026-05-10T10:00:00.000Z';
    expect(getFreshnessState(ts, 'etf')).toBe('market_closed');
  });
  afterAll(() => {
    vi.useRealTimers();
  });
});
