import { describe, expect, it } from 'vitest';
import type { SignalSnapshot } from '@repo/signals';

import { buildForecast, buildForecastFromSignal } from '../engine/build-forecast';

const PRODUCED_AT = '2026-01-01T00:00:00.000Z';
const OTHER_PRODUCED_AT = '2026-02-02T12:30:00.000Z';

// Deterministic snapshot fixture — plain object, no random/time inputs.
function makeSnapshot(overrides: Partial<SignalSnapshot> = {}): SignalSnapshot {
  return {
    assetId: 'AAPL',
    name: 'AAPL composite signal',
    value: 0.6,
    interpretation: 'bullish',
    latestPrice: 120,
    shortMovingAverage: 115,
    longMovingAverage: 110,
    momentumValue: 20,
    volatilityValue: 5,
    trendStrengthValue: 4,
    compositeScoreValue: 0.6,
    confidenceScore: 0.7,
    scoreBreakdown: { movingAverageContrib: 0.05, momentumContrib: 0.16, trendContrib: 0.4 },
    ...overrides,
  };
}

function expectWeightsValid(weights: { bullish: number; base: number; bearish: number }) {
  for (const w of [weights.bullish, weights.base, weights.bearish]) {
    expect(w).toBeGreaterThanOrEqual(0);
    expect(w).toBeLessThanOrEqual(1);
  }
  expect(weights.bullish + weights.base + weights.bearish).toBeCloseTo(1, 10);
}

describe('buildForecast (baseline)', () => {
  it('echoes the passed-in producedAt (no internal Date.now)', () => {
    expect(buildForecast('AAPL', PRODUCED_AT).producedAt).toBe(PRODUCED_AT);
  });

  it('returns a neutral baseline within bounds', () => {
    const forecast = buildForecast('AAPL', PRODUCED_AT);
    expect(forecast.directionalBias).toBe('neutral');
    expect(forecast.horizon).toBe('short');
    expect(forecast.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(forecast.confidenceScore).toBeLessThanOrEqual(1);
    expectWeightsValid(forecast.scenarioWeights);
  });

  it('is deterministic: same args yield a deep-equal forecast', () => {
    expect(buildForecast('AAPL', PRODUCED_AT)).toEqual(buildForecast('AAPL', PRODUCED_AT));
  });
});

describe('buildForecastFromSignal', () => {
  it('maps interpretation to directional bias', () => {
    expect(buildForecastFromSignal(makeSnapshot({ interpretation: 'bullish' }), PRODUCED_AT).directionalBias).toBe('bullish');
    expect(buildForecastFromSignal(makeSnapshot({ interpretation: 'bearish' }), PRODUCED_AT).directionalBias).toBe('bearish');
    expect(buildForecastFromSignal(makeSnapshot({ interpretation: 'neutral' }), PRODUCED_AT).directionalBias).toBe('neutral');
  });

  it('confidence stays within the [0.35, 0.9] band', () => {
    // Low signal → clamped up to the 0.35 floor.
    const low = buildForecastFromSignal(makeSnapshot({ compositeScoreValue: 0.01, volatilityValue: 0 }), PRODUCED_AT);
    expect(low.confidenceScore).toBe(0.35);

    // Mid signal → 0.6 + min(5/100, 0.15)=0.05 → 0.65.
    const mid = buildForecastFromSignal(makeSnapshot({ compositeScoreValue: 0.6, volatilityValue: 5 }), PRODUCED_AT);
    expect(mid.confidenceScore).toBeCloseTo(0.65, 10);

    // High signal → clamped down to the 0.9 ceiling.
    const high = buildForecastFromSignal(makeSnapshot({ compositeScoreValue: 0.95, volatilityValue: 20 }), PRODUCED_AT);
    expect(high.confidenceScore).toBe(0.9);
  });

  it('scenario weights are valid and sum to 1', () => {
    expectWeightsValid(buildForecastFromSignal(makeSnapshot(), PRODUCED_AT).scenarioWeights);
    expectWeightsValid(buildForecastFromSignal(makeSnapshot({ interpretation: 'bearish' }), PRODUCED_AT).scenarioWeights);
    expectWeightsValid(buildForecastFromSignal(makeSnapshot({ interpretation: 'neutral' }), PRODUCED_AT).scenarioWeights);
  });

  it('echoes producedAt and is otherwise deterministic across timestamps', () => {
    const a = buildForecastFromSignal(makeSnapshot(), PRODUCED_AT);
    const b = buildForecastFromSignal(makeSnapshot(), PRODUCED_AT);
    expect(a).toEqual(b); // fully deterministic for identical inputs

    const c = buildForecastFromSignal(makeSnapshot(), OTHER_PRODUCED_AT);
    expect(c.producedAt).toBe(OTHER_PRODUCED_AT);
    // Only producedAt differs when only the timestamp changes.
    expect({ ...c, producedAt: PRODUCED_AT }).toEqual(a);
  });
});
