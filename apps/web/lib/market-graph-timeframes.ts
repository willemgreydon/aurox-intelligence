/**
 * Canonical timeframe model for the Market Graph.
 *
 * Each timeframe defines:
 * - How many bars to target
 * - What provider resolution to request
 * - How to format x-axis and tooltip dates
 * - What staleness and degraded thresholds apply
 *
 * The service uses this model to select and filter bars.
 * The client uses it to format labels and show degraded states.
 *
 * NOTE: Intraday resolution (1m, 1h) is defined here but currently
 * unavailable from the configured providers, which only supply daily bars.
 * The service will return degraded metadata when intraday is requested but
 * only daily bars are available.
 */

export type AggregationPolicy = 'none' | 'downsample' | 'resample';
export type ProviderFallbackPolicy = 'strict' | 'daily-fallback' | 'degraded-only';

export type MarketGraphTimeframe = {
  /** Identifier used in URL params and internal state */
  id: MarketGraphTimeframeId;
  /** Short label for the button chip */
  label: string;
  /** Longer display label for aria / tooltip */
  displayLabel: string;
  /**
   * Provider resolution string passed to fetchMarketHistory.
   * Examples: '1min', '5min', '15min', '60min', '1day', '1week'
   */
  requestedProviderResolution: string;
  /**
   * Number of bars ideally shown in this timeframe.
   * Server will attempt to return this many bars.
   */
  targetPointCount: number;
  /**
   * Minimum acceptable bars to show a non-degraded chart.
   * Below this the chart shows a degraded overlay but still renders available data.
   */
  minAcceptablePoints: number;
  /**
   * Intl.DateTimeFormat options key for x-axis tick labels.
   * 'time'    → HH:mm  (intraday)
   * 'date'    → MMM d  (daily, weekly)
   * 'month'   → MMM yyyy (monthly, yearly)
   */
  xAxisFormat: 'time' | 'date' | 'month';
  /**
   * Intl.DateTimeFormat options key for hover tooltip.
   * 'datetime' → "May 9, 09:30"
   * 'date'     → "May 9, 2026"
   * 'month'    → "May 2026"
   */
  tooltipDateFormat: 'datetime' | 'date' | 'month';
  aggregationPolicy: AggregationPolicy;
  /**
   * How the service should handle a provider that only supplies daily bars
   * when intraday is requested.
   * 'strict'        → return empty, isDegraded=true
   * 'daily-fallback'→ return daily bars with isDegraded=true and a fallback reason
   * 'degraded-only' → always show degraded overlay, use whatever bars are in cache
   */
  providerFallbackPolicy: ProviderFallbackPolicy;
  /** Max age in ms before a data point is considered stale */
  maxStalenessMs: number;
  /** Point count threshold below which to show a degraded overlay */
  degradedThreshold: number;
  /**
   * Approximate number of calendar days this timeframe covers,
   * used to filter bars by date range from the cached daily history.
   */
  coverageDays: number;
};

export type MarketGraphTimeframeId = '1m' | '1h' | '1D' | '1W' | '1M' | '3M' | '1Y' | '2Y';

