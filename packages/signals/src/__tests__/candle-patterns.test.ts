import { describe, it, expect } from 'vitest';
import { deriveCandleFeatures } from '../candles/candle-features';
import { detectPatterns } from '../candles/patterns';
import { mkBars, type BarSpec } from './candle-fixtures';

function patternsOf(specs: BarSpec[]) {
  return detectPatterns(deriveCandleFeatures(mkBars(specs)));
}
function has(specs: BarSpec[], name: string, direction?: string) {
  return patternsOf(specs).some((p) => p.pattern === name && (!direction || p.direction === direction));
}

describe('detectPatterns — single bar', () => {
  it('detects a doji (tiny body, not both wicks long)', () => {
    expect(has([{ o: 100, h: 100.3, l: 98, c: 100.05 }], 'doji', 'neutral')).toBe(true);
  });

  it('detects a long-legged doji (tiny body, long wicks both sides)', () => {
    expect(has([{ o: 100, h: 104, l: 96, c: 100.1 }], 'long_legged_doji', 'neutral')).toBe(true);
  });

  it('detects a hammer (dominant lower wick, small body)', () => {
    expect(has([{ o: 108, h: 110, l: 100, c: 109 }], 'hammer', 'bullish')).toBe(true);
  });

  it('detects a shooting star (dominant upper wick, bearish body)', () => {
    expect(has([{ o: 109, h: 118, l: 108, c: 108.5 }], 'shooting_star', 'bearish')).toBe(true);
  });

  it('detects an inverted hammer (dominant upper wick, bullish body)', () => {
    expect(has([{ o: 100, h: 110, l: 99.5, c: 101 }], 'inverted_hammer', 'bullish')).toBe(true);
  });

  it('detects a bullish marubozu (full body, negligible wicks)', () => {
    expect(has([{ o: 100, h: 110.2, l: 99.9, c: 110 }], 'bullish_marubozu', 'bullish')).toBe(true);
  });
});

describe('detectPatterns — two bar', () => {
  it('detects bullish engulfing', () => {
    const specs: BarSpec[] = [
      { o: 105, h: 106, l: 99, c: 100 }, // bearish
      { o: 99, h: 112, l: 98, c: 110 }, // bullish engulfs
    ];
    expect(has(specs, 'bullish_engulfing', 'bullish')).toBe(true);
  });

  it('detects bearish engulfing', () => {
    const specs: BarSpec[] = [
      { o: 100, h: 106, l: 99, c: 105 }, // bullish
      { o: 106, h: 107, l: 98, c: 99 }, // bearish engulfs
    ];
    expect(has(specs, 'bearish_engulfing', 'bearish')).toBe(true);
  });

  it('detects an inside bar', () => {
    const specs: BarSpec[] = [
      { o: 100, h: 110, l: 90, c: 105 },
      { o: 101, h: 108, l: 95, c: 103 },
    ];
    expect(has(specs, 'inside_bar', 'neutral')).toBe(true);
  });

  it('detects an outside bar', () => {
    const specs: BarSpec[] = [
      { o: 100, h: 105, l: 98, c: 102 },
      { o: 101, h: 108, l: 96, c: 106 },
    ];
    expect(has(specs, 'outside_bar')).toBe(true);
  });
});

describe('detectPatterns — three bar', () => {
  it('detects a morning star', () => {
    const specs: BarSpec[] = [
      { o: 110, h: 111, l: 100, c: 101 }, // strong bearish
      { o: 100, h: 101, l: 98, c: 99.5 }, // small star
      { o: 100, h: 107, l: 99, c: 106 }, // strong bullish reclaiming > midpoint
    ];
    expect(has(specs, 'morning_star', 'bullish')).toBe(true);
  });

  it('detects an evening star', () => {
    const specs: BarSpec[] = [
      { o: 100, h: 111, l: 99, c: 110 }, // strong bullish
      { o: 111, h: 112, l: 110, c: 111.5 }, // small star
      { o: 111, h: 112, l: 103, c: 104 }, // strong bearish < midpoint
    ];
    expect(has(specs, 'evening_star', 'bearish')).toBe(true);
  });
});

describe('detectPatterns — negative & bounds', () => {
  it('does not fire on a plain trend candle', () => {
    expect(patternsOf([{ o: 100, h: 105, l: 99.5, c: 104 }])).toHaveLength(0);
  });

  it('confidence is always within [0,1]', () => {
    const all = patternsOf([
      { o: 105, h: 106, l: 99, c: 100 },
      { o: 99, h: 112, l: 98, c: 110 },
    ]);
    for (const p of all) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});
