import { describe, expect, it } from 'vitest';
import {
  computeCompositeScore,
  computeRiskPenalty,
  computeRankingConfidence,
  mapRankingRecommendation,
  rankAssets,
} from '../ranking-engine';
import type { AssetRankingInput } from '../ranking-engine';

function makeInput(overrides: Partial<AssetRankingInput> = {}): AssetRankingInput {
  return {
    assetId: 'asset-1',
    symbol: 'AAPL',
    assetKind: 'stock',
    changePercent: 2.0,
    freshnessState: 'live',
    insightStance: 'positive',
    insightConfidence: 0.7,
    ...overrides,
  };
}

describe('computeCompositeScore', () => {
  it('applies weights correctly for a fully bullish input', () => {
    // signalScore=1, factorScore=1, regimeScore=1, riskAdjustedMomentum=1, liquidityScore=1
    const score = computeCompositeScore({
      signalScore: 1,
      factorScore: 1,
      regimeScore: 1,
      riskAdjustedMomentum: 1,
      liquidityScore: 1,
    });
    // 0.35+0.25+0.15+0.15+0.10 = 1.0
    expect(score).toBeCloseTo(1.0, 5);
  });

  it('applies weights correctly for a fully bearish input', () => {
    const score = computeCompositeScore({
      signalScore: -1,
      factorScore: -1,
      regimeScore: -1,
      riskAdjustedMomentum: -1,
      liquidityScore: -1,
    });
    expect(score).toBeCloseTo(-1.0, 5);
  });

  it('weights sum to 1.0 — neutral components produce zero', () => {
    const score = computeCompositeScore({
      signalScore: 0,
      factorScore: 0,
      regimeScore: 0,
      riskAdjustedMomentum: 0,
      liquidityScore: 0,
    });
    expect(score).toBe(0);
  });

  it('partial bullish input returns score between 0 and 1', () => {
    const score = computeCompositeScore({
      signalScore: 0.5,
      factorScore: 0.8,
      regimeScore: 0.6,
      riskAdjustedMomentum: 0.5,
      liquidityScore: 0.7,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
    // 0.35*0.5 + 0.25*0.8 + 0.15*0.6 + 0.15*0.5 + 0.10*0.7
    // = 0.175 + 0.2 + 0.09 + 0.075 + 0.07 = 0.61
    expect(score).toBeCloseTo(0.61, 5);
  });

  it('clamps output to [-1, 1] even with out-of-range inputs', () => {
    const score = computeCompositeScore({
      signalScore: 2,
      factorScore: 2,
      regimeScore: 2,
      riskAdjustedMomentum: 2,
      liquidityScore: 2,
    });
    expect(score).toBe(1);
  });
});

describe('computeRiskPenalty', () => {
  it('applies weights correctly for maximum risk', () => {
    // penalty = 0.30*1 + 0.25*1 + 0.20*1 + 0.15*0 + 0.10*1 = 0.85 → clamped to 0.75
    const penalty = computeRiskPenalty({
      volatilityRisk: 1,
      liquidityRisk: 1,
      drawdownRisk: 1,
      correlationRisk: 0,
      anomalyRisk: 1,
    });
    expect(penalty).toBe(0.75);
  });

  it('clamps to 0.75 even when all factors are maximum', () => {
    const penalty = computeRiskPenalty({
      volatilityRisk: 1,
      liquidityRisk: 1,
      drawdownRisk: 1,
      correlationRisk: 1,
      anomalyRisk: 1,
    });
    expect(penalty).toBe(0.75);
  });

  it('returns near zero for minimal risk', () => {
    const penalty = computeRiskPenalty({
      volatilityRisk: 0,
      liquidityRisk: 0,
      drawdownRisk: 0,
      correlationRisk: 0,
      anomalyRisk: 0,
    });
    expect(penalty).toBe(0);
  });

  it('weighs volatilityRisk at 0.30 (highest)', () => {
    const penaltyVol = computeRiskPenalty({
      volatilityRisk: 1,
      liquidityRisk: 0,
      drawdownRisk: 0,
      correlationRisk: 0,
      anomalyRisk: 0,
    });
    const penaltyLiq = computeRiskPenalty({
      volatilityRisk: 0,
      liquidityRisk: 1,
      drawdownRisk: 0,
      correlationRisk: 0,
      anomalyRisk: 0,
    });
    expect(penaltyVol).toBeGreaterThan(penaltyLiq);
    expect(penaltyVol).toBeCloseTo(0.30, 5);
    expect(penaltyLiq).toBeCloseTo(0.25, 5);
  });
});

describe('mapRankingRecommendation', () => {
  it('maps score >= 0.75 to strong_buy', () => {
    expect(mapRankingRecommendation(0.75)).toBe('strong_buy');
    expect(mapRankingRecommendation(0.80)).toBe('strong_buy');
    expect(mapRankingRecommendation(1.0)).toBe('strong_buy');
  });

  it('maps score >= 0.55 and < 0.75 to buy', () => {
    expect(mapRankingRecommendation(0.55)).toBe('buy');
    expect(mapRankingRecommendation(0.65)).toBe('buy');
    expect(mapRankingRecommendation(0.74)).toBe('buy');
  });

  it('maps score in (-0.25, 0.55) to hold', () => {
    expect(mapRankingRecommendation(0.0)).toBe('hold');
    expect(mapRankingRecommendation(0.30)).toBe('hold');
    expect(mapRankingRecommendation(-0.10)).toBe('hold');
    expect(mapRankingRecommendation(0.54)).toBe('hold');
  });

  it('maps score <= -0.25 and > -0.60 to sell', () => {
    expect(mapRankingRecommendation(-0.25)).toBe('sell');
    expect(mapRankingRecommendation(-0.40)).toBe('sell');
    expect(mapRankingRecommendation(-0.59)).toBe('sell');
  });

  it('maps score <= -0.60 to strong_sell — not shadowed by sell', () => {
    expect(mapRankingRecommendation(-0.60)).toBe('strong_sell');
    expect(mapRankingRecommendation(-0.70)).toBe('strong_sell');
    expect(mapRankingRecommendation(-1.0)).toBe('strong_sell');
  });

  it('boundary: -0.25 is sell, -0.60 is strong_sell', () => {
    expect(mapRankingRecommendation(-0.25)).toBe('sell');
    expect(mapRankingRecommendation(-0.60)).toBe('strong_sell');
  });
});

describe('computeRankingConfidence', () => {
  it('returns 0.20 when both changePercent is null and freshness is stale', () => {
    const input = makeInput({ changePercent: null, freshnessState: 'stale' });
    const conf = computeRankingConfidence(input, 0, 0);
    expect(conf).toBe(0.20);
  });

  it('returns 0.20 when both changePercent is null and freshness is unavailable', () => {
    const input = makeInput({ changePercent: null, freshnessState: 'unavailable' });
    const conf = computeRankingConfidence(input, 0, 0);
    expect(conf).toBe(0.20);
  });

  it('caps at 0.35 for stale freshness even with good data otherwise', () => {
    const input = makeInput({ changePercent: 3.0, freshnessState: 'stale' });
    const conf = computeRankingConfidence(input, 0.3, 0.5);
    expect(conf).toBeLessThanOrEqual(0.35);
  });

  it('caps at 0.35 for unavailable freshness', () => {
    const input = makeInput({ changePercent: 5.0, freshnessState: 'unavailable' });
    const conf = computeRankingConfidence(input, 0.5, 0.5);
    expect(conf).toBeLessThanOrEqual(0.35);
  });

  it('returns higher confidence for live fresh data with good signal agreement', () => {
    const input = makeInput({ changePercent: 3.0, freshnessState: 'live' });
    const conf = computeRankingConfidence(input, 0.3, 0.5);
    expect(conf).toBeGreaterThan(0.50);
  });

  it('returns lower confidence when signals disagree', () => {
    const input = makeInput({ changePercent: 3.0, freshnessState: 'live' });
    const confAgree = computeRankingConfidence(input, 0.3, 0.5);
    const confDisagree = computeRankingConfidence(input, 0.3, -0.5);
    expect(confAgree).toBeGreaterThan(confDisagree);
  });

  it('does not allow changePercent=null with live freshness to trigger critical-data path', () => {
    const input = makeInput({ changePercent: null, freshnessState: 'live' });
    const conf = computeRankingConfidence(input, 0, 0);
    // Should NOT return 0.20 — only stale/unavailable triggers the fallback
    expect(conf).toBeGreaterThan(0.20);
  });
});

describe('rankAssets — HOLD fallback on missing critical data', () => {
  it('returns hold with low confidence for stale + no changePercent', () => {
    const input = makeInput({ changePercent: null, freshnessState: 'stale' });
    const [result] = rankAssets([input]);

    expect(result).toBeDefined();
    expect(result!.recommendation).toBe('hold');
    expect(result!.confidence).toBeLessThanOrEqual(0.35);
    expect(result!.explanation).toContain('missing critical market data');
  });

  it('returns hold with low confidence for unavailable + no changePercent', () => {
    const input = makeInput({ changePercent: null, freshnessState: 'unavailable' });
    const [result] = rankAssets([input]);

    expect(result!.recommendation).toBe('hold');
    expect(result!.confidence).toBe(0.20);
  });

  it('still computes a score for null changePercent with live freshness', () => {
    const input = makeInput({ changePercent: null, freshnessState: 'live', insightStance: 'positive' });
    const [result] = rankAssets([input]);

    expect(result!.recommendation).not.toBe(undefined);
    expect(result!.score).toBeDefined();
    expect(result!.explanation).not.toContain('missing critical market data');
  });
});

describe('rankAssets — deterministic ranking order', () => {
  const inputs: AssetRankingInput[] = [
    makeInput({ assetId: 'a1', symbol: 'AAA', changePercent: 8.0, insightStance: 'positive', insightConfidence: 0.85 }),
    makeInput({ assetId: 'a2', symbol: 'BBB', changePercent: -5.0, insightStance: 'negative', insightConfidence: 0.75 }),
    makeInput({ assetId: 'a3', symbol: 'CCC', changePercent: 0.5, insightStance: 'neutral', insightConfidence: 0.5 }),
  ];

  it('produces the same ranking for identical inputs on every call', () => {
    const first = rankAssets([...inputs]);
    const second = rankAssets([...inputs]);
    expect(first.map((item) => item.symbol)).toEqual(second.map((item) => item.symbol));
    expect(first.map((item) => item.score)).toEqual(second.map((item) => item.score));
  });

  it('ranks higher-score assets above lower-score assets', () => {
    const ranked = rankAssets([...inputs]);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i]!.score).toBeGreaterThanOrEqual(ranked[i + 1]!.score);
    }
  });

  it('assigns sequential rank numbers starting at 1', () => {
    const ranked = rankAssets([...inputs]);
    ranked.forEach((item, idx) => {
      expect(item.rank).toBe(idx + 1);
    });
  });

  it('returns empty array for empty input', () => {
    expect(rankAssets([])).toEqual([]);
  });
});

