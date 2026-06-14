import { describe, expect, it } from 'vitest';

import { deriveSignalSnapshot } from '../analysis/derive-signal-snapshot';
import {
  TEST_EMPTY_SERIES,
  TEST_FLAT_SERIES,
  TEST_NAN_MIDDLE_SERIES,
  TEST_UPTREND_SERIES,
} from './fixtures';

describe('deriveSignalSnapshot', () => {
  it('uptrend: pre-computed composite, interpretation and confidence', () => {
    const snap = deriveSignalSnapshot('AAPL', TEST_UPTREND_SERIES);

    expect(snap.assetId).toBe('AAPL');
    expect(snap.latestPrice).toBe(120);
    expect(snap.shortMovingAverage).toBe(110);
    expect(snap.longMovingAverage).toBe(110); // min(20, len)=5 → same window
    expect(snap.momentumValue).toBe(20);
    expect(snap.volatilityValue).toBeCloseTo(7.0710678, 6);
    expect(snap.trendStrengthValue).toBeCloseTo(2.8284271, 6);
    expect(snap.compositeScoreValue).toBeCloseTo(0.1498365, 6);
    expect(snap.interpretation).toBe('bullish');
    expect(snap.confidenceScore).toBeCloseTo(0.2163396, 6);
  });

  it('flat series: neutral with clamped minimum confidence', () => {
    const snap = deriveSignalSnapshot('FLAT', TEST_FLAT_SERIES);

    expect(snap.compositeScoreValue).toBe(0);
    expect(snap.interpretation).toBe('neutral');
    expect(snap.volatilityValue).toBe(0);
    expect(snap.momentumValue).toBe(0);
    expect(snap.confidenceScore).toBe(0.2); // clamped floor
  });

  it('empty series: safe zero snapshot, no throw, no NaN', () => {
    const snap = deriveSignalSnapshot('EMPTY', TEST_EMPTY_SERIES);

    expect(snap.latestPrice).toBeNull();
    expect(snap.shortMovingAverage).toBeNull();
    expect(snap.longMovingAverage).toBeNull();
    expect(snap.momentumValue).toBeNull();
    expect(snap.compositeScoreValue).toBe(0);
    expect(snap.interpretation).toBe('neutral');
    expect(Number.isFinite(snap.confidenceScore)).toBe(true);
  });

  it('NaN input: never emits a NaN score or NaN confidence', () => {
    const snap = deriveSignalSnapshot('NAN', TEST_NAN_MIDDLE_SERIES);

    expect(Number.isFinite(snap.compositeScoreValue)).toBe(true);
    expect(Number.isFinite(snap.confidenceScore)).toBe(true);
    expect(Number.isFinite(snap.volatilityValue)).toBe(true);
    expect(Number.isFinite(snap.trendStrengthValue)).toBe(true);
    expect(snap.compositeScoreValue).toBeGreaterThanOrEqual(-1);
    expect(snap.compositeScoreValue).toBeLessThanOrEqual(1);
    expect(snap.confidenceScore).toBeGreaterThanOrEqual(0.2);
    expect(snap.confidenceScore).toBeLessThanOrEqual(0.95);
  });

  it('bounds: composite in [-1,1] and confidence in [0.2,0.95] for any fixture', () => {
    for (const series of [TEST_EMPTY_SERIES, TEST_FLAT_SERIES, TEST_UPTREND_SERIES, TEST_NAN_MIDDLE_SERIES]) {
      const snap = deriveSignalSnapshot('X', series);
      expect(snap.compositeScoreValue).toBeGreaterThanOrEqual(-1);
      expect(snap.compositeScoreValue).toBeLessThanOrEqual(1);
      expect(snap.confidenceScore).toBeGreaterThanOrEqual(0.2);
      expect(snap.confidenceScore).toBeLessThanOrEqual(0.95);
    }
  });

  it('deterministic: same input yields a deep-equal snapshot', () => {
    expect(deriveSignalSnapshot('AAPL', TEST_UPTREND_SERIES)).toEqual(
      deriveSignalSnapshot('AAPL', TEST_UPTREND_SERIES),
    );
  });
});
