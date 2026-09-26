import { describe, it, expect } from 'vitest';
import { deriveCandleFeatures, sanitizeBars } from '../candles/candle-features';
import { mkBars } from './candle-fixtures';

describe('deriveCandleFeatures', () => {
  it('computes body, wicks, range and direction for a normal bullish candle', () => {
    // open 100, close 110, high 112, low 98 → body 10, upper wick 2, lower wick 2, range 14
    const [f] = deriveCandleFeatures(mkBars([{ o: 100, h: 112, l: 98, c: 110 }]));
    expect(f).toBeDefined();
    expect(f!.direction).toBe('bullish');
    expect(f!.bodySize).toBeCloseTo(10, 6);
    expect(f!.range).toBeCloseTo(14, 6);
    expect(f!.upperWick).toBeCloseTo(2, 6);
    expect(f!.lowerWick).toBeCloseTo(2, 6);
    expect(f!.bodyToRangeRatio).toBeCloseTo(10 / 14, 6);
    expect(f!.closePositionInRange).toBeCloseTo((110 - 98) / 14, 6);
  });

  it('handles a zero-range candle without dividing by zero', () => {
    const [f] = deriveCandleFeatures(mkBars([{ o: 50, h: 50, l: 50, c: 50 }]));
    expect(f!.range).toBe(0);
    expect(f!.bodyToRangeRatio).toBe(0);
    expect(f!.upperWickRatio).toBe(0);
    expect(f!.lowerWickRatio).toBe(0);
    expect(f!.closePositionInRange).toBe(0.5);
    expect(f!.direction).toBe('neutral');
  });

  it('drops malformed OHLC bars (non-finite) rather than fabricating', () => {
    const bars = mkBars([
      { o: 100, h: 105, l: 99, c: 104 },
      { o: NaN, h: 105, l: 99, c: 104 },
      { o: 100, h: Number.POSITIVE_INFINITY, l: 99, c: 104 },
    ]);
    const features = deriveCandleFeatures(bars);
    expect(features).toHaveLength(1);
  });

  it('repairs OHLC ordering (high/low envelope) deterministically', () => {
    // high below the body top / low above the body bottom → clamped.
    const clean = sanitizeBars(mkBars([{ o: 100, h: 101, l: 100, c: 105 }]));
    expect(clean[0]!.high).toBe(105); // max(101,100,105)
    expect(clean[0]!.low).toBe(100);
  });

  it('computes gap relative to the previous close and null for the first bar', () => {
    const features = deriveCandleFeatures(mkBars([
      { o: 100, h: 101, l: 99, c: 100 },
      { o: 102, h: 103, l: 101, c: 102 }, // opens 2% above prior close 100
    ]));
    expect(features[0]!.gap).toBeNull();
    expect(features[1]!.gap).toBeCloseTo(0.02, 6);
  });

  it('leaves relativeVolume null when volume is unavailable', () => {
    const bars = mkBars([
      { o: 100, h: 101, l: 99, c: 100, v: null },
      { o: 100, h: 101, l: 99, c: 100, v: null },
      { o: 100, h: 101, l: 99, c: 100, v: null },
      { o: 100, h: 101, l: 99, c: 100, v: null },
    ]);
    const features = deriveCandleFeatures(bars);
    expect(features[features.length - 1]!.relativeVolume).toBeNull();
  });
});
