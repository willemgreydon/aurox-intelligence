import { getInvestmentUniverse, getMarketHistoryBarsBySymbols } from '@repo/db';
import { deriveSignalSnapshot } from '@repo/signals';
import { computeRangeMetrics, type OhlcvBar } from '../../lib/market-pulse';

/**
 * Market State Constellation service.
 *
 * Assembles, for the tradable universe, a scale-free per-asset reading:
 *   - momentum  = window return % (computeRangeMetrics.rangeReturnPct)
 *   - risk      = annualized realized volatility % (realizedVolatilityPct)
 *   - signal    = deterministic composite score + interpretation + confidence
 *
 * Momentum/volatility are deliberately % (not raw price deltas or price-std)
 * so they are comparable across assets of very different price scales — the
 * axes of the constellation must mean the same thing for a $30 ETF and a $900
 * stock. Everything downstream is normalized in the pure mapper.
 *
 * Cost: ONE batched DB query for all symbols (getMarketHistoryBarsBySymbols) +
 * pure per-asset compute. No per-symbol provider calls.
 */

/** Minimum bars for a defensible momentum/volatility read. */
const MIN_BARS = 20;
/** History depth (trading days) pulled per symbol. */
const HISTORY_BARS = 90;
/** Cap the universe so the scatter stays readable and the DB query bounded. */
const MAX_POINTS = 44;

export type ConstellationSignalDirection = 'bullish' | 'bearish' | 'neutral';

export type ConstellationPoint = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  /** Window return %, e.g. +8.4 or -3.1. */
  momentumPct: number;
  /** Annualized realized volatility %, always >= 0. */
  volatilityPct: number;
  /** Deterministic composite score in [-1, 1]. */
  compositeScore: number;
  /** Signal confidence in [0, 1]. */
  confidence: number;
  direction: ConstellationSignalDirection;
  latestPrice: number | null;
  barsAnalyzed: number;
};

export type MarketStateConstellationResult = {
  points: ConstellationPoint[];
  meta: {
    asOf: string;
    /** Assets actually plotted. */
    pointCount: number;
    /** Assets considered before insufficient-data filtering. */
    universeCount: number;
    momentumRange: { min: number; max: number };
    volatilityRange: { min: number; max: number };
    /** Median realized volatility — the horizontal reference line. */
    medianVolatilityPct: number;
  };
};

function toOhlcv(bars: readonly { timestamp: string; open: number; high: number; low: number; close: number; volume: number | null }[]): OhlcvBar[] {
  return bars.map((bar) => ({
    timestamp: bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export async function getMarketStateConstellationData(nowIso: string = new Date().toISOString()): Promise<MarketStateConstellationResult> {
  const universe = await getInvestmentUniverse().catch(() => []);
  // Tradable, simulation-first assets only, bounded for readability.
  const selected = universe.filter((asset) => asset.isSimulated).slice(0, MAX_POINTS);

  const emptyMeta: MarketStateConstellationResult['meta'] = {
    asOf: nowIso,
    pointCount: 0,
    universeCount: selected.length,
    momentumRange: { min: 0, max: 0 },
    volatilityRange: { min: 0, max: 0 },
    medianVolatilityPct: 0,
  };

  if (selected.length === 0) {
    return { points: [], meta: emptyMeta };
  }

  const symbols = selected.map((asset) => asset.symbol);
  const barsBySymbol = await getMarketHistoryBarsBySymbols(symbols, HISTORY_BARS).catch(
    () => ({}) as Record<string, never[]>,
  );

  const points: ConstellationPoint[] = [];
  for (const asset of selected) {
    const bars = barsBySymbol[asset.symbol] ?? [];
    if (bars.length < MIN_BARS) continue;

    const ohlcv = toOhlcv(bars);
    const metrics = computeRangeMetrics(ohlcv);
    if (metrics.rangeReturnPct === null || metrics.realizedVolatilityPct === null) continue;

    const signal = deriveSignalSnapshot(asset.assetId, ohlcv.map((bar) => bar.close));

    points.push({
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      momentumPct: metrics.rangeReturnPct,
      volatilityPct: Math.max(0, metrics.realizedVolatilityPct),
      compositeScore: signal.compositeScoreValue,
      confidence: signal.confidenceScore,
      direction: signal.interpretation,
      latestPrice: signal.latestPrice,
      barsAnalyzed: bars.length,
    });
  }

  if (points.length === 0) {
    return { points: [], meta: emptyMeta };
  }

  const momenta = points.map((point) => point.momentumPct);
  const vols = points.map((point) => point.volatilityPct);

  return {
    points,
    meta: {
      asOf: nowIso,
      pointCount: points.length,
      universeCount: selected.length,
      momentumRange: { min: Math.min(...momenta), max: Math.max(...momenta) },
      volatilityRange: { min: Math.min(...vols), max: Math.max(...vols) },
      medianVolatilityPct: median(vols),
    },
  };
}
