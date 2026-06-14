import { describe, expect, it } from 'vitest';

import { movingAverage } from '../indicators/moving-average';
import { momentum } from '../indicators/momentum';
import { volatility } from '../indicators/volatility';
import { trendStrength } from '../indicators/trend-strength';
import { compositeScore } from '../scoring/composite-score';
import { signalScore } from '../scoring/signal-score';
import {
  TEST_EMPTY_SERIES,
  TEST_FLAT_SERIES,
  TEST_INFINITY_SERIES,
  TEST_NAN_LAST_SERIES,
  TEST_NAN_MIDDLE_SERIES,
  TEST_SINGLE_BAR,
  TEST_UPTREND_SERIES,
} from './fixtures';

describe('movingAverage', () => {
  it('normal: averages the last `period` values', () => {
    expect(movingAverage(TEST_UPTREND_SERIES, 5)).toBe(110);
    expect(movingAverage(TEST_UPTREND_SERIES, 3)).toBe(115); // (110+115+120)/3
  });

  it('min bars exact: period equal to length is allowed', () => {
    expect(movingAverage(TEST_UPTREND_SERIES, 5)).toBe(110);
  });

  it('below min bars: period greater than length returns null', () => {
    expect(movingAverage(TEST_UPTREND_SERIES, 6)).toBeNull();
    expect(movingAverage(TEST_EMPTY_SERIES, 1)).toBeNull();
  });

  it('non-positive period returns null', () => {
    expect(movingAverage(TEST_UPTREND_SERIES, 0)).toBeNull();
    expect(movingAverage(TEST_UPTREND_SERIES, -3)).toBeNull();
  });

  it('flat series: average equals the constant', () => {
    expect(movingAverage(TEST_FLAT_SERIES, 5)).toBe(50);
  });

  it('NaN/Infinity input: returns null, never a NaN score', () => {
    expect(movingAverage(TEST_NAN_MIDDLE_SERIES, 5)).toBeNull();
    expect(movingAverage(TEST_INFINITY_SERIES, 3)).toBeNull();
  });
});

describe('momentum', () => {
  it('normal: last minus first', () => {
    expect(momentum(TEST_UPTREND_SERIES)).toBe(20);
  });

  it('min bars exact: exactly 2 bars is allowed', () => {
    expect(momentum([100, 130])).toBe(30);
  });

  it('below min bars: fewer than 2 returns null', () => {
    expect(momentum(TEST_SINGLE_BAR)).toBeNull();
    expect(momentum(TEST_EMPTY_SERIES)).toBeNull();
  });

  it('flat series: zero momentum', () => {
    expect(momentum(TEST_FLAT_SERIES)).toBe(0);
  });

  it('NaN endpoint: returns null, never a NaN score', () => {
    expect(momentum(TEST_NAN_LAST_SERIES)).toBeNull();
    expect(momentum([NaN, 110, 120])).toBeNull();
  });
});

describe('volatility', () => {
  it('normal: population standard deviation', () => {
    // mean 110; deviations -10,-5,0,5,10 → variance 50 → sqrt(50)
    expect(volatility(TEST_UPTREND_SERIES)).toBeCloseTo(7.0710678, 6);
  });

  it('below min bars: fewer than 2 returns 0', () => {
    expect(volatility(TEST_SINGLE_BAR)).toBe(0);
    expect(volatility(TEST_EMPTY_SERIES)).toBe(0);
  });

  it('flat series: zero volatility', () => {
    expect(volatility(TEST_FLAT_SERIES)).toBe(0);
  });

  it('NaN/Infinity input: returns 0, never a NaN score', () => {
    expect(volatility(TEST_NAN_MIDDLE_SERIES)).toBe(0);
    expect(volatility(TEST_INFINITY_SERIES)).toBe(0);
  });
});

describe('trendStrength', () => {
  it('normal: change divided by volatility', () => {
    expect(trendStrength(20, 50)).toBeCloseTo(0.4, 10);
  });

  it('zero volatility guard: returns 0 (no division by zero / NaN)', () => {
    expect(trendStrength(20, 0)).toBe(0);
  });
});

describe('compositeScore', () => {
  it('normal: arithmetic mean', () => {
    expect(compositeScore([1, 2, 3])).toBe(2);
    expect(compositeScore([-1, 1])).toBe(0);
  });

  it('empty: returns 0', () => {
    expect(compositeScore([])).toBe(0);
  });
});

describe('signalScore', () => {
  it('maps sign of input to label', () => {
    expect(signalScore(0.5)).toBe('bullish');
    expect(signalScore(-0.5)).toBe('bearish');
    expect(signalScore(0)).toBe('neutral');
  });
});
