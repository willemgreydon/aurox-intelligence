import { describe, expect, it } from 'vitest';
import { buildContentHash, extractNewsIntelligenceSnapshot } from '../news/news-intelligence-extractor';
import type { NewsArticleNormalized } from '@repo/api-contracts';

function makeArticle(overrides: Partial<NewsArticleNormalized> = {}): NewsArticleNormalized {
  return {
    id: 'a1',
    provider: 'finnhub',
    providerArticleId: '1',
    title: 'AAPL earnings beat with strong guidance',
    url: 'https://example.com/aapl-earnings',
    sourceName: 'ExampleWire',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    symbols: ['AAPL'],
    assetIds: ['asset-aapl'],
    assetClasses: ['stock'],
    language: 'en',
    summary: 'Apple beat revenue estimates and raised guidance for next quarter.',
    contentHash: 'hash-1',
    rawMetadata: {},
    ...overrides,
  };
}

describe('news-intelligence-extractor', () => {
  it('builds deterministic content hash', () => {
    const first = buildContentHash({
      title: 'A',
      url: 'https://example.com',
      sourceName: 'S',
      publishedAt: '2026-05-09T10:00:00.000Z',
    });
    const second = buildContentHash({
      title: 'A',
      url: 'https://example.com',
      sourceName: 'S',
      publishedAt: '2026-05-09T10:00:00.000Z',
    });
    expect(first).toBe(second);
  });

  it('extracts event type and positive opportunity for earnings beat', () => {
    const snapshot = extractNewsIntelligenceSnapshot({
      article: makeArticle(),
      assets: [{ assetId: 'asset-aapl', symbol: 'AAPL', assetClass: 'stock' }],
    });
    expect(snapshot.eventTypes).toContain('earnings');
    expect(snapshot.opportunityScore).toBeGreaterThan(snapshot.riskScore - 10);
  });

  it('elevates risk for security breach/lawsuit language', () => {
    const snapshot = extractNewsIntelligenceSnapshot({
      article: makeArticle({
        title: 'Major exchange hacked amid regulatory lawsuit concerns',
        summary: 'Security breach and lawsuit risk increase volatility.',
        symbols: ['BTCUSDT'],
        assetClasses: ['crypto'],
      }),
      assets: [{ assetId: 'asset-btc', symbol: 'BTCUSDT', assetClass: 'crypto' }],
    });
    expect(snapshot.eventTypes).toContain('security_breach');
    expect(snapshot.riskScore).toBeGreaterThanOrEqual(70);
  });
});
