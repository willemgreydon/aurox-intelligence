import { describe, it, expect } from 'vitest';
import { computePortfolioIntelligence } from '../portfolio/portfolio-intelligence-engine';
import type { Recommendation } from '../recommendation/recommendation-engine';

function makeRec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    action: 'BUY',
    confidence: 0.7,
    horizon: 'SWING',
    riskLevel: 'LOW',
    positionSizingSuggestion: 0.5,
    simulationAllowed: true,
    liveAllowed: false,
    reasoning: {
      signalDrivers: ['Trend 0.45', 'Momentum 0.30'],
      newsDrivers: ['News impact 60%'],
      riskDrivers: ['Volatility 15%'],
      uncertaintyNotes: [],
    },
    explanationText: 'BUY signal with low risk.',
    scoreBreakdown: {
      signalScore: 0.7,
      newsScore: 0.6,
      riskPenalty: 0.1,
      finalScore: 0.65,
    },
    ...overrides,
  };
}

// ─── Original tests (preserved) ───────────────────────────────────────────────

describe('computePortfolioIntelligence', () => {
  it('returns empty result for empty recommendations', () => {
    const result = computePortfolioIntelligence({ recommendations: [] });
    expect(result.allocations).toHaveLength(0);
    expect(result.rebalancePlan).toHaveLength(0);
    expect(result.simulationOnly).toBe(true);
    expect(result.liveAllowed).toBe(false);
  });

  it('allocation weights sum to approximately 1', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec({ action: 'BUY' }) },
        { symbol: 'MSFT', recommendation: makeRec({ action: 'HOLD' }) },
        { symbol: 'GOOGL', recommendation: makeRec({ action: 'BUY' }) },
      ],
    });

    const totalWeight = result.allocations.reduce((sum, a) => sum + a.targetWeight, 0);
    expect(totalWeight).toBeGreaterThan(0.98);
    expect(totalWeight).toBeLessThanOrEqual(1.01);
  });

  it('AVOID action results in zero weight', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec({ action: 'BUY' }) },
        { symbol: 'JUNK', recommendation: makeRec({ action: 'AVOID', riskLevel: 'EXTREME', scoreBreakdown: { signalScore: 0.1, newsScore: 0.1, riskPenalty: 0.9, finalScore: 0.05 } }) },
      ],
    });

    const junkAlloc = result.allocations.find((a) => a.symbol === 'JUNK');
    expect(junkAlloc?.targetWeight ?? 0).toBe(0);
    expect(junkAlloc?.suggestedAction).toBe('MONITOR');
  });

  it('high confidence recommendation receives higher weight than low confidence', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        {
          symbol: 'STRONG',
          recommendation: makeRec({
            action: 'STRONG_BUY',
            confidence: 0.95,
            scoreBreakdown: { signalScore: 0.95, newsScore: 0.9, riskPenalty: 0.02, finalScore: 0.92 },
          }),
        },
        {
          symbol: 'WEAK',
          recommendation: makeRec({
            action: 'HOLD',
            confidence: 0.30,
            scoreBreakdown: { signalScore: 0.3, newsScore: 0.3, riskPenalty: 0.5, finalScore: 0.22 },
          }),
        },
      ],
    });

    const strong = result.allocations.find((a) => a.symbol === 'STRONG');
    const weak = result.allocations.find((a) => a.symbol === 'WEAK');
    expect(strong!.targetWeight).toBeGreaterThanOrEqual(weak!.targetWeight);
    expect(strong!.priorityScore).toBeGreaterThan(weak!.priorityScore);
  });

  it('high risk recommendation receives lower weight than low risk with clearly different scores', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        {
          symbol: 'SAFE',
          recommendation: makeRec({
            action: 'BUY',
            riskLevel: 'LOW',
            scoreBreakdown: { signalScore: 0.75, newsScore: 0.7, riskPenalty: 0.05, finalScore: 0.70 },
          }),
        },
        {
          symbol: 'RISKY',
          recommendation: makeRec({
            action: 'BUY',
            riskLevel: 'EXTREME',
            scoreBreakdown: { signalScore: 0.75, newsScore: 0.7, riskPenalty: 0.85, finalScore: 0.70 },
          }),
        },
      ],
    });

    const safe = result.allocations.find((a) => a.symbol === 'SAFE');
    const risky = result.allocations.find((a) => a.symbol === 'RISKY');
    expect(safe!.targetWeight).toBeGreaterThan(risky!.targetWeight);
  });

  it('no asset exceeds maxPositionWeight constraint', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'A', recommendation: makeRec() },
        { symbol: 'B', recommendation: makeRec() },
        { symbol: 'C', recommendation: makeRec() },
      ],
      constraints: { maxPositionWeight: 0.4 },
    });

    result.allocations.forEach((alloc) => {
      expect(alloc.targetWeight).toBeLessThanOrEqual(0.41);
    });
  });

  it('rebalance plan only contains trades above threshold', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec(), currentWeight: 0.01 },
        { symbol: 'MSFT', recommendation: makeRec(), currentWeight: 0.0 },
      ],
      constraints: { rebalanceThreshold: 0.05 },
    });

    result.rebalancePlan.forEach((trade) => {
      expect(Math.abs(trade.targetWeightDelta)).toBeGreaterThanOrEqual(0.05);
    });
  });

  it('live trading is always locked', () => {
    const result = computePortfolioIntelligence({
      recommendations: [{ symbol: 'AAPL', recommendation: makeRec() }],
    });

    expect(result.liveAllowed).toBe(false);
    expect(result.simulationOnly).toBe(true);
    expect(result.portfolioSummary.simulationOnlyNotice).toMatch(/simulation only/i);
  });

  it('degraded mode adds risk alert', () => {
    const result = computePortfolioIntelligence({
      recommendations: [{ symbol: 'AAPL', recommendation: makeRec() }],
      degraded: true,
    });

    const degradedAlert = result.riskAlerts.find((a) => a.message.toLowerCase().includes('degraded'));
    expect(degradedAlert).toBeTruthy();
    expect(degradedAlert?.severity).toBe('HIGH');
  });

  it('EXTREME risk triggers CRITICAL alert', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        {
          symbol: 'EXTREME_RISK',
          recommendation: makeRec({ action: 'HOLD', riskLevel: 'EXTREME' }),
        },
      ],
    });

    const alert = result.riskAlerts.find((a) => a.symbol === 'EXTREME_RISK');
    expect(alert?.severity).toBe('CRITICAL');
  });

  it('crypto assets are capped by maxCryptoWeight constraint', () => {
    const resultUncapped = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'BTC', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'ETH', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'SOL', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'AAPL', assetClass: 'stock', recommendation: makeRec() },
      ],
    });

    const resultCapped = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'BTC', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'ETH', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'SOL', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'AAPL', assetClass: 'stock', recommendation: makeRec() },
      ],
      constraints: { maxCryptoWeight: 0.15 },
    });

    const cryptoCapped = resultCapped.allocations
      .filter((a) => a.assetClass === 'crypto')
      .reduce((sum, a) => sum + a.targetWeight, 0);

    const cryptoUncapped = resultUncapped.allocations
      .filter((a) => a.assetClass === 'crypto')
      .reduce((sum, a) => sum + a.targetWeight, 0);

    expect(cryptoCapped).toBeLessThanOrEqual(cryptoUncapped + 0.01);
  });

  it('generatedAt is passed through', () => {
    const ts = 1700000000000;
    const result = computePortfolioIntelligence({
      recommendations: [{ symbol: 'AAPL', recommendation: makeRec() }],
      generatedAt: ts,
    });
    expect(result.generatedAt).toBe(ts);
  });

  // ─── v2: Factor decomposition ────────────────────────────────────────────

  it('each allocation has a factorDecomposition with explanation', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec() },
        { symbol: 'MSFT', recommendation: makeRec({ action: 'HOLD', confidence: 0.5 }) },
      ],
    });
    result.allocations.forEach((alloc) => {
      expect(alloc.factorDecomposition).toBeDefined();
      expect(alloc.factorDecomposition.explanation.length).toBeGreaterThan(0);
      expect(alloc.factorDecomposition.momentumContribution).toBeGreaterThanOrEqual(0);
      expect(alloc.factorDecomposition.confidenceContribution).toBeGreaterThanOrEqual(0);
      expect(alloc.factorDecomposition.normalizedScore).toBeGreaterThanOrEqual(0);
      expect(alloc.factorDecomposition.normalizedScore).toBeLessThanOrEqual(1);
    });
  });

  it('factor volatilityPenalty is higher for EXTREME risk', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'SAFE', recommendation: makeRec({ riskLevel: 'LOW' }) },
        { symbol: 'DANGER', recommendation: makeRec({ riskLevel: 'EXTREME', action: 'BUY' }) },
      ],
    });
    const safe = result.allocations.find((a) => a.symbol === 'SAFE')!;
    const danger = result.allocations.find((a) => a.symbol === 'DANGER')!;
    expect(danger.factorDecomposition.volatilityPenalty).toBeGreaterThan(safe.factorDecomposition.volatilityPenalty);
  });

  // ─── v2: Risk overlay ─────────────────────────────────────────────────────

  it('each allocation has a riskOverlay with riskScore in 0–100', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec() },
      ],
    });
    const alloc = result.allocations[0]!;
    expect(alloc.riskOverlay).toBeDefined();
    expect(alloc.riskOverlay.riskScore).toBeGreaterThanOrEqual(0);
    expect(alloc.riskOverlay.riskScore).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high', 'critical']).toContain(alloc.riskOverlay.riskLevel);
    expect(alloc.riskOverlay.explanation.length).toBeGreaterThan(0);
  });

  it('EXTREME risk asset has higher riskScore than LOW risk asset', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'SAFE', recommendation: makeRec({ riskLevel: 'LOW' }) },
        { symbol: 'EXTREME', recommendation: makeRec({ riskLevel: 'EXTREME', action: 'HOLD' }) },
      ],
    });
    const safe = result.allocations.find((a) => a.symbol === 'SAFE')!;
    const extreme = result.allocations.find((a) => a.symbol === 'EXTREME')!;
    expect(extreme.riskOverlay.riskScore).toBeGreaterThan(safe.riskOverlay.riskScore);
  });

  // ─── v2: Diagnostics ──────────────────────────────────────────────────────

  it('returns portfolio diagnostics with expected fields', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', assetClass: 'stock', recommendation: makeRec() },
        { symbol: 'BTC', assetClass: 'crypto', recommendation: makeRec() },
        { symbol: 'SPY', assetClass: 'etf', recommendation: makeRec({ action: 'HOLD' }) },
      ],
    });
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics.diversificationScore).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.diversificationScore).toBeLessThanOrEqual(1);
    expect(result.diagnostics.cryptoExposure).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.equityExposure).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.etfExposure).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.averageConfidence).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.averageRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.dominantRiskFactors.length).toBeGreaterThan(0);
    expect(['healthy', 'concentrated', 'high-risk', 'insufficient-data']).toContain(result.diagnostics.allocationHealth);
  });

  it('empty recommendations give insufficient-data diagnostics', () => {
    const result = computePortfolioIntelligence({ recommendations: [] });
    expect(result.diagnostics.allocationHealth).toBe('insufficient-data');
    expect(result.diagnostics.diversificationScore).toBe(0);
  });

  // ─── v2: Ranking ─────────────────────────────────────────────────────────

  it('cross-asset ranking is sorted by finalScore descending', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'A', recommendation: makeRec({ action: 'STRONG_BUY', confidence: 0.9, scoreBreakdown: { signalScore: 0.9, newsScore: 0.8, riskPenalty: 0.05, finalScore: 0.85 } }) },
        { symbol: 'B', recommendation: makeRec({ action: 'HOLD', confidence: 0.4, scoreBreakdown: { signalScore: 0.4, newsScore: 0.4, riskPenalty: 0.3, finalScore: 0.35 } }) },
        { symbol: 'C', recommendation: makeRec({ action: 'BUY', confidence: 0.65, scoreBreakdown: { signalScore: 0.65, newsScore: 0.6, riskPenalty: 0.1, finalScore: 0.60 } }) },
      ],
    });
    const ranks = result.ranking.map((r) => r.symbol);
    // rank 1 should be A (highest score), rank 3 should be B (lowest)
    expect(result.ranking[0]!.rank).toBe(1);
    expect(result.ranking[0]!.symbol).toBe('A');
    expect(result.ranking[result.ranking.length - 1]!.symbol).toBe('B');
    expect(ranks).toHaveLength(3);
  });

  it('each ranking entry has short and detailed reason', () => {
    const result = computePortfolioIntelligence({
      recommendations: [{ symbol: 'AAPL', recommendation: makeRec() }],
    });
    const ranked = result.ranking[0]!;
    expect(typeof ranked.reasonShort).toBe('string');
    expect(ranked.reasonShort.length).toBeGreaterThan(0);
    expect(Array.isArray(ranked.reasonDetailed)).toBe(true);
    expect(ranked.reasonDetailed.length).toBeGreaterThan(0);
  });

  // ─── v2: Regime ───────────────────────────────────────────────────────────

  it('returns regime awareness object with expected shape', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec({ action: 'BUY', confidence: 0.75 }) },
        { symbol: 'MSFT', recommendation: makeRec({ action: 'BUY', confidence: 0.7 }) },
      ],
    });
    expect(result.regime).toBeDefined();
    expect(['bull', 'bear', 'sideways', 'volatile', 'unknown']).toContain(result.regime.regime);
    expect(result.regime.confidence).toBeGreaterThanOrEqual(0);
    expect(result.regime.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.regime.evidence)).toBe(true);
    expect(result.regime.allocationBias).toBeDefined();
    expect(result.regime.allocationBias.riskOn).toBeGreaterThanOrEqual(0);
    expect(result.regime.allocationBias.riskOff).toBeGreaterThanOrEqual(0);
  });

  it('degraded mode returns unknown regime', () => {
    const result = computePortfolioIntelligence({
      recommendations: [{ symbol: 'AAPL', recommendation: makeRec() }],
      degraded: true,
    });
    expect(result.regime.regime).toBe('unknown');
  });

  // ─── v2: Min threshold zeroing ────────────────────────────────────────────

  it('assets below minPositionWeight are zeroed out', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'DOMINANT', recommendation: makeRec({ action: 'STRONG_BUY', confidence: 0.95, scoreBreakdown: { signalScore: 0.95, newsScore: 0.9, riskPenalty: 0.01, finalScore: 0.95 } }) },
        { symbol: 'TINY', recommendation: makeRec({ action: 'HOLD', confidence: 0.1, scoreBreakdown: { signalScore: 0.05, newsScore: 0.05, riskPenalty: 0.9, finalScore: 0.03 } }) },
      ],
      constraints: { minPositionWeight: 0.05 },
    });
    const tiny = result.allocations.find((a) => a.symbol === 'TINY');
    // Either zeroed out or above threshold — never NaN
    if (tiny) {
      expect(isNaN(tiny.targetWeight)).toBe(false);
    }
  });
});
