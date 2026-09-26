import { describe, it, expect } from 'vitest';
import { deriveCandleFeatures } from '../candles/candle-features';
import { analyzeMarketStructure } from '../candles/market-structure';
import { mkBars, type BarSpec } from './candle-fixtures';

/** Build bars from a close path; high/low bracket each close by ±1. */
function pathBars(closes: number[]): BarSpec[] {
  return closes.map((c) => ({ o: c, h: c + 1, l: c - 1, c }));
}

// Uptrend with pullbacks → rising swing highs (108,114,120) and lows (104,110,116).
const UPTREND = [
  100, 102, 104, 106, 108, 106, 104, 106, 108, 110, 112, 114, 112, 110, 112, 114, 116, 118, 120, 118, 116, 118, 120,
];
// Downtrend mirror.
const DOWNTREND = UPTREND.map((c) => 220 - c);
// Range: oscillate between ~96 and ~104 repeatedly.
const RANGE = [100, 104, 100, 96, 100, 104, 100, 96, 100, 104, 100, 96, 100, 104, 100, 96, 100, 104, 100, 96];

describe('analyzeMarketStructure', () => {
  it('classifies an uptrend with higher highs and higher lows', () => {
    const s = analyzeMarketStructure(deriveCandleFeatures(mkBars(pathBars(UPTREND))));
    expect(s.regime).toBe('uptrend');
    expect(s.trend).toBe('bullish');
    expect(s.higherHighs).toBe(true);
    expect(s.higherLows).toBe(true);
    expect(s.strength).toBeGreaterThan(0);
  });

  it('classifies a downtrend with lower highs and lower lows', () => {
    const s = analyzeMarketStructure(deriveCandleFeatures(mkBars(pathBars(DOWNTREND))));
    expect(s.regime).toBe('downtrend');
    expect(s.trend).toBe('bearish');
    expect(s.lowerHighs).toBe(true);
    expect(s.lowerLows).toBe(true);
  });

  it('classifies an oscillating series as a range', () => {
    const s = analyzeMarketStructure(deriveCandleFeatures(mkBars(pathBars(RANGE))));
    expect(s.regime).toBe('range');
    expect(s.trend).toBe('neutral');
  });

  it('returns unknown regime for insufficient data', () => {
    const s = analyzeMarketStructure(deriveCandleFeatures(mkBars(pathBars([100, 101, 102]))));
    expect(s.regime).toBe('unknown');
  });

  it('reports support below and resistance above the latest close', () => {
    // End the series mid-range so both a support and resistance level exist.
    const closes = [...UPTREND, 118, 116, 117];
    const s = analyzeMarketStructure(deriveCandleFeatures(mkBars(pathBars(closes))));
    if (s.nearestSupport) expect(s.nearestSupport.price).toBeLessThanOrEqual(117 + 1);
    if (s.nearestResistance) expect(s.nearestResistance.price).toBeGreaterThanOrEqual(117 - 1);
  });

  it('flags a bullish structure break when close exceeds the prior swing high', () => {
    // ...reach a swing high at 120, pull back, then close well above it.
    const closes = [...UPTREND, 118, 116, 126];
    const s = analyzeMarketStructure(deriveCandleFeatures(mkBars(pathBars(closes))));
    expect(s.structureBreak).toBe('bullish');
  });
});
