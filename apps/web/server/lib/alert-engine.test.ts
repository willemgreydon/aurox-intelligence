import { describe, expect, it } from 'vitest';
import { generateAlertCandidates } from './alert-engine';
import type { ObserveViewModel } from '../services/market-observation-service';

function makeModel(): ObserveViewModel {
  return {
    generatedAt: new Date().toISOString(),
    degraded: false,
    summary: { regimeLabel: 'risk-on', regimeConfidence: 0.6, criticalCount: 1, warningCount: 1, watchCount: 1, infoCount: 1 },
    regime: { label: 'risk-on', confidence: 0.6, factors: ['test'], updatedAt: new Date().toISOString(), explanation: 'test' },
    observerItems: [
      {
        id: 'o1',
        title: 'Risk spike',
        severity: 'WARNING',
        reason: 'risk moved higher',
        confidence: 0.74,
        source: 'risk',
        createdAt: new Date().toISOString(),
        recommendedNextAction: 'inspect',
        assetSymbol: 'BTC',
        assetClass: 'crypto',
      },
    ],
    timeline: [],
    anomalies: [],
    relationshipInsights: [
      {
        id: 'r1',
        title: 'Crypto-equity beta chain',
        symbols: ['BTC', 'COIN'],
        severity: 'WARNING',
        confidence: 0.7,
        narrative: 'test narrative',
        kind: 'contagion',
      },
    ],
    watchlistIntelligence: [],
    tradeReadiness: { symbol: 'BTC', result: null },
    persistenceDegraded: false,
  };
}

describe('alert-engine', () => {
  it('generates deterministic alert candidates with dedupe keys', () => {
    const rows = generateAlertCandidates(makeModel(), { userId: 'u1' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.dedupeKey).toBeTruthy();
  });

  it('includes cross-asset relationship alerts', () => {
    const rows = generateAlertCandidates(makeModel(), { userId: 'u1' });
    expect(rows.some((row) => row.source === 'relationship')).toBe(true);
  });
});
