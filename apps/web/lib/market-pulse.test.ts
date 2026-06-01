import { describe, expect, it } from 'vitest';
import {
  classifyVolatility,
  classifyVolumeIntensity,
  computeRangeMetrics,
  sliceBarsByRange,
  type OhlcvBar,
} from './market-pulse';

function bar(timestamp: string, close: number, opts: Partial<OhlcvBar> = {}): OhlcvBar {
  return {
    timestamp,
    open: opts.open ?? close,
    high: opts.high ?? close,
    low: opts.low ?? close,
    close,
    volume: opts.volume ?? null,
  };
}

// Deterministic ascending series: 100 → 110 over 11 bars.
const RISING: OhlcvBar[] = Array.from({ length: 11 }, (_, i) =>
  bar(`2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, 100 + i, {
    high: 100 + i + 0.5,
    low: 100 + i - 0.5,
    volume: 1000 + i * 10,
  }),
);

describe('computeRangeMetrics', () => {
  it('returns an insufficient-data result for fewer than 2 bars', () => {
    const m = computeRangeMetrics([RISING[0]!]);
    expect(m.hasData).toBe(false);
    expect(m.barCount).toBe(1);
    expect(m.rangeReturnPct).toBeNull();
  });

  it('computes high/low/return/position from real bars', () => {
    const m = computeRangeMetrics(RISING);
    expect(m.hasData).toBe(true);
    expect(m.high).toBeCloseTo(110.5, 5); // last high 110 + 0.5
    expect(m.low).toBeCloseTo(99.5, 5); // first low 100 - 0.5
    expect(m.firstClose).toBe(100);
    expect(m.lastClose).toBe(110);
    expect(m.rangeReturnPct).toBeCloseTo(10, 5); // (110-100)/100*100
    // position of 110 within [99.5, 110.5] = 10.5/11 ≈ 0.9545
    expect(m.rangePosition).toBeCloseTo(0.9545, 3);
  });

  it('uses the reference (live quote) price when provided', () => {
    const m = computeRangeMetrics(RISING, 105);
    expect(m.lastClose).toBe(105);
    expect(m.rangeReturnPct).toBeCloseTo(5, 5);
  });

  it('never fabricates volatility when returns are constant (flat series)', () => {
    const flat = Array.from({ length: 5 }, (_, i) => bar(`2026-02-0${i + 1}T00:00:00.000Z`, 50));
    const m = computeRangeMetrics(flat);
    expect(m.realizedVolatilityPct).toBeCloseTo(0, 6);
    expect(m.rangePosition).toBeNull(); // high === low → span 0 → no position
  });

  it('computes volume intensity from real volumes', () => {
    const m = computeRangeMetrics(RISING);
    expect(m.latestVolume).toBe(1100);
    expect(m.averageVolume).toBeCloseTo(1050, 5);
    expect(m.volumeIntensity).toBeCloseTo(1100 / 1050, 5);
  });

  it('leaves volume metrics null when bars carry no volume', () => {
    const noVol = RISING.map((b) => ({ ...b, volume: null }));
    const m = computeRangeMetrics(noVol);
    expect(m.latestVolume).toBeNull();
    expect(m.averageVolume).toBeNull();
    expect(m.volumeIntensity).toBeNull();
  });
});

describe('sliceBarsByRange', () => {
  it('returns all bars for ALL', () => {
    expect(sliceBarsByRange(RISING, 'ALL')).toHaveLength(11);
  });

  it('takes the last N bars for a fixed window (1M ≈ 21 ⇒ all 11 here)', () => {
    expect(sliceBarsByRange(RISING, '1M')).toHaveLength(11);
  });

  it('filters YTD by the calendar year of the most recent bar', () => {
    const mixed: OhlcvBar[] = [
      bar('2025-12-30T00:00:00.000Z', 90),
      bar('2025-12-31T00:00:00.000Z', 91),
      bar('2026-01-02T00:00:00.000Z', 100),
      bar('2026-01-03T00:00:00.000Z', 101),
    ];
    const ytd = sliceBarsByRange(mixed, 'YTD');
    expect(ytd).toHaveLength(2);
    expect(ytd.every((b) => b.timestamp.startsWith('2026'))).toBe(true);
  });

  it('returns [] for empty input', () => {
    expect(sliceBarsByRange([], '1Y')).toHaveLength(0);
  });
});

describe('classifyVolatility', () => {
  it('is asset-class aware (same vol → different band for crypto vs stock)', () => {
    expect(classifyVolatility(35, 'stock')).toBe('elevated');
    expect(classifyVolatility(35, 'crypto')).toBe('low');
    expect(classifyVolatility(35, 'etf')).toBe('high');
  });

  it('returns null for non-finite input', () => {
    expect(classifyVolatility(null, 'stock')).toBeNull();
  });
});

describe('classifyVolumeIntensity', () => {
  it('maps intensity to bands', () => {
    expect(classifyVolumeIntensity(0.4)).toBe('thin');
    expect(classifyVolumeIntensity(1.0)).toBe('moderate');
    expect(classifyVolumeIntensity(2.0)).toBe('deep');
    expect(classifyVolumeIntensity(null)).toBe('unknown');
  });
});
