import { describe, expect, it } from 'vitest';
import {
  MARKET_GRAPH_TIMEFRAME_ORDER,
  MARKET_GRAPH_TIMEFRAMES,
  type MarketGraphTimeframeId,
  downsampleBars,
  formatAxisTimestamp,
  formatTooltipTimestamp,
  getTimeframeStartDate,
  normalizeMarketGraphTimeframe,
  sliceBarsForTimeframe,
  getAxisFormatForVisibleBars,
  computeAxisTicks,
} from './market-graph-timeframes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBars(count: number, startIso: string, intervalMs: number) {
  const start = new Date(startIso).getTime();
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(start + i * intervalMs).toISOString(),
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000,
  }));
}

// 365 daily bars ending 2026-05-09
const DAILY_365 = makeBars(365, '2025-05-09T00:00:00.000Z', 24 * 60 * 60 * 1000);

// 60 1-minute bars (intraday)
const INTRADAY_60 = makeBars(60, '2026-05-09T09:30:00.000Z', 60 * 1000);

const REFERENCE = new Date('2026-05-09T18:00:00.000Z');

// ---------------------------------------------------------------------------
// Timeframe config completeness
// ---------------------------------------------------------------------------

describe('MARKET_GRAPH_TIMEFRAMES', () => {
  it('has all 8 supported intervals', () => {
    const expected: MarketGraphTimeframeId[] = ['1m', '1h', '1D', '1W', '1M', '3M', '1Y', '2Y'];
    expect(Object.keys(MARKET_GRAPH_TIMEFRAMES).sort()).toEqual(expected.sort());
  });

  it('order array matches config keys', () => {
    for (const id of MARKET_GRAPH_TIMEFRAME_ORDER) {
      expect(MARKET_GRAPH_TIMEFRAMES[id]).toBeDefined();
    }
    expect(MARKET_GRAPH_TIMEFRAME_ORDER).toHaveLength(Object.keys(MARKET_GRAPH_TIMEFRAMES).length);
  });

  it('each timeframe has required fields with valid values', () => {
    for (const [id, config] of Object.entries(MARKET_GRAPH_TIMEFRAMES)) {
      expect(config.id).toBe(id);
      expect(config.targetPointCount).toBeGreaterThan(0);
      expect(config.minAcceptablePoints).toBeGreaterThan(0);
      expect(config.minAcceptablePoints).toBeLessThanOrEqual(config.targetPointCount);
      expect(config.degradedThreshold).toBeGreaterThan(0);
      expect(config.coverageDays).toBeGreaterThan(0);
      expect(config.maxStalenessMs).toBeGreaterThan(0);
      expect(['none', 'downsample', 'resample']).toContain(config.aggregationPolicy);
      expect(['strict', 'daily-fallback', 'degraded-only']).toContain(config.providerFallbackPolicy);
      expect(['time', 'date', 'month']).toContain(config.xAxisFormat);
      expect(['datetime', 'date', 'month']).toContain(config.tooltipDateFormat);
    }
  });

  it('intraday timeframes (1m, 1h) use time xAxisFormat', () => {
    expect(MARKET_GRAPH_TIMEFRAMES['1m'].xAxisFormat).toBe('time');
    expect(MARKET_GRAPH_TIMEFRAMES['1h'].xAxisFormat).toBe('time');
  });

  it('long timeframes (1Y, 2Y) use month xAxisFormat', () => {
    expect(MARKET_GRAPH_TIMEFRAMES['1Y'].xAxisFormat).toBe('month');
    expect(MARKET_GRAPH_TIMEFRAMES['2Y'].xAxisFormat).toBe('month');
  });

  it('1Y and 2Y use downsample aggregation', () => {
    expect(MARKET_GRAPH_TIMEFRAMES['1Y'].aggregationPolicy).toBe('downsample');
    expect(MARKET_GRAPH_TIMEFRAMES['2Y'].aggregationPolicy).toBe('downsample');
  });

  it('coverageDays increases across timeframes', () => {
    const days = MARKET_GRAPH_TIMEFRAME_ORDER.map((id) => MARKET_GRAPH_TIMEFRAMES[id].coverageDays);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThan(days[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// getTimeframeStartDate
// ---------------------------------------------------------------------------

describe('getTimeframeStartDate', () => {
  it('1W returns ~10 days before reference', () => {
    const start = getTimeframeStartDate('1W', REFERENCE);
    const diffDays = (REFERENCE.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(10, 0);
  });

  it('1M returns ~31 days before reference', () => {
    const start = getTimeframeStartDate('1M', REFERENCE);
    const diffDays = (REFERENCE.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(31, 0);
  });

  it('3M returns more days than 1M', () => {
    const start1M = getTimeframeStartDate('1M', REFERENCE);
    const start3M = getTimeframeStartDate('3M', REFERENCE);
    expect(start3M.getTime()).toBeLessThan(start1M.getTime());
  });

  it('1Y returns more days than 3M', () => {
    const start3M = getTimeframeStartDate('3M', REFERENCE);
    const start1Y = getTimeframeStartDate('1Y', REFERENCE);
    expect(start1Y.getTime()).toBeLessThan(start3M.getTime());
  });
});

// ---------------------------------------------------------------------------
// sliceBarsForTimeframe
// ---------------------------------------------------------------------------

describe('sliceBarsForTimeframe', () => {
  it('1W returns fewer bars than 1M from the same daily series', () => {
    const { bars: bars1W } = sliceBarsForTimeframe(DAILY_365, '1W', REFERENCE);
    const { bars: bars1M } = sliceBarsForTimeframe(DAILY_365, '1M', REFERENCE);
    expect(bars1W.length).toBeLessThan(bars1M.length);
    expect(bars1W.length).toBeGreaterThan(0);
  });

  it('1M returns fewer bars than 3M', () => {
    const { bars: bars1M } = sliceBarsForTimeframe(DAILY_365, '1M', REFERENCE);
    const { bars: bars3M } = sliceBarsForTimeframe(DAILY_365, '3M', REFERENCE);
    expect(bars1M.length).toBeLessThan(bars3M.length);
  });

  it('bars are within the expected date range', () => {
    const { bars } = sliceBarsForTimeframe(DAILY_365, '1W', REFERENCE);
    const config = MARKET_GRAPH_TIMEFRAMES['1W'];
    const startMs = REFERENCE.getTime() - config.coverageDays * 24 * 60 * 60 * 1000;
    for (const bar of bars) {
      expect(new Date(bar.timestamp).getTime()).toBeGreaterThanOrEqual(startMs);
    }
  });

  it('1m with daily bars returns isDailyFallback=true', () => {
    const { isDailyFallback } = sliceBarsForTimeframe(DAILY_365, '1m', REFERENCE);
    expect(isDailyFallback).toBe(true);
  });

  it('1m with intraday bars returns isDailyFallback=false', () => {
    const { isDailyFallback } = sliceBarsForTimeframe(INTRADAY_60, '1m', REFERENCE);
    expect(isDailyFallback).toBe(false);
  });

  it('1h with daily bars returns isDailyFallback=true', () => {
    // 1h covers 2 calendar days. Provide bars within that window.
    const ref2 = new Date('2026-05-09T18:00:00.000Z');
    const recentBars = makeBars(5, '2026-05-05T00:00:00.000Z', 24 * 60 * 60 * 1000);
    const { isDailyFallback } = sliceBarsForTimeframe(recentBars, '1h', ref2);
    expect(isDailyFallback).toBe(true);
  });

  it('returns empty array for empty input', () => {
    const { bars } = sliceBarsForTimeframe([], '1M', REFERENCE);
    expect(bars).toHaveLength(0);
  });

  it('1D and 1W return different slices from the same daily series', () => {
    const { bars: bars1D } = sliceBarsForTimeframe(DAILY_365, '1D', REFERENCE);
    const { bars: bars1W } = sliceBarsForTimeframe(DAILY_365, '1W', REFERENCE);
    // 1D covers 7 days, 1W covers 10 — so 1W should have more or equal bars
    expect(bars1W.length).toBeGreaterThanOrEqual(bars1D.length);
  });
});

// ---------------------------------------------------------------------------
// downsampleBars
// ---------------------------------------------------------------------------

describe('downsampleBars', () => {
  it('returns original array when length <= maxPoints', () => {
    const bars = DAILY_365.slice(0, 10);
    expect(downsampleBars(bars, 10)).toBe(bars);
    expect(downsampleBars(bars, 20)).toBe(bars);
  });

  it('returns at most maxPoints + 1 bars (includes last)', () => {
    const result = downsampleBars(DAILY_365, 50);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.length).toBeGreaterThanOrEqual(50);
  });

  it('last bar is always included', () => {
    const result = downsampleBars(DAILY_365, 50);
    expect(result[result.length - 1]).toEqual(DAILY_365[DAILY_365.length - 1]);
  });

  it('returns bars in ascending order', () => {
    const result = downsampleBars(DAILY_365, 50);
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1]!.timestamp).getTime();
      const curr = new Date(result[i]!.timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});

// ---------------------------------------------------------------------------
// formatAxisTimestamp
// ---------------------------------------------------------------------------

describe('formatAxisTimestamp', () => {
  const ts = '2026-05-09T09:30:00.000Z';

  it('time format returns HH:MM', () => {
    const result = formatAxisTimestamp(ts, 'time');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result).toBe('09:30');
  });

  it('date format returns MMM d', () => {
    const result = formatAxisTimestamp(ts, 'date');
    expect(result).toMatch(/^[A-Z][a-z]+ \d+$/);
    expect(result).toBe('May 9');
  });

  it('month format returns MMM yyyy', () => {
    const result = formatAxisTimestamp(ts, 'month');
    expect(result).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    expect(result).toBe('May 2026');
  });

  it('returns empty string for invalid timestamp', () => {
    expect(formatAxisTimestamp('not-a-date', 'date')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatTooltipTimestamp
// ---------------------------------------------------------------------------

describe('formatTooltipTimestamp', () => {
  const ts = '2026-05-09T09:30:00.000Z';

  it('datetime format includes time', () => {
    const result = formatTooltipTimestamp(ts, 'datetime');
    expect(result).toMatch(/09:30/);
    expect(result).toMatch(/May/);
  });

  it('date format includes year', () => {
    const result = formatTooltipTimestamp(ts, 'date');
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/May/);
  });

  it('month format returns long month + year', () => {
    const result = formatTooltipTimestamp(ts, 'month');
    expect(result).toMatch(/May 2026/);
  });

  it('returns a string for invalid timestamp (first 10 chars fallback)', () => {
    const result = formatTooltipTimestamp('not-a-date', 'date');
    expect(result).toBe('not-a-date');
  });
});

// ---------------------------------------------------------------------------
// normalizeMarketGraphTimeframe
// ---------------------------------------------------------------------------

describe('normalizeMarketGraphTimeframe', () => {
  it('returns valid ID unchanged', () => {
    expect(normalizeMarketGraphTimeframe('1D')).toBe('1D');
    expect(normalizeMarketGraphTimeframe('1W')).toBe('1W');
    expect(normalizeMarketGraphTimeframe('3M')).toBe('3M');
    expect(normalizeMarketGraphTimeframe('2Y')).toBe('2Y');
  });

  it('returns fallback for unknown string', () => {
    expect(normalizeMarketGraphTimeframe('5Y')).toBe('1D');
    expect(normalizeMarketGraphTimeframe('')).toBe('1D');
    expect(normalizeMarketGraphTimeframe('daily')).toBe('1D');
  });

  it('returns fallback for non-string input', () => {
    expect(normalizeMarketGraphTimeframe(null)).toBe('1D');
    expect(normalizeMarketGraphTimeframe(undefined)).toBe('1D');
    expect(normalizeMarketGraphTimeframe(42)).toBe('1D');
    expect(normalizeMarketGraphTimeframe({})).toBe('1D');
  });

  it('respects custom fallback', () => {
    expect(normalizeMarketGraphTimeframe('invalid', '1M')).toBe('1M');
    expect(normalizeMarketGraphTimeframe(null, '3M')).toBe('3M');
  });
});

// ---------------------------------------------------------------------------
// Regression: timeframe switching produces different bar counts
// This tests the core invariant that was previously broken in the workspace.
// ---------------------------------------------------------------------------

describe('timeframe switching regression', () => {
  // 365 daily bars: using same series as DAILY_365 but anchored to last bar
  const LAST_BAR_TS = DAILY_365[DAILY_365.length - 1]!.timestamp;
  const ANCHOR = new Date(LAST_BAR_TS);

  it('1W slice is strictly smaller than 1M slice', () => {
    const { bars: bars1W } = sliceBarsForTimeframe(DAILY_365, '1W', ANCHOR);
    const { bars: bars1M } = sliceBarsForTimeframe(DAILY_365, '1M', ANCHOR);
    expect(bars1W.length).toBeGreaterThan(0);
    expect(bars1M.length).toBeGreaterThan(0);
    expect(bars1W.length).toBeLessThan(bars1M.length);
  });

  it('1M slice is strictly smaller than 3M slice', () => {
    const { bars: bars1M } = sliceBarsForTimeframe(DAILY_365, '1M', ANCHOR);
    const { bars: bars3M } = sliceBarsForTimeframe(DAILY_365, '3M', ANCHOR);
    expect(bars1M.length).toBeLessThan(bars3M.length);
  });

  it('3M slice is strictly smaller than 1Y slice', () => {
    const { bars: bars3M } = sliceBarsForTimeframe(DAILY_365, '3M', ANCHOR);
    const { bars: bars1Y } = sliceBarsForTimeframe(DAILY_365, '1Y', ANCHOR);
    expect(bars3M.length).toBeLessThan(bars1Y.length);
  });

  it('all timeframes return different counts from the same 365-bar series', () => {
    const counts = (['1D', '1W', '1M', '3M', '1Y'] as const).map(
      (id) => sliceBarsForTimeframe(DAILY_365, id, ANCHOR).bars.length,
    );
    // Every adjacent pair must increase (longer timeframe = more bars)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]!);
    }
  });

  it('anchoring to last bar produces a non-empty slice for 1M', () => {
    const { bars } = sliceBarsForTimeframe(DAILY_365, '1M', ANCHOR);
    expect(bars.length).toBeGreaterThan(0);
    // The last bar in the slice should be the same as the last bar in the full series
    expect(bars[bars.length - 1]).toEqual(DAILY_365[DAILY_365.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// getAxisFormatForVisibleBars
// ---------------------------------------------------------------------------

describe('getAxisFormatForVisibleBars', () => {
  it('returns "date" for 1m timeframe when bars have daily spacing (fixes 00:00 bug)', () => {
    // Daily bars: spacing is 24h — getAxisFormatForVisibleBars should override to 'date'
    const result = getAxisFormatForVisibleBars('1m', DAILY_365.slice(0, 5));
    expect(result).toBe('date');
  });

  it('returns "date" for 1h timeframe when bars have daily spacing', () => {
    const result = getAxisFormatForVisibleBars('1h', DAILY_365.slice(0, 5));
    expect(result).toBe('date');
  });

  it('returns "time" for 1m timeframe when bars have real intraday spacing (< 6h)', () => {
    // INTRADAY_60 bars are spaced 1 minute apart — should stay 'time'
    const result = getAxisFormatForVisibleBars('1m', INTRADAY_60.slice(0, 10));
    expect(result).toBe('time');
  });

  it('returns "time" for 1h timeframe when bars are hourly (< 6h spacing)', () => {
    // Bars spaced 1 hour apart
    const hourlyBars = makeBars(10, '2026-05-09T09:00:00.000Z', 60 * 60 * 1000);
    const result = getAxisFormatForVisibleBars('1h', hourlyBars);
    expect(result).toBe('time');
  });

  it('returns "date" for non-intraday timeframes unchanged', () => {
    expect(getAxisFormatForVisibleBars('1D', DAILY_365.slice(0, 5))).toBe('date');
    expect(getAxisFormatForVisibleBars('3M', DAILY_365.slice(0, 10))).toBe('date');
  });

  it('returns "month" for 1Y and 2Y timeframes', () => {
    expect(getAxisFormatForVisibleBars('1Y', DAILY_365)).toBe('month');
    expect(getAxisFormatForVisibleBars('2Y', DAILY_365)).toBe('month');
  });

  it('returns "date" for 1m with empty bars (safe fallback)', () => {
    const result = getAxisFormatForVisibleBars('1m', []);
    expect(result).toBe('date');
  });

  it('returns "date" for 1m with a single bar (cannot measure spacing)', () => {
    const result = getAxisFormatForVisibleBars('1m', DAILY_365.slice(0, 1));
    expect(result).toBe('date');
  });
});

// ---------------------------------------------------------------------------
// computeAxisTicks
// ---------------------------------------------------------------------------

describe('computeAxisTicks', () => {
  it('returns empty array for empty bars', () => {
    expect(computeAxisTicks([], 'date')).toEqual([]);
  });

  it('returns at most targetCount + 1 ticks (last always included)', () => {
    const ticks = computeAxisTicks(DAILY_365, 'month', 6);
    expect(ticks.length).toBeLessThanOrEqual(7); // 6 + possible last
    expect(ticks.length).toBeGreaterThan(0);
  });

  it('always attempts to include the last bar (may be deduplicated if label matches prior tick)', () => {
    // With 'date' format, each daily bar gets a unique label, so last bar will appear.
    const ticks = computeAxisTicks(DAILY_365.slice(-30), 'date', 6);
    const lastTick = ticks[ticks.length - 1]!;
    expect(lastTick.timestamp).toBe(DAILY_365[DAILY_365.length - 1]!.timestamp);
  });

  it('deduplicates labels — no two ticks have the same label', () => {
    // 365 daily bars formatted as 'month' will produce many duplicates (e.g. "May 2025")
    const ticks = computeAxisTicks(DAILY_365, 'month', 6);
    const labels = ticks.map((t) => t.label);
    const uniqueLabels = new Set(labels);
    expect(labels.length).toBe(uniqueLabels.size);
  });

  it('returns <= 8 unique labels for 365 bars with month format', () => {
    const ticks = computeAxisTicks(DAILY_365, 'month', 6);
    expect(ticks.length).toBeLessThanOrEqual(8);
  });

  it('each tick has a non-empty label', () => {
    const ticks = computeAxisTicks(DAILY_365.slice(0, 30), 'date', 6);
    for (const tick of ticks) {
      expect(tick.label.length).toBeGreaterThan(0);
    }
  });

  it('tick indices are in ascending order', () => {
    const ticks = computeAxisTicks(DAILY_365, 'date', 6);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.index).toBeGreaterThan(ticks[i - 1]!.index);
    }
  });

  it('single bar returns one tick', () => {
    const ticks = computeAxisTicks(DAILY_365.slice(0, 1), 'date', 6);
    expect(ticks.length).toBe(1);
  });
});
