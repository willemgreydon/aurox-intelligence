import { describe, expect, it } from 'vitest';
import { computeNewsImpact } from '../intelligence/news-impact-engine';

const nowIso = new Date().toISOString();
const oldIso = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

describe('computeNewsImpact', () => {
  it('reduces confidence on high-risk negative news', () => {
    const result = computeNewsImpact({
      symbol: 'AAPL',
      recentNews: [
        {
          id: 'n1',
          symbol: 'AAPL',
          assetIds: [],
          symbols: ['AAPL'],
          assetClass: 'stock',
          title: 'Regulatory probe escalates',
          summary: 'Negative catalyst',
          url: 'https://example.com/aapl-risk',
          source: 'Reuters',
          publishedAt: nowIso,
          provider: 'mock',
          language: 'en',
          sentimentScore: -0.9,
          relevanceScore: 0.95,
          impactScore: 0.9,
          categories: ['risk'],
          tickers: ['AAPL'],
          riskTags: [],
          extractedEntities: [],
        },
      ],
    });

    expect(result.confidenceAdjustment).toBeLessThan(0);
    expect(result.riskAdjustment).toBeGreaterThan(0);
  });

  it('ignores stale news impact', () => {
    const result = computeNewsImpact({
      symbol: 'AAPL',
      recentNews: [
        {
          id: 'n2',
          symbol: 'AAPL',
          assetIds: [],
          symbols: ['AAPL'],
          assetClass: 'stock',
          title: 'Old article',
          summary: 'Outdated',
          url: 'https://example.com/aapl-old',
          source: 'Blog',
          publishedAt: oldIso,
          provider: 'mock',
          language: 'en',
          sentimentScore: -1,
          relevanceScore: 1,
          impactScore: 1,
          categories: ['macro'],
          tickers: ['AAPL'],
          riskTags: [],
          extractedEntities: [],
        },
      ],
    });

    expect(Math.abs(result.confidenceAdjustment)).toBeLessThan(0.02);
  });

  it('ignores low-relevance news', () => {
    const result = computeNewsImpact({
      symbol: 'AAPL',
      recentNews: [
        {
          id: 'n3',
          symbol: 'AAPL',
          assetIds: [],
          symbols: ['AAPL'],
          assetClass: 'stock',
          title: 'Peripheral mention',
          summary: 'Low relevance',
          url: 'https://example.com/aapl-low',
          source: 'Newswire',
          publishedAt: nowIso,
          provider: 'mock',
          language: 'en',
          sentimentScore: -0.8,
          relevanceScore: 0.01,
          impactScore: 0.05,
          categories: ['other'],
          tickers: ['AAPL'],
          riskTags: [],
          extractedEntities: [],
        },
      ],
    });

    expect(result.influencedByNewsIds.length).toBe(0);
    expect(result.confidenceAdjustment).toBe(0);
  });
});
