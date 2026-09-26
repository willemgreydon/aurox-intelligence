/**
 * Pure drawdown analytics for a portfolio equity series.
 *
 * Drawdown at time t = (equity_t − runningPeak_t) / runningPeak_t, always <= 0.
 * The "underwater" curve is 0 at every new peak and dips negative in between,
 * recovering to 0 when a prior peak is reclaimed. No I/O, deterministic — the
 * math is unit-tested independently of the (auth-gated) portfolio page.
 */

export type EquityPoint = {
  date: string;
  accountValue: number;
};

export type DrawdownPoint = {
  date: string;
  equity: number;
  /** Percentage drawdown from the running peak; 0 at peaks, negative underwater. */
  drawdownPct: number;
  isPeak: boolean;
};

export type DrawdownAnalytics = {
  hasData: boolean;
  series: DrawdownPoint[];
  /** Most negative drawdown across the series (<= 0). */
  maxDrawdownPct: number;
  /** Drawdown at the latest point (<= 0). */
  currentDrawdownPct: number;
  peakDate: string | null;
  troughDate: string | null;
  /** Whether the series is currently at (or above) its running peak. */
  atPeak: boolean;
};

const EMPTY: DrawdownAnalytics = {
  hasData: false,
  series: [],
  maxDrawdownPct: 0,
  currentDrawdownPct: 0,
  peakDate: null,
  troughDate: null,
  atPeak: true,
};

export function computeDrawdownAnalytics(points: readonly EquityPoint[]): DrawdownAnalytics {
  const valid = points.filter((point) => Number.isFinite(point.accountValue));
  if (valid.length < 2) {
    return EMPTY;
  }

  let runningPeak = valid[0]!.accountValue;
  let peakDateForTrough = valid[0]!.date;
  const series: DrawdownPoint[] = [];
  let maxDrawdownPct = 0;
  let troughDate: string | null = null;
  let peakDateAtTrough: string | null = null;

  for (const point of valid) {
    const isPeak = point.accountValue >= runningPeak;
    if (isPeak) {
      runningPeak = point.accountValue;
      peakDateForTrough = point.date;
    }
    const drawdownPct = runningPeak > 0 ? ((point.accountValue - runningPeak) / runningPeak) * 100 : 0;
    if (drawdownPct < maxDrawdownPct) {
      maxDrawdownPct = drawdownPct;
      troughDate = point.date;
      peakDateAtTrough = peakDateForTrough;
    }
    series.push({ date: point.date, equity: point.accountValue, drawdownPct, isPeak });
  }

  const currentDrawdownPct = series[series.length - 1]!.drawdownPct;

  return {
    hasData: true,
    series,
    maxDrawdownPct,
    currentDrawdownPct,
    peakDate: peakDateAtTrough,
    troughDate,
    atPeak: currentDrawdownPct >= -1e-9,
  };
}
