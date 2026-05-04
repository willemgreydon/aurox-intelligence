import { describe, expect, it } from 'vitest';
import { deriveNewsImpactExplanation } from '../news/news-impact';
import type { NewsItem } from '@repo/api-contracts';

function makeItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: 'n1',
    symbol: 'AAPL',
    title: 'Headline',
    summary: 'Summary',
    url: 'https://example.com/a',
    source: 'Reuters',
    publishedAt: new Date().toISOString(),
    provider: 'finnhub',
    language: 'en',
    categories: [],
    tickers: ['AAPL'],
    ...overrides,
  };
}

describe('deriveNewsImpactExplanation', () => {
  it('positive news increases score', () => {
    const result = deriveNewsImpactExplanation('AAPL', [makeItem({ sentimentScore: 0.9, relevanceScore: 1 })]);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('negative news decreases score', () => {
    const result = deriveNewsImpactExplanation('AAPL', [makeItem({ sentimentScore: -0.9, relevanceScore: 1 })]);
    expect(result.score).toBeLessThan(0.5);
  });

  it('stale news has lower weight', () => {
    const fresh = deriveNewsImpactExplanation('AAPL', [makeItem({ sentimentScore: -0.8, publishedAt: new Date().toISOString() })]);
    const stale = deriveNewsImpactExplanation('AAPL', [makeItem({ sentimentScore: -0.8, publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() })]);
    expect(stale.score).toBeGreaterThan(fresh.score);
  });

  it('critical negative news sets critical risk flag', () => {
    const result = deriveNewsImpactExplanation('AAPL', [
      makeItem({ sentimentScore: -1, relevanceScore: 1 }),
      makeItem({ id: 'n2', sentimentScore: -1, relevanceScore: 1, url: 'https://example.com/b' }),
    ]);
    expect(result.riskFlag).toBe('CRITICAL');
  });
});
