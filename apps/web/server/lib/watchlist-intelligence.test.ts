import { describe, expect, it } from 'vitest';
import { sortAndFilterWatchlist } from './watchlist-intelligence';

const base = [
  {
    symbol: 'AAA',
    name: 'Alpha',
    assetClass: 'stock' as const,
    priceLabel: '$10',
    changeLabel: '+1.00%',
    signalAction: 'BUY',
    confidence: 0.8,
    riskScore: 20,
    newsSentiment: 0.3,
    freshnessLabel: 'Updated 10:00',
    actions: { inspectHref: '#', compareHref: '#', simulateHref: '#' },
  },
  {
    symbol: 'BBB',
    name: 'Beta',
    assetClass: 'crypto' as const,
    priceLabel: '$20',
    changeLabel: '-6.00%',
    signalAction: 'SELL',
    confidence: 0.6,
    riskScore: 80,
    newsSentiment: -0.5,
    freshnessLabel: 'stale',
    actions: { inspectHref: '#', compareHref: '#', simulateHref: '#' },
  },
];

describe('watchlist intelligence helpers', () => {
  it('sorts by highest risk', () => {
    const rows = sortAndFilterWatchlist(base, 'highest_risk', {
      assetClass: 'all', signalAction: 'all', risk: 'all', news: 'all', search: '',
    });
    expect(rows[0]?.symbol).toBe('BBB');
  });

  it('filters by signal action and search', () => {
    const rows = sortAndFilterWatchlist(base, 'strongest_signal', {
      assetClass: 'all', signalAction: 'BUY', risk: 'all', news: 'all', search: 'AA',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe('AAA');
  });
});
