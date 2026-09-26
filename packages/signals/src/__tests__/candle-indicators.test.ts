import { describe, it, expect } from 'vitest';
import { ema, EMA_MIN_BARS } from '../indicators/ema';
import { computeRSI, RSI_MIN_BARS } from '../indicators/rsi';
import { computeATR } from '../indicators/atr';

describe('ema', () => {
  it('returns null below the period', () => {
    expect(ema([1, 2], 5)).toBeNull();
  });
  it('equals the mean for a flat series', () => {
    expect(ema([10, 10, 10, 10, 10], 3)).toBeCloseTo(10, 6);
  });
  it('returns null on non-finite input', () => {
    expect(ema([1, Number.NaN, 3, 4], 2)).toBeNull();
  });
  it('has a sane minimum-bars constant', () => {
    expect(EMA_MIN_BARS).toBe(2);
  });
});

describe('computeRSI (Wilder)', () => {
  it('returns null below period + 1 bars', () => {
    expect(computeRSI([1, 2, 3], 14)).toBeNull();
    expect(RSI_MIN_BARS).toBe(15);
  });
  it('returns 100 for a monotonic uptrend (no losses)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(computeRSI(closes, 14)).toBe(100);
  });
  it('returns 0 for a monotonic downtrend (no gains)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(computeRSI(closes, 14)).toBe(0);
  });
  it('returns 50 for a perfectly flat series (no gains, no losses)', () => {
    const closes = Array.from({ length: 20 }, () => 100);
    expect(computeRSI(closes, 14)).toBe(50);
  });
  it('returns null on non-finite input', () => {
    const closes = Array.from({ length: 20 }, (_, i) => (i === 5 ? Number.NaN : 100 + i));
    expect(computeRSI(closes, 14)).toBeNull();
  });
});

describe('computeATR (Wilder)', () => {
  it('returns null below period + 1 bars', () => {
    expect(computeATR([{ high: 1, low: 0, close: 0.5 }], 14)).toBeNull();
  });
  it('equals the constant true range for a constant-range series', () => {
    // Each bar: high-low = 2, no gaps → ATR converges to 2.
    const bars = Array.from({ length: 30 }, (_, i) => ({ high: 100 + i + 1, low: 100 + i - 1, close: 100 + i }));
    const atr = computeATR(bars, 14);
    expect(atr).not.toBeNull();
    expect(atr!).toBeGreaterThan(1.5);
    expect(atr!).toBeLessThan(3.5);
  });
  it('returns null on non-finite input', () => {
    const bars = Array.from({ length: 20 }, (_, i) => ({ high: Number.NaN, low: i, close: i }));
    expect(computeATR(bars, 14)).toBeNull();
  });
});