export const MARKET_GRAPH_TIMEFRAMES: Record<MarketGraphTimeframeId, MarketGraphTimeframe> = {
  '1m': {
    id: '1m',
    label: '1m',
    displayLabel: '1 minute',
    requestedProviderResolution: '1min',
    targetPointCount: 60,
    minAcceptablePoints: 10,
    xAxisFormat: 'time',
    tooltipDateFormat: 'datetime',
    aggregationPolicy: 'none',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 60_000,
    degradedThreshold: 10,
    coverageDays: 1,
  },
  '1h': {
    id: '1h',
    label: '1h',
    displayLabel: '1 hour',
    requestedProviderResolution: '60min',
    targetPointCount: 48,
    minAcceptablePoints: 10,
    xAxisFormat: 'time',
    tooltipDateFormat: 'datetime',
    aggregationPolicy: 'none',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 5 * 60_000,
    degradedThreshold: 10,
    coverageDays: 2,
  },
  '1D': {
    id: '1D',
    label: '1D',
    displayLabel: '1 day',
    requestedProviderResolution: '1day',
    targetPointCount: 48,
    minAcceptablePoints: 10,
    xAxisFormat: 'date',
    tooltipDateFormat: 'date',
    aggregationPolicy: 'none',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 30 * 60_000,
    degradedThreshold: 10,
    coverageDays: 7,
  },
  '1W': {
    id: '1W',
    label: '1W',
    displayLabel: '1 week',
    requestedProviderResolution: '1day',
    targetPointCount: 7,
    minAcceptablePoints: 3,
    xAxisFormat: 'date',
    tooltipDateFormat: 'date',
    aggregationPolicy: 'none',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 60 * 60_000,
    degradedThreshold: 3,
    coverageDays: 10,
  },
  '1M': {
    id: '1M',
    label: '1M',
    displayLabel: '1 month',
    requestedProviderResolution: '1day',
    targetPointCount: 22,
    minAcceptablePoints: 5,
    xAxisFormat: 'date',
    tooltipDateFormat: 'date',
    aggregationPolicy: 'none',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 60 * 60_000,
    degradedThreshold: 5,
    coverageDays: 31,
  },
  '3M': {
    id: '3M',
    label: '3M',
    displayLabel: '3 months',
    requestedProviderResolution: '1day',
    targetPointCount: 66,
    minAcceptablePoints: 15,
    xAxisFormat: 'date',
    tooltipDateFormat: 'date',
    aggregationPolicy: 'none',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 60 * 60_000,
    degradedThreshold: 15,
    coverageDays: 92,
  },
  '1Y': {
    id: '1Y',
    label: '1Y',
    displayLabel: '1 year',
    requestedProviderResolution: '1day',
    targetPointCount: 252,
    minAcceptablePoints: 50,
    xAxisFormat: 'month',
    tooltipDateFormat: 'date',
    aggregationPolicy: 'downsample',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 60 * 60_000,
    degradedThreshold: 50,
    coverageDays: 365,
  },
  '2Y': {
    id: '2Y',
    label: '2Y',
    displayLabel: '2 years',
    requestedProviderResolution: '1day',
    targetPointCount: 504,
    minAcceptablePoints: 100,
    xAxisFormat: 'month',
    tooltipDateFormat: 'date',
    aggregationPolicy: 'downsample',
    providerFallbackPolicy: 'daily-fallback',
    maxStalenessMs: 60 * 60_000,
    degradedThreshold: 100,
    coverageDays: 730,
  },
};

export const MARKET_GRAPH_TIMEFRAME_ORDER: MarketGraphTimeframeId[] = [
  '1m',
  '1h',
  '1D',
  '1W',
  '1M',
  '3M',
  '1Y',
  '2Y',
];

export function getTimeframeConfig(id: MarketGraphTimeframeId): MarketGraphTimeframe {
  return MARKET_GRAPH_TIMEFRAMES[id];
}

/**
 * Normalizes an unknown string to a valid MarketGraphTimeframeId.
 * Returns the fallback (default '1D') if the input is not a valid ID.
 */
export function normalizeMarketGraphTimeframe(
  input: unknown,
  fallback: MarketGraphTimeframeId = '1D',
): MarketGraphTimeframeId {
  if (typeof input === 'string' && input in MARKET_GRAPH_TIMEFRAMES) {
    return input as MarketGraphTimeframeId;
  }
  return fallback;
}

/**
 * Returns a UTC Date representing the start of the date range for a timeframe,
 * relative to the given reference date (defaults to now).
 */
export function getTimeframeStartDate(
  id: MarketGraphTimeframeId,
  referenceDate: Date = new Date(),
): Date {
  const config = MARKET_GRAPH_TIMEFRAMES[id];
  const ms = config.coverageDays * 24 * 60 * 60 * 1000;
  return new Date(referenceDate.getTime() - ms);
}

/**
 * Given a sorted array of bars (ascending timestamp), returns the slice
 * that falls within the timeframe's date range from the reference date.
 *
 * For intraday timeframes (1m, 1h) where only daily bars are available,
 * returns the last N bars from the coverage period with a degraded flag.
 */
export function sliceBarsForTimeframe<T extends { timestamp: string }>(
  bars: T[],
  id: MarketGraphTimeframeId,
  referenceDate: Date = new Date(),
): { bars: T[]; isDailyFallback: boolean } {
  const config = MARKET_GRAPH_TIMEFRAMES[id];
  const startDate = getTimeframeStartDate(id, referenceDate);
  const startMs = startDate.getTime();

  const filtered = bars.filter((bar) => {
    const t = new Date(bar.timestamp).getTime();
    return Number.isFinite(t) && t >= startMs;
  });

  // Detect if the resolution available is daily when intraday was requested
  const isIntradayRequested =
    config.requestedProviderResolution === '1min' ||
    config.requestedProviderResolution === '60min';

  let isDailyFallback = false;
  if (isIntradayRequested && filtered.length >= 2) {
    const first = new Date(filtered[0]!.timestamp).getTime();
    const second = new Date(filtered[1]!.timestamp).getTime();
    const deltaMs = second - first;
    // If spacing between bars is >= 6 hours, treat as daily fallback
    if (deltaMs >= 6 * 60 * 60 * 1000) {
      isDailyFallback = true;
    }
  } else if (isIntradayRequested && filtered.length === 0) {
    isDailyFallback = true;
  }

  return { bars: filtered, isDailyFallback };
}