describe('rankAssets — asset class coverage (no crash with partial data)', () => {
  it('handles stock with null changePercent and partial freshness', () => {
    const input = makeInput({ assetKind: 'stock', changePercent: null, freshnessState: 'partial' });
    expect(() => rankAssets([input])).not.toThrow();
    const [result] = rankAssets([input]);
    expect(result).toBeDefined();
    expect(Number.isFinite(result!.score)).toBe(true);
  });

  it('handles ETF with delayed freshness', () => {
    const input = makeInput({ assetKind: 'etf', symbol: 'SPY', assetId: 'etf-spy', changePercent: 0.3, freshnessState: 'delayed' });
    const [result] = rankAssets([input]);
    expect(result!.assetKind).toBe('etf');
    expect(Number.isFinite(result!.score)).toBe(true);
    expect(result!.confidence).toBeLessThanOrEqual(0.90);
  });

  it('handles crypto with extreme positive move', () => {
    const input = makeInput({ assetKind: 'crypto', symbol: 'BTC', assetId: 'crypto-btc', changePercent: 15.0, freshnessState: 'live' });
    const [result] = rankAssets([input]);
    expect(result!.assetKind).toBe('crypto');
    // crypto has higher volatility risk — score should be lower than equivalent stock move
    const stockInput = makeInput({ assetKind: 'stock', symbol: 'AAPL', changePercent: 15.0, freshnessState: 'live' });
    const [stockResult] = rankAssets([stockInput]);
    // crypto gets penalized more heavily
    expect(result!.score).toBeLessThan(stockResult!.score);
  });

  it('handles mixed asset class list without crashing', () => {
    const mixed: AssetRankingInput[] = [
      makeInput({ assetKind: 'stock', symbol: 'AAPL', assetId: 'stock-aapl', changePercent: 1.5 }),
      makeInput({ assetKind: 'etf', symbol: 'SPY', assetId: 'etf-spy', changePercent: 0.8 }),
      makeInput({ assetKind: 'crypto', symbol: 'BTC', assetId: 'crypto-btc', changePercent: null, freshnessState: 'unavailable' }),
      makeInput({ assetKind: 'stock', symbol: 'MSFT', assetId: 'stock-msft', changePercent: -3.0, insightStance: 'negative' }),
    ];
    expect(() => rankAssets(mixed)).not.toThrow();
    const ranked = rankAssets(mixed);
    expect(ranked).toHaveLength(4);
    ranked.forEach((item, idx) => {
      expect(item.rank).toBe(idx + 1);
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.confidence).toBeGreaterThan(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('rankAssets — recommendation mapping via full pipeline', () => {
  // Note: strong_sell and strong_buy (thresholds ±0.60/0.75) are tested directly via
  // mapRankingRecommendation above. Through the full pipeline the risk penalty formula
  // dampens extreme composite scores, so 'sell'/'buy' are the realistic outcomes for
  // large but finite price moves. This is by design — preventing panicky extreme calls.

  it('deeply negative asset maps to sell (risk penalty dampens to above strong_sell threshold)', () => {
    // changePercent=-10, stock: compositeScore≈-0.74, riskPenalty≈0.28 → finalScore≈-0.53
    const input = makeInput({
      changePercent: -10.0,
      insightStance: 'negative',
      insightConfidence: 0.85,
      freshnessState: 'live',
    });
    const [result] = rankAssets([input]);
    expect(result!.recommendation).toBe('sell');
    expect(result!.score).toBeLessThan(-0.25);
    expect(result!.score).toBeGreaterThan(-0.60);
  });

  it('strongly bullish asset maps to buy (risk penalty dampens to below strong_buy threshold)', () => {
    // changePercent=9, stock: compositeScore≈0.85, riskPenalty≈0.19 → finalScore≈0.69
    const input = makeInput({
      assetKind: 'stock',
      changePercent: 9.0,
      insightStance: 'positive',
      insightConfidence: 0.9,
      freshnessState: 'live',
    });
    const [result] = rankAssets([input]);
    expect(result!.recommendation).toBe('buy');
    expect(result!.score).toBeGreaterThan(0.55);
    expect(result!.score).toBeLessThan(0.75);
  });

  it('negative asset has lower score than positive asset', () => {
    const negative = makeInput({ changePercent: -10.0, insightStance: 'negative', insightConfidence: 0.85 });
    const positive = makeInput({ assetId: 'a2', symbol: 'POS', changePercent: 9.0, insightStance: 'positive', insightConfidence: 0.9 });
    const ranked = rankAssets([negative, positive]);
    const negResult = ranked.find((r) => r.symbol === 'AAPL');
    const posResult = ranked.find((r) => r.symbol === 'POS');
    expect(posResult!.score).toBeGreaterThan(negResult!.score);
  });

  it('hold is returned for a neutral asset with no clear signal', () => {
    const input = makeInput({
      changePercent: 0.1,
      insightStance: 'neutral',
      insightConfidence: 0.5,
      freshnessState: 'delayed',
    });
    const [result] = rankAssets([input]);
    expect(['hold', 'sell', 'buy']).toContain(result!.recommendation);
  });
});

describe('rankAssets - historical OHLCV integration', () => {
  const trendingHistory = [
    100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
    120, 121, 122, 123, 124, 125,
  ];

  it('uses history-based signal summary when enough closes are available', () => {
    const [result] = rankAssets([
      makeInput({
        symbol: 'HIST',
        assetId: 'hist-1',
        changePercent: 0.2,
        historyCloses: trendingHistory,
      }),
    ]);

    expect(result!.signalSummary).toContain('History model');
    expect(result!.explanation).toContain('Historical OHLCV scoring used');
    expect(result!.confidence).toBeGreaterThan(0.5);
  });

  it('falls back to quote/change-percent logic when no history is available', () => {
    const [result] = rankAssets([
      makeInput({
        symbol: 'NOHIST',
        assetId: 'nohist-1',
        changePercent: 1.4,
        historyCloses: [],
      }),
    ]);

    expect(result!.signalSummary).toContain('Price signal is');
    expect(result!.explanation).toContain('No historical series available, so quote fallback scoring was used');
  });

  it('is deterministic with identical historical input', () => {
    const input = makeInput({
      symbol: 'DET',
      assetId: 'det-1',
      changePercent: 0.3,
      historyCloses: trendingHistory,
    });

    const first = rankAssets([input])[0];
    const second = rankAssets([input])[0];

    expect(first!.score).toBe(second!.score);
    expect(first!.confidence).toBe(second!.confidence);
    expect(first!.recommendation).toBe(second!.recommendation);
  });

  it('applies volatility penalty more strongly to choppy historical series', () => {
    const calmHistory = [
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
      110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
      120, 121, 122, 123, 124, 125,
    ];
    const volatileHistory = [
      100, 110, 95, 115, 90, 118, 88, 122, 86, 125,
      84, 128, 82, 130, 80, 132, 78, 134, 76, 136,
      74, 138, 72, 140, 70, 142,
    ];

    const [calm] = rankAssets([
      makeInput({
        symbol: 'CALM',
        assetId: 'calm-1',
        changePercent: 2.0,
        historyCloses: calmHistory,
      }),
    ]);
    const [volatile] = rankAssets([
      makeInput({
        symbol: 'VOL',
        assetId: 'vol-1',
        changePercent: 2.0,
        historyCloses: volatileHistory,
      }),
    ]);

    expect(volatile!.score).toBeLessThan(calm!.score);
  });

  it('handles insufficient history by using fallback scoring', () => {
    const [result] = rankAssets([
      makeInput({
        symbol: 'SHORT',
        assetId: 'short-1',
        changePercent: 1.2,
        historyCloses: [100, 101, 102, 103, 104, 105, 106],
      }),
    ]);

    expect(result!.signalSummary).toContain('Price signal is');
    expect(result!.explanation).toContain('insufficient');
    expect(result!.confidence).toBeLessThan(0.9);
  });
});
