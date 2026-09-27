import { describe, expect, it } from 'vitest';
import { CANDLE_LAB_SCENARIOS } from '../candles/lab-scenarios';
import type { CandleLabScenario } from '../candles/lab-scenarios';
import { computeCandleIntelligence } from '../candles/candle-intelligence';
import { CANDLE_MIN_BARS } from '../candles/types';
import type { CandlePatternName, MarketRegime } from '@repo/api-contracts';

const GENERATED_AT = '2025-06-01T00:00:00.000Z';

function analyze(scenario: CandleLabScenario) {
  return computeCandleIntelligence({
    symbol: scenario.symbol,
    assetClass: scenario.assetClass,
    generatedAt: GENERATED_AT,
    bars: scenario.build(),
  });
}

describe('CANDLE_LAB_SCENARIOS', () => {
  it('exposes a stable, non-empty, unique-id scenario set', () => {
    expect(CANDLE_LAB_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    const ids = CANDLE_LAB_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every scenario has enough valid bars for a full read (never insufficient)', () => {
    for (const scenario of CANDLE_LAB_SCENARIOS) {
      const bars = scenario.build();
      expect(bars.length).toBeGreaterThanOrEqual(CANDLE_MIN_BARS);
      const intel = analyze(scenario);
      expect(intel.hasInsufficientData).toBe(false);
      expect(intel.barsAnalyzed).toBeGreaterThanOrEqual(CANDLE_MIN_BARS);
    }
  });

  it('is fully deterministic — identical bytes on repeated builds and analyses', () => {
    for (const scenario of CANDLE_LAB_SCENARIOS) {
      expect(JSON.stringify(scenario.build())).toBe(JSON.stringify(scenario.build()));
      expect(JSON.stringify(analyze(scenario))).toBe(JSON.stringify(analyze(scenario)));
    }
  });

  it('produces the intended regime and headline pattern for each scenario', () => {
    const expectations: Record<string, { regime: MarketRegime; pattern: CandlePatternName }> = {
      'hammer-support': { regime: 'downtrend', pattern: 'hammer' },
      'bearish-engulfing-resistance': { regime: 'uptrend', pattern: 'bearish_engulfing' },
      'bullish-breakout': { regime: 'uptrend', pattern: 'bullish_marubozu' },
      'range-doji': { regime: 'range', pattern: 'long_legged_doji' },
      'evening-star': { regime: 'uptrend', pattern: 'evening_star' },
    };
    for (const scenario of CANDLE_LAB_SCENARIOS) {
      const expected = expectations[scenario.id];
      expect(expected, `missing expectation for ${scenario.id}`).toBeDefined();
      const intel = analyze(scenario);
      expect(intel.structure.regime, scenario.id).toBe(expected!.regime);
      const names = intel.detectedPatterns.map((p) => p.pattern);
      expect(names, scenario.id).toContain(expected!.pattern);
    }
  });

  it('bullish breakout resolves to a confirmed bullish read', () => {
    const breakout = CANDLE_LAB_SCENARIOS.find((s) => s.id === 'bullish-breakout')!;
    const intel = analyze(breakout);
    expect(intel.direction).toBe('bullish');
    expect(intel.structure.breakout).toBe('bullish');
    expect(intel.score).toBeGreaterThan(0.2);
  });

  it('keeps every score and confidence within contract bounds', () => {
    for (const scenario of CANDLE_LAB_SCENARIOS) {
      const intel = analyze(scenario);
      expect(intel.score).toBeGreaterThanOrEqual(-1);
      expect(intel.score).toBeLessThanOrEqual(1);
      expect(intel.confidence).toBeGreaterThanOrEqual(0);
      expect(intel.confidence).toBeLessThanOrEqual(1);
      for (const p of intel.detectedPatterns) {
        expect(p.confidence).toBeGreaterThanOrEqual(0);
        expect(p.confidence).toBeLessThanOrEqual(1);
      }
    }
  });
});
