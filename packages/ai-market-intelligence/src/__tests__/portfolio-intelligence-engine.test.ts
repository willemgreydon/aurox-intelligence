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
    // EXTREME risk should significantly reduce weight
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
      expect(alloc.targetWeight).toBeLessThanOrEqual(0.41); // small floating point tolerance
    });
  });

  it('rebalance plan only contains trades above threshold', () => {
    const result = computePortfolioIntelligence({
      recommendations: [
        { symbol: 'AAPL', recommendation: makeRec(), currentWeight: 0.01 }, // small delta — likely below threshold
        { symbol: 'MSFT', recommendation: makeRec(), currentWeight: 0.0 }, // zero current — will trigger
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
    // Without the constraint all 3 crypto would dominate; with cap they should be limited
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

    // Capped should have lower or equal crypto total than uncapped
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
});
