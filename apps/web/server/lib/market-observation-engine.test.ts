import { describe, expect, it } from 'vitest';
import {
  computeAnomalyScore,
  computeTradeReadiness,
  detectMarketRegime,
  severityFromScore,
} from './market-observation-engine';

describe('market-observation-engine', () => {
  it('maps anomaly score severity deterministically', () => {
    expect(severityFromScore(10)).toBe('INFO');
    expect(severityFromScore(30)).toBe('WATCH');
    expect(severityFromScore(60)).toBe('WARNING');
    expect(severityFromScore(90)).toBe('CRITICAL');
  });

  it('computes anomaly score from provided components', () => {
    const score = computeAnomalyScore({
      priceShock: 0.8,
      volatilityShock: 0.7,
      confidenceDrop: 0.6,
      correlationBreakdown: 0.5,
      providerStaleness: 0.2,
      newsShock: 0.9,
      liquidityStress: 0.4,
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(50);
  });

  it('returns null anomaly score when all inputs are missing', () => {
    const score = computeAnomalyScore({
      priceShock: null,
      volatilityShock: null,
      confidenceDrop: null,
      correlationBreakdown: null,
      providerStaleness: null,
      newsShock: null,
      liquidityStress: null,
    });
    expect(score).toBeNull();
  });

  it('detects high-volatility regime when crypto volatility is elevated', () => {
    const regime = detectMarketRegime({
      averageSignalScore: 0.15,
      averageConfidence: 0.7,
      breadth: 0.55,
      newsSentiment: 0.1,
      cryptoVolatility: 0.9,
      providerQuality: 0.8,
      liquidityStress: 0.3,
    });
    expect(regime.label).toBe('high-volatility');
  });

  it('blocks readiness when data quality is degraded', () => {
    const readiness = computeTradeReadiness({
      signalAlignment: 0.6,
      confidence: 0.8,
      riskScore: 28,
      liquidityScore: 0.7,
      newsRisk: 'LOW',
      providerDegraded: true,
      portfolioConcentrationRisk: 0.2,
      microTradingFit: 0.8,
    });
    expect(readiness.status).toBe('BLOCKED_BY_DATA_QUALITY');
  });

  it('returns ready-for-simulation under healthy conditions', () => {
    const readiness = computeTradeReadiness({
      signalAlignment: 0.55,
      confidence: 0.72,
      riskScore: 34,
      liquidityScore: 0.78,
      newsRisk: 'LOW',
      providerDegraded: false,
      portfolioConcentrationRisk: 0.3,
      microTradingFit: 0.7,
    });
    expect(readiness.status).toBe('READY_FOR_SIMULATION');
  });
});
