/**
 * Market Pulse — pure, deterministic derived metrics computed from REAL OHLCV
 * history bars. No I/O, no fabricated data. Every output is null-safe: when
 * inputs are insufficient the functions return a typed "insufficient" result
 * rather than guessing.
 *
 * These power the asset-detail Price Explorer and Market Pulse infographic and
 * are shared between the server (full-history pulse) and the client range
 * slicer, so they must stay pure and side-effect free.
 */

export type OhlcvBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type PulseRangeId = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export type PulseRangeOption = {
  id: PulseRangeId;
  label: string;
  /** Approx number of daily bars; null = no fixed window (YTD/ALL handled separately). */
  approxBars: number | null;
};

/**
 * Ranges derivable from DAILY bars only. We deliberately do NOT offer 1D/5D
 * intraday ranges because the cached history is daily granularity — offering
 * them would imply data we do not have.
 */
export const PULSE_RANGE_OPTIONS: PulseRangeOption[] = [
  { id: '1M', label: '1M', approxBars: 21 },
  { id: '3M', label: '3M', approxBars: 63 },
  { id: '6M', label: '6M', approxBars: 126 },
  { id: 'YTD', label: 'YTD', approxBars: null },
  { id: '1Y', label: '1Y', approxBars: 252 },
  { id: 'ALL', label: 'All', approxBars: null },
];

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Year of a bar timestamp, or null if unparseable. Pure — no `new Date()` ambient calls beyond parsing the given string. */
function parseYear(timestamp: string): number | null {
  const parsed = new Date(timestamp);
  const year = parsed.getUTCFullYear();
  return Number.isNaN(year) ? null : year;
}

/**
 * Slice daily bars to a range. For YTD we filter by calendar year of the most
 * recent bar (so it is self-consistent without needing the wall clock). For
 * fixed windows we take the last N bars. ALL returns every bar.
 */
export function sliceBarsByRange(bars: OhlcvBar[], range: PulseRangeId): OhlcvBar[] {
  if (bars.length === 0) return [];
  if (range === 'ALL') return bars;

  if (range === 'YTD') {
    const lastBar = bars[bars.length - 1];
    const currentYear = lastBar ? parseYear(lastBar.timestamp) : null;
    if (currentYear === null) return bars;
    return bars.filter((bar) => parseYear(bar.timestamp) === currentYear);
  }

  const option = PULSE_RANGE_OPTIONS.find((opt) => opt.id === range);
  const window = option?.approxBars ?? bars.length;
  return bars.slice(Math.max(0, bars.length - window));
}

export type RangeMetrics = {
  hasData: boolean;
  barCount: number;
  /** Highest high across the window. */
  high: number | null;
  /** Lowest low across the window. */
  low: number | null;
  firstClose: number | null;
  lastClose: number | null;
  /** Percentage return from first to last close across the window. */
  rangeReturnPct: number | null;
  /** Where the latest close sits within [low, high]: 0 = at low, 1 = at high. */
  rangePosition: number | null;
  /** Annualized realized volatility (%), from close-to-close returns. */
  realizedVolatilityPct: number | null;
  latestVolume: number | null;
  averageVolume: number | null;
  /** latestVolume / averageVolume — >1 means above-average activity. */
  volumeIntensity: number | null;
};

const EMPTY_METRICS: RangeMetrics = {
  hasData: false,
  barCount: 0,
  high: null,
  low: null,
  firstClose: null,
  lastClose: null,
  rangeReturnPct: null,
  rangePosition: null,
  realizedVolatilityPct: null,
  latestVolume: null,
  averageVolume: null,
  volumeIntensity: null,
};

const TRADING_DAYS_PER_YEAR = 252;

/**
 * Compute range metrics from a set of bars. `referencePrice` (e.g. the latest
 * quote price) overrides the last close for range-position/return when given —
 * useful when the live quote is fresher than the last daily bar. Pass null to
 * use the last bar's close.
 */
export function computeRangeMetrics(bars: OhlcvBar[], referencePrice: number | null = null): RangeMetrics {
  if (bars.length < 2) {
    return { ...EMPTY_METRICS, barCount: bars.length };
  }

  const highs = bars.map((b) => b.high).filter(isFiniteNumber);
  const lows = bars.map((b) => b.low).filter(isFiniteNumber);
  const closes = bars.map((b) => b.close).filter(isFiniteNumber);

  if (closes.length < 2 || highs.length === 0 || lows.length === 0) {
    return { ...EMPTY_METRICS, barCount: bars.length };
  }

  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const firstClose = closes[0]!;
  const lastBarClose = closes[closes.length - 1]!;
  const lastClose = isFiniteNumber(referencePrice) ? referencePrice : lastBarClose;

  const rangeReturnPct = firstClose !== 0 ? ((lastClose - firstClose) / firstClose) * 100 : null;

  const span = high - low;
  const rangePosition = span > 0 ? Math.min(1, Math.max(0, (lastClose - low) / span)) : null;

  // Close-to-close simple returns → sample stdev → annualized.
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1]!;
    const curr = closes[i]!;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  let realizedVolatilityPct: number | null = null;
  if (returns.length >= 2) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
    const dailyStdev = Math.sqrt(variance);
    realizedVolatilityPct = dailyStdev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
  }

  const volumes = bars.map((b) => b.volume).filter(isFiniteNumber);
  const latestVolume = isFiniteNumber(bars[bars.length - 1]?.volume) ? bars[bars.length - 1]!.volume : null;
  const averageVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;
  const volumeIntensity =
    isFiniteNumber(latestVolume) && isFiniteNumber(averageVolume) && averageVolume > 0
      ? latestVolume / averageVolume
      : null;

  return {
    hasData: true,
    barCount: bars.length,
    high,
    low,
    firstClose,
    lastClose,
    rangeReturnPct,
    rangePosition,
    realizedVolatilityPct,
    latestVolume,
    averageVolume,
    volumeIntensity,
  };
}

export type VolatilityBand = 'low' | 'moderate' | 'elevated' | 'high';

/**
 * Classify annualized realized volatility into a band. Thresholds are
 * intentionally asset-class aware: crypto is structurally more volatile, so the
 * same band labels map to higher numeric thresholds.
 */
export function classifyVolatility(
  annualizedVolPct: number | null,
  assetClass: 'stock' | 'etf' | 'crypto',
): VolatilityBand | null {
  if (!isFiniteNumber(annualizedVolPct)) return null;
  const thresholds =
    assetClass === 'crypto'
      ? { low: 40, moderate: 70, elevated: 100 }
      : assetClass === 'etf'
        ? { low: 12, moderate: 20, elevated: 30 }
        : { low: 18, moderate: 30, elevated: 45 };
  if (annualizedVolPct < thresholds.low) return 'low';
  if (annualizedVolPct < thresholds.moderate) return 'moderate';
  if (annualizedVolPct < thresholds.elevated) return 'elevated';
  return 'high';
}

export type LiquidityBand = 'thin' | 'moderate' | 'deep' | 'unknown';

/** Classify activity from volume intensity (latest vs average). */
export function classifyVolumeIntensity(intensity: number | null): LiquidityBand {
  if (!isFiniteNumber(intensity)) return 'unknown';
  if (intensity < 0.6) return 'thin';
  if (intensity < 1.4) return 'moderate';
  return 'deep';
}
