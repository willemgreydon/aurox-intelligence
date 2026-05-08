import { describe, expect, it } from 'vitest';
import { buildCrossAssetRelationshipInsights } from './cross-asset-relationship-engine';

describe('cross-asset-relationship-engine', () => {
  it('builds deterministic relationship insights when cluster symbols are present', () => {
    const rows = buildCrossAssetRelationshipInsights([
      { symbol: 'NVDA', assetClass: 'stock', changePercent: -2.4, confidence: 0.72, action: 'SELL', newsSentiment: -0.4 },
      { symbol: 'AMD', assetClass: 'stock', changePercent: -1.8, confidence: 0.68, action: 'SELL', newsSentiment: -0.3 },
      { symbol: 'SOXX', assetClass: 'etf', changePercent: -1.6, confidence: 0.66, action: 'REDUCE', newsSentiment: -0.2 },
      { symbol: 'QQQ', assetClass: 'etf', changePercent: -1.1, confidence: 0.61, action: 'SELL', newsSentiment: -0.1 },
    ]);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.symbols).toContain('NVDA');
    expect(rows[0]?.narrative).toContain('Average move');
  });

  it('returns no insights when fewer than two symbols from clusters are available', () => {
    const rows = buildCrossAssetRelationshipInsights([
      { symbol: 'AAPL', assetClass: 'stock', changePercent: 1.2, confidence: 0.8, action: 'BUY', newsSentiment: 0.2 },
    ]);
    expect(rows).toHaveLength(0);
  });
});