/**
 * Downsample an array of bars to at most maxPoints, by picking evenly spaced indices.
 * Used for 1Y and 2Y to reduce SVG complexity on large datasets.
 */
export function downsampleBars<T>(bars: T[], maxPoints: number): T[] {
  if (bars.length <= maxPoints) return bars;
  const step = bars.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.min(bars.length - 1, Math.floor(i * step));
    result.push(bars[index]!);
  }
  // Always include the last bar
  if (result[result.length - 1] !== bars[bars.length - 1]) {
    result.push(bars[bars.length - 1]!);
  }
  return result;
}

/**
 * Detects the effective x-axis format for the given bars and timeframe.
 *
 * Problem: intraday timeframes (1m, 1h) have xAxisFormat='time' which formats
 * timestamps as HH:mm. But when only daily bars are available (all midnight UTC),
 * every label would show "00:00" — repeated and meaningless.
 *
 * Solution: inspect the actual bar spacing. If bars are spaced >= 6 hours apart
 * (i.e. they are daily bars regardless of the requested timeframe), fall back to
 * 'date' format so labels show something useful like "May 9".
 */
export function getAxisFormatForVisibleBars(
  selectedTimeframe: MarketGraphTimeframeId,
  bars: Array<{ timestamp: string }>,
): MarketGraphTimeframe['xAxisFormat'] {
  const config = MARKET_GRAPH_TIMEFRAMES[selectedTimeframe];
  if (config.xAxisFormat !== 'time') return config.xAxisFormat;

  // For intraday timeframes, check if bars are actually intraday spaced.
  if (bars.length >= 2) {
    const first = new Date(bars[0]!.timestamp).getTime();
    const second = new Date(bars[1]!.timestamp).getTime();
    const deltaMs = second - first;
    // If spacing >= 6 hours, these are daily (or coarser) bars — use date format.
    if (Number.isFinite(deltaMs) && deltaMs >= 6 * 60 * 60 * 1000) return 'date';
  }

  // Empty array or single bar: fall back to date for intraday to avoid "00:00".
  if (bars.length <= 1) return 'date';

  return config.xAxisFormat;
}

/**
 * Compute a small set of evenly-spaced x-axis tick labels with deduplication.
 *
 * For large datasets (e.g. 365 daily bars for 1Y) the chart should show only
 * ~6 well-spaced labels, not a label per bar. Duplicate labels (e.g. two bars
 * in the same month getting the same "May 2026" label) are suppressed.
 */
export function computeAxisTicks(
  bars: Array<{ timestamp: string }>,
  xAxisFormat: MarketGraphTimeframe['xAxisFormat'],
  targetCount = 6,
): Array<{ index: number; timestamp: string; label: string }> {
  if (bars.length === 0) return [];

  // Pick evenly spaced indices across the bar array.
  const step = Math.max(1, Math.floor(bars.length / targetCount));
  const indices: number[] = [];
  for (let i = 0; i < bars.length; i += step) {
    indices.push(i);
  }
  // Always include the last bar.
  if (indices[indices.length - 1] !== bars.length - 1) {
    indices.push(bars.length - 1);
  }

  // Build labels and deduplicate.
  const seen = new Set<string>();
  const ticks: Array<{ index: number; timestamp: string; label: string }> = [];
  for (const idx of indices) {
    const bar = bars[idx]!;
    const label = formatAxisTimestamp(bar.timestamp, xAxisFormat);
    if (label && !seen.has(label)) {
      seen.add(label);
      ticks.push({ index: idx, timestamp: bar.timestamp, label });
    }
  }
  return ticks;
}

/**
 * Format a bar timestamp for the x-axis based on the timeframe's xAxisFormat.
 */
export function formatAxisTimestamp(
  timestamp: string,
  xAxisFormat: MarketGraphTimeframe['xAxisFormat'],
): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  const locale = 'en-US';
  const tz = 'UTC';
  if (xAxisFormat === 'time') {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(date);
  }
  if (xAxisFormat === 'month') {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
      timeZone: tz,
    }).format(date);
  }
  // 'date'
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }).format(date);
}

/**
 * Format a bar timestamp for the hover tooltip based on the timeframe's tooltipDateFormat.
 */
export function formatTooltipTimestamp(
  timestamp: string,
  tooltipDateFormat: MarketGraphTimeframe['tooltipDateFormat'],
): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return timestamp.slice(0, 10);
  const locale = 'en-US';
  const tz = 'UTC';
  if (tooltipDateFormat === 'datetime') {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(date);
  }
  if (tooltipDateFormat === 'month') {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: tz,
    }).format(date);
  }
  // 'date'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }).format(date);
}
