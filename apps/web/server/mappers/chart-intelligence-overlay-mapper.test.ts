import { describe, expect, it } from 'vitest';
import {
  buildChartIntelligenceOverlay,
  type ChartIntelligenceOverlayInput,
} from './chart-intelligence-overlay-mapper';

type Bar = ChartIntelligenceOverlayInput['bars'][number];

/**
 * Deterministic daily series: an oscillating decline (creates swing points and
 * S/R clusters) that ends with an explicit bullish-engulfing reversal on
 * elevated volume, so the mapper has real structure AND a detectable pattern.
 */
function buildBars(): Bar[] {
  const bars: Bar[] = [];
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < 28; i += 1) {
    const timestamp = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    const base = 120 - i * 0.8;
    const up = i % 2 === 0;
    const open = base;
    const close = up ? base + 1.4 : base - 1.4;
    const high = Math.max(open, close) + 0.6;
    const low = Math.min(open, close) - 0.6;
    bars.push({ timestamp, open, high, low, close, volume: 1_000_000 });
  }
  // Prior candle: clearly bearish.
  bars.push({
    timestamp: new Date(start + 28 * 86_400_000).toISOString().slice(0, 10),
    open: 104,
    high: 104.5,
    low: 99.5,
    close: 100,
    volume: 1_000_000,
  });
  // Confirming candle: bullish body fully engulfing the prior body, big volume.
  bars.push({
    timestamp: new Date(start + 29 * 86_400_000).toISOString().slice(0, 10),
    open: 99.5,
    high: 105,
    low: 99,
    close: 104.5,
    volume: 1_800_000,
  });
  return bars;
}

const GENERATED_AT = '2024-02-01T00:00:00.000Z';

function input(overrides: Partial<ChartIntelligenceOverlayInput> = {}): ChartIntelligenceOverlayInput {
  return { symbol: 'TEST', assetClass: 'stock', bars: buildBars(), generatedAt: GENERATED_AT, ...overrides };
}

describe('buildChartIntelligenceOverlay', () => {
  it('returns an unavailable overlay for insufficient data', () => {
    const overlay = buildChartIntelligenceOverlay(input({ bars: buildBars().slice(0, 8) }));
    expect(overlay.available).toBe(false);
    expect(overlay.hasInsufficientData).toBe(true);
    expect(overlay.unavailableReason).not.toBeNull();
    expect(overlay.levels).toEqual([]);
    expect(overlay.patterns).toEqual([]);
    expect(overlay.swings).toEqual([]);
    expect(overlay.events).toEqual([]);
  });

  it('produces a coordinate-independent overlay with structure and patterns', () => {
    const overlay = buildChartIntelligenceOverlay(input());
    expect(overlay.available).toBe(true);
    expect(overlay.hasInsufficientData).toBe(false);
    expect(overlay.symbol).toBe('TEST');
    expect(overlay.generatedAt).toBe(GENERATED_AT);
    expect(['bullish', 'bearish', 'neutral']).toContain(overlay.direction);
    expect(overlay.confidence).toBeGreaterThanOrEqual(0);
    expect(overlay.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(overlay.levels)).toBe(true);
    expect(Array.isArray(overlay.swings)).toBe(true);
  });

  it('detects the bullish engulfing and anchors it to the confirming bar', () => {
    const overlay = buildChartIntelligenceOverlay(input());
    const bars = buildBars();
    const lastTs = bars[bars.length - 1]!.timestamp;
    const engulfing = overlay.patterns.find((p) => p.pattern === 'bullish_engulfing');
    expect(engulfing, 'expected a bullish_engulfing pattern').toBeDefined();
    expect(engulfing!.anchorTimestamp).toBe(lastTs);
    expect(engulfing!.direction).toBe('bullish');
    expect(engulfing!.placement).toBe('below');
  });

  it('resolves every pattern candle to a real input timestamp', () => {
    const overlay = buildChartIntelligenceOverlay(input());
    const known = new Set(buildBars().map((b) => b.timestamp));
    for (const pattern of overlay.patterns) {
      expect(known.has(pattern.anchorTimestamp)).toBe(true);
      for (const ts of pattern.candleTimestamps) {
        expect(known.has(ts)).toBe(true);
      }
    }
  });

  it('anchors S/R levels and swings to absolute prices', () => {
    const overlay = buildChartIntelligenceOverlay(input());
    for (const level of overlay.levels) {
      expect(Number.isFinite(level.price)).toBe(true);
      expect(['S', 'R']).toContain(level.label);
    }
    for (const swing of overlay.swings) {
      expect(Number.isFinite(swing.price)).toBe(true);
      expect(['HH', 'HL', 'LH', 'LL', 'SH', 'SL']).toContain(swing.label);
    }
  });

  it('is deterministic for identical input', () => {
    expect(buildChartIntelligenceOverlay(input())).toEqual(buildChartIntelligenceOverlay(input()));
  });
});
