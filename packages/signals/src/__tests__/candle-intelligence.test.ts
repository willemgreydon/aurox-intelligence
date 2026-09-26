import { describe, it, expect } from 'vitest';
import { computeCandleIntelligence } from '../candles/candle-intelligence';
import { mkBars, type BarSpec } from './candle-fixtures';

function pathBars(closes: number[]): BarSpec[] {
  return closes.map((c) => ({ o: c, h: c + 1, l: c - 1, c }));
}
const GEN = '2026-01-01T00:00:00.000Z';
const compute = (bars: BarSpec[], assetClass: 'stock' | 'etf' | 'crypto' = 'stock') =>
  computeCandleIntelligence({ symbol: 'TEST', assetClass, generatedAt: GEN, bars: mkBars(bars) });

describe('computeCandleIntelligence — contract & bounds', () => {
  it('returns an insufficient-data result below the minimum bar count', () => {
    const r = compute(pathBars([100, 101, 102, 103, 104]));
    expect(r.hasInsufficientData).toBe(true);
    expect(r.score).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.direction).toBe('neutral');
    expect(r.warnings[0]).toMatch(/insufficient history/i);
  });

  it('echoes the passed-in generatedAt (no ambient time) and is deterministic', () => {
    const bars = pathBars(Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.3));
    const a = compute(bars);
    const b = compute(bars);
    expect(a.generatedAt).toBe(GEN);
    expect(a).toEqual(b); // identical input → identical output
  });

  it('keeps score in [-1,1] and confidence in [0,1] across varied inputs', () => {
    const inputs = [
      Array.from({ length: 30 }, (_, i) => 100 + i * 3), // strong up
      Array.from({ length: 30 }, (_, i) => 200 - i * 3), // strong down
      Array.from({ length: 30 }, () => 100), // flat
      Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 104 : 96)), // choppy
    ];
    for (const closes of inputs) {
      const r = compute(pathBars(closes));
      expect(r.score).toBeGreaterThanOrEqual(-1);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('a perfectly flat series is neutral with capped confidence', () => {
    const r = compute(pathBars(Array.from({ length: 30 }, () => 100)));
    expect(r.direction).toBe('neutral');
    expect(r.confidence).toBeLessThanOrEqual(0.5);
  });
});

describe('scenario doctrine — no mechanical candle-counting', () => {
  it('A: four red candles do NOT automatically produce a strong SELL', () => {
    const closes = [...Array.from({ length: 20 }, () => 100), 99, 98, 97, 96];
    const r = compute(pathBars(closes));
    // A mild negative tilt is acceptable; a mechanical strong sell is not.
    expect(r.score).toBeGreaterThan(-0.5);
    expect(r.confidence).toBeLessThan(0.7);
  });

  it('B: four red then two green candles do NOT automatically produce a BUY', () => {
    const closes = [...Array.from({ length: 20 }, () => 100), 99, 98, 97, 96, 97, 98];
    const r = compute(pathBars(closes));
    expect(r.direction).not.toBe('bullish');
    expect(r.score).toBeLessThan(0.4);
  });
});

describe('scenario doctrine — contextual pattern interpretation', () => {
  function hammerReason(reasons: string[]): string | undefined {
    return reasons.find((s) => s.startsWith('Hammer:'));
  }

  it('C: a hammer in a downtrend with volume is treated as genuine reversal evidence (not dampened)', () => {
    const down = Array.from({ length: 22 }, (_, i) => 160 - i * 2);
    const bars = mkBars(pathBars(down));
    bars.push({ timestamp: '2025-06-01T00:00:00.000Z', open: 118, high: 119, low: 110, close: 118.5, volume: 5000 });
    const r = computeCandleIntelligence({ symbol: 'C', assetClass: 'stock', generatedAt: GEN, bars });
    expect(r.detectedPatterns.some((p) => p.pattern === 'hammer')).toBe(true);
    const reason = hammerReason(r.reasons);
    expect(reason).toBeDefined();
    expect(reason).not.toMatch(/range-bound/i); // NOT discounted as noise
    expect(r.reasons.some((s) => /above-average participation/i.test(s))).toBe(true); // volume confirmation surfaced
  });

  it('D: the same hammer inside a noisy range IS discounted (weaker evidence)', () => {
    const range = Array.from({ length: 22 }, (_, i) => (i % 2 === 0 ? 104 : 96));
    const bars = mkBars(pathBars(range));
    bars.push({ timestamp: '2025-06-01T00:00:00.000Z', open: 100, high: 101, low: 92, close: 100.5, volume: 1000 });
    const r = computeCandleIntelligence({ symbol: 'D', assetClass: 'stock', generatedAt: GEN, bars });
    expect(r.detectedPatterns.some((p) => p.pattern === 'hammer')).toBe(true);
    const reason = hammerReason(r.reasons);
    expect(reason).toBeDefined();
    expect(reason).toMatch(/range-bound/i); // discounted as range noise
  });

  it('E: a bullish candle beneath resistance surfaces counter-evidence', () => {
    const up = [100, 102, 104, 106, 108, 106, 104, 106, 108, 110, 112, 114, 112, 110, 112, 114, 116, 118, 120, 118, 116, 118];
    const bars = mkBars(pathBars(up));
    bars.push({ timestamp: '2025-06-01T00:00:00.000Z', open: 119, high: 119.5, low: 111, close: 119.2, volume: 1200 });
    const r = computeCandleIntelligence({ symbol: 'E', assetClass: 'stock', generatedAt: GEN, bars });
    expect(r.warnings.some((w) => /resistance/i.test(w))).toBe(true);
  });
});

describe('scenario doctrine — multi-timeframe', () => {
  it('F: reports timeframe disagreement when the daily read conflicts with a higher timeframe', () => {
    const down: number[] = [];
    let center = 480;
    for (let i = 0; i < 600; i += 1) {
      const cyclePos = i % 30;
      const wave = cyclePos < 15 ? cyclePos : 30 - cyclePos;
      down.push(center + wave * 1.6);
      center -= 0.55;
    }
    let up = down[down.length - 1]!;
    const rally: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      up += 6;
      rally.push(up);
    }
    const r = compute(pathBars([...down, ...rally]));
    expect(r.multiTimeframe.length).toBeGreaterThanOrEqual(2);
    expect(r.multiTimeframe.map((b) => b.timeframe)).toContain('weekly');
    expect(r.direction).toBe('bullish');
    expect(r.warnings.some((w) => /timeframe disagreement/i.test(w))).toBe(true);
  });

  it('multiTimeframe entries are well-formed', () => {
    const r = compute(pathBars(Array.from({ length: 200 }, (_, i) => 100 + i * 0.5)));
    for (const b of r.multiTimeframe) {
      expect(['daily', 'weekly', 'monthly']).toContain(b.timeframe);
      expect(['bullish', 'bearish', 'neutral']).toContain(b.direction);
      expect(b.confidence).toBeGreaterThanOrEqual(0);
      expect(b.confidence).toBeLessThanOrEqual(1);
    }
  });
});
