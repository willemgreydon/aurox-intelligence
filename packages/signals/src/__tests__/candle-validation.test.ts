import { describe, it, expect } from 'vitest';
import { computeForwardOutcome, aggregatePatternStats } from '../candles/validation';
import { mkBars } from './candle-fixtures';

// Anti-overfitting doctrine: detection is a geometric fact; predictive power is
// a separate empirical measurement. These tests exercise the MEASUREMENT layer,
// which asserts nothing about whether patterns "work".

describe('computeForwardOutcome', () => {
  const bars = mkBars([
    { o: 100, h: 101, l: 99, c: 100 }, // idx 0 (entry)
    { o: 100, h: 106, l: 100, c: 105 }, // idx 1
    { o: 105, h: 112, l: 104, c: 110 }, // idx 2 (exit at horizon 2)
  ]);

  it('computes forward return and excursions for a bullish occurrence', () => {
    const out = computeForwardOutcome(bars, { index: 0, pattern: 'hammer', direction: 'bullish' }, 2);
    expect(out).not.toBeNull();
    expect(out!.forwardReturn).toBeCloseTo(0.1, 6); // 100 → 110
    expect(out!.maxFavorableExcursion).toBeCloseTo(0.12, 6); // high 112 after entry
    // Only bars AFTER the entry are scanned (idx1 low 100, idx2 low 104); price
    // never traded below the 100 entry, so adverse excursion is 0.
    expect(out!.maxAdverseExcursion).toBeCloseTo(0, 6);
  });

  it('returns null when the horizon extends beyond available bars', () => {
    expect(computeForwardOutcome(bars, { index: 2, pattern: 'doji', direction: 'neutral' }, 5)).toBeNull();
  });
});

describe('aggregatePatternStats', () => {
  it('computes hit rate and expectancy per pattern, direction-adjusted', () => {
    const stats = aggregatePatternStats([
      { pattern: 'hammer', direction: 'bullish', forwardReturn: 0.05, maxFavorableExcursion: 0.06, maxAdverseExcursion: -0.02 },
      { pattern: 'hammer', direction: 'bullish', forwardReturn: -0.03, maxFavorableExcursion: 0.01, maxAdverseExcursion: -0.04 },
      { pattern: 'shooting_star', direction: 'bearish', forwardReturn: -0.04, maxFavorableExcursion: 0.04, maxAdverseExcursion: -0.01 },
    ]);
    const hammer = stats.find((s) => s.pattern === 'hammer')!;
    expect(hammer.sampleSize).toBe(2);
    expect(hammer.hitRate).toBeCloseTo(0.5, 6); // one of two moved up
    expect(hammer.expectancy).toBeCloseTo((0.05 - 0.03) / 2, 6);

    const star = stats.find((s) => s.pattern === 'shooting_star')!;
    // bearish pattern with a negative forward return is a "hit" (moved in its direction)
    expect(star.hitRate).toBeCloseTo(1, 6);
    expect(star.expectancy).toBeCloseTo(0.04, 6);
  });

  it('returns an empty array for no occurrences', () => {
    expect(aggregatePatternStats([])).toEqual([]);
  });
});
