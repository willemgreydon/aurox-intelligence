import type { OhlcvBar } from './market-pulse';

/**
 * Pure Volatility Pulse analytics: a rolling realized-volatility history plus
 * where the CURRENT reading sits relative to the asset's OWN recent history.
 * Answers "is this market quiet, normal, elevated, or extreme — for itself?"
 * rather than against an arbitrary universal threshold. No I/O; unit-tested.
 */

const TRADING_DAYS_PER_YEAR = 252;
const DEFAULT_WINDOW = 20;
const MIN_BARS = 25;

export type VolatilityBand = 'quiet' | 'normal' | 'elevated' | 'extreme';

export type VolatilityPulsePoint = {
  date: string;
  /** Annualized realized volatility % over the trailing window ending here. */
  volPct: number;
};

export type VolatilityPulse = {
  hasData: boolean;
  series: VolatilityPulsePoint[];
  currentVolPct: number;
  medianVolPct: number;
  minVolPct: number;
  maxVolPct: number;
  /** Where the current reading sits within its own history, 0..1. */
  percentile: number;
  band: VolatilityBand;
};

const EMPTY: VolatilityPulse = {
  hasData: false,
  series: [],
  currentVolPct: 0,
  medianVolPct: 0,
  minVolPct: 0,
  maxVolPct: 0,
  percentile: 0,
  band: 'normal',
};

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function bandFor(percentile: number): VolatilityBand {
  if (percentile < 0.25) return 'quiet';
  if (percentile < 0.6) return 'normal';
  if (percentile < 0.85) return 'elevated';
  return 'extreme';
}

export function computeVolatilityPulse(bars: readonly OhlcvBar[], window = DEFAULT_WINDOW): VolatilityPulse {
  const clean = bars.filter((bar) => Number.isFinite(bar.close) && bar.close > 0);
  if (clean.length < MIN_BARS) {
    return EMPTY;
  }

  // Close-to-close simple returns.
  const returns: number[] = [];
  for (let i = 1; i < clean.length; i += 1) {
    returns.push(clean[i]!.close / clean[i - 1]!.close - 1);
  }

  // Rolling annualized realized volatility, aligned to the bar ending the window.
  const series: VolatilityPulsePoint[] = [];
  for (let i = window - 1; i < returns.length; i += 1) {
    const windowReturns = returns.slice(i - window + 1, i + 1);
    const volPct = stdev(windowReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
    // returns[i] corresponds to the price move ending at clean[i + 1].
    series.push({ date: clean[i + 1]!.timestamp, volPct });
  }

  if (series.length === 0) {
    return EMPTY;
  }

  const vols = series.map((p) => p.volPct);
  const currentVolPct = vols[vols.length - 1]!;
  const belowOrEqual = vols.filter((v) => v <= currentVolPct).length;
  const percentile = vols.length > 1 ? (belowOrEqual - 1) / (vols.length - 1) : 0;

  return {
    hasData: true,
    series,
    currentVolPct,
    medianVolPct: median(vols),
    minVolPct: Math.min(...vols),
    maxVolPct: Math.max(...vols),
    percentile: Math.max(0, Math.min(1, percentile)),
    band: bandFor(Math.max(0, Math.min(1, percentile))),
  };
}
