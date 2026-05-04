import { describe, expect, it } from 'vitest';
import { computeRecommendation } from '../recommendation/recommendation-engine';
import { buildRecommendationExplanation } from '../recommendation/recommendation-explainer';

function baseInput() {
  return {
    symbol: 'AAPL',
    signalScore: 0.8,
    newsImpactScore: 0.7,
    riskPenalty: 0.2,
    liquidityAdjustment: 0.8,
    trend: 0.7,
    momentum: 0.65,
    volatility: 0.2,
    riskFlags: [],
    newsRiskFlag: 'LOW' as const,
    providerDegraded: false,
    degraded: false,
    signalDrivers: ['trend positive', 'momentum positive'],
    newsDrivers: ['positive earnings sentiment'],
    riskDrivers: ['volatility contained'],
  };
}

describe('computeRecommendation', () => {
  it('strong signals produce BUY or STRONG_BUY', () => {
    const rec = computeRecommendation(baseInput());
    expect(['BUY', 'STRONG_BUY']).toContain(rec.action);
  });

  it('negative signals produce SELL side action', () => {
    const rec = computeRecommendation({
      ...baseInput(),
      signalScore: -0.7,
      newsImpactScore: 0.2,
      riskPenalty: 0.5,
      trend: -0.8,
      momentum: -0.7,
      volatility: 0.6,
    });
    expect(['SELL', 'STRONG_SELL', 'AVOID']).toContain(rec.action);
  });

  it('conflicting signals can produce HOLD/REDUCE', () => {
    const rec = computeRecommendation({
      ...baseInput(),
      signalScore: 0.05,
      newsImpactScore: 0.45,
      riskPenalty: 0.4,
      trend: 0.2,
      momentum: -0.2,
    });
    expect(['HOLD', 'REDUCE', 'SELL']).toContain(rec.action);
  });

  it('high risk downgrades action', () => {
    const rec = computeRecommendation({
      ...baseInput(),
      signalScore: 0.9,
      newsRiskFlag: 'HIGH',
      riskPenalty: 0.7,
      volatility: 0.75,
    });
    expect(rec.action).not.toBe('STRONG_BUY');
  });

  it('extreme risk forces AVOID', () => {
    const rec = computeRecommendation({
      ...baseInput(),
      newsRiskFlag: 'CRITICAL',
      riskPenalty: 0.9,
      volatility: 0.95,
    });
    expect(rec.action).toBe('AVOID');
  });

  it('degraded provider lowers confidence', () => {
    const healthy = computeRecommendation(baseInput());
    const degraded = computeRecommendation({ ...baseInput(), providerDegraded: true, degraded: true });
    expect(degraded.confidence).toBeLessThan(healthy.confidence);
  });

  it('liveAllowed is always false', () => {
    const rec = computeRecommendation(baseInput());
    expect(rec.liveAllowed).toBe(false);
  });
});

describe('buildRecommendationExplanation', () => {
  it('uses only provided drivers', () => {
    const rec = computeRecommendation(baseInput());
    const text = buildRecommendationExplanation(rec);
    expect(text).toContain('trend positive');
    expect(text).toContain('positive earnings sentiment');
    expect(text).not.toContain('RSI divergence');
  });
});
