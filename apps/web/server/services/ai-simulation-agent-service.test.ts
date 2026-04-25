import { describe, expect, it } from 'vitest';
import type { AssetRanking } from '@repo/api-contracts';
import {
  evaluateAiDailyNotionalCap,
  mapRankedAssetsForAgent,
} from './ai-simulation-agent-guardrails';

function makeRankedAsset(index: number): AssetRanking {
  return {
    symbol: `SYM${index}`,
    assetId: `asset-${index}`,
    assetKind: 'stock',
    rank: index + 1,
    score: 0.7,
    confidence: 0.8,
    recommendation: 'buy',
    horizon: 'short',
    signalSummary: `signal-${index}`,
    factorSummary: `factor-${index}`,
    regimeSummary: `regime-${index}`,
    riskSummary: `risk-${index}`,
    explanation: `explanation-${index}`,
    updatedAt: new Date().toISOString(),
  };
}

describe('mapRankedAssetsForAgent', () => {
  it('maps only safe ranked fields and caps to top 10', () => {
    const assets = Array.from({ length: 12 }, (_, index) => makeRankedAsset(index));
    const mapped = mapRankedAssetsForAgent(assets);

    expect(mapped).toHaveLength(10);
    expect(mapped[0]).toEqual({
      symbol: 'SYM0',
      assetKind: 'stock',
      recommendation: 'buy',
      score: 0.7,
      confidence: 0.8,
      explanation: 'explanation-0',
      riskSummary: 'risk-0',
      signalSummary: 'signal-0',
    });
    expect((mapped[0] as Record<string, unknown>).assetId).toBeUndefined();
  });
});

describe('evaluateAiDailyNotionalCap', () => {
  it('rejects when used + proposed exceeds max daily cap', () => {
    const result = evaluateAiDailyNotionalCap({
      usedToday: 900,
      proposedNotional: 200,
      maxDailyNotional: 1000,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain('Daily notional cap exceeded');
    }
  });

  it('rejects when maxDailyNotional is zero', () => {
    const result = evaluateAiDailyNotionalCap({
      usedToday: 0,
      proposedNotional: 100,
      maxDailyNotional: 0,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain('maxDailyNotional');
    }
  });
});
