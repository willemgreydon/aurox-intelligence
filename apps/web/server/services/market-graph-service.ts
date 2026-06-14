import { getInvestmentUniverse, getMarketHistoryBarsBySymbols } from '@repo/db';
import type { PersistedMarketHistoryBar } from '@repo/db';
import { deriveSignalSnapshot } from '@repo/signals';
import { unstable_cache } from 'next/cache';
import {
  type MarketGraphTimeframeId,
  MARKET_GRAPH_TIMEFRAMES,
  sliceBarsForTimeframe,
  downsampleBars,
} from '../../lib/market-graph-timeframes';
import { perfLog, perfNow } from '../lib/perf';
import { loadHistoryBars, loadQuoteSnapshots } from './stock-simulation-service';
import type { MarketHistoryResolution } from '@repo/providers';

type MarketGraphDataOptions = {
  assetClass?: 'stock' | 'etf' | 'crypto';
  preferredSymbols?: string[];
  limit?: number;
  /**
   * The timeframe the client has selected.
   * Determines how bars are sliced and what metadata is returned.
   * Defaults to '1D' when not provided.
   */
  timeframe?: MarketGraphTimeframeId;
  /** When true, skip live provider quote fetch and use cached/DB snapshots. */
  preferCached?: boolean;
};

export type MarketGraphBarPoint = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type MarketGraphDataMeta = {
  /** The timeframe that was requested */
  selectedTimeframe: MarketGraphTimeframeId;
  /** Resolution that was requested from the provider */
  requestedResolution: string;
  /**
   * Resolution actually available in the returned bars.
   * Will be 'daily' if intraday was requested but only daily bars were available.
   */
  actualResolution: 'daily' | 'intraday' | 'unknown';
  /** Number of bars returned for the primary asset */
  pointCount: number;
  /** Minimum acceptable points for this timeframe before degraded state triggers */
  minAcceptablePoints: number;
  /** Provider that supplied snapshot data */
  provider: string;
  /** Whether the data is considered fresh */
  isFresh: boolean;
  /** Whether a fallback (non-primary) provider or resolution was used */
  isFallback: boolean;
  /** Human-readable reason for fallback, if applicable */
  fallbackReason: string | null;
  /** Whether the chart should show a degraded overlay */
  isDegraded: boolean;
  /** Human-readable reason for degradation, if applicable */
  degradedReason: string | null;
  /** ISO timestamp of the most recent bar in the result set */
  lastBarTimestamp: string | null;
  /** Total bars available in cache before timeframe slicing */
  totalBarsInCache: number;
  /** ISO date string for the start of the requested timeframe window */
  requestedStart: string;
  /** ISO date string for the actual oldest bar available, or null if no bars */
  actualStart: string | null;
  /**
   * Ratio of actual coverage to requested coverage (0–1).
   * 1.0 = full coverage, <0.75 = insufficient for the timeframe.
   */
  coverageRatio: number;
  backfillAttempted?: boolean;
  backfillSucceeded?: boolean;
  providerReturnedBars?: number;
  providerQuoteMode?: 'live' | 'delayed' | 'cached' | 'none';
};

export type MarketGraphAssetResult = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  history: MarketGraphBarPoint[];
  signal: ReturnType<typeof deriveSignalSnapshot> | null;
  snapshot: {
    price: number;
    changePercent?: number;
    /** Quote observation time (ISO) for freshness/staleness display. */
    observedAt?: string | null;
  } | null;
};

export type MarketGraphResult = {
  assets: MarketGraphAssetResult[];
  meta: MarketGraphDataMeta;
};

// Fetch the investment universe with a generous cache (5 min) since this list changes rarely.
const loadInvestmentUniverse = unstable_cache(
  async () => getInvestmentUniverse(),
  ['market-graph-investment-universe-v1'],
  { revalidate: 300 },
);

// We fetch up to 730 bars (~2.9 years of trading days) to support the 2Y timeframe.
// 2 years of daily trading bars ≈ 504; 730 gives headroom for gaps and non-trading days.
const DB_HISTORY_LIMIT = 730;

function mapTimeframeToResolution(timeframeId: MarketGraphTimeframeId): MarketHistoryResolution {
  if (timeframeId === '1m') return '1m';
  if (timeframeId === '1h') return '5m';
  return '1d';
}

function buildBarPoint(bar: PersistedMarketHistoryBar): MarketGraphBarPoint {
  return {
    timestamp: bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume ?? null,
  };
}

export async function getMarketGraphData(options: MarketGraphDataOptions = {}): Promise<MarketGraphResult> {
  const t0 = perfNow();
  const timeframeId: MarketGraphTimeframeId = options.timeframe ?? '1D';
  const timeframeConfig = MARKET_GRAPH_TIMEFRAMES[timeframeId];

  const assets = await loadInvestmentUniverse();
  const filteredAssets = options.assetClass
    ? assets.filter((asset) => asset.assetClass === options.assetClass)
    : assets;
  const preferredSymbols = options.preferredSymbols ?? [];
  const bySymbol = new Map(filteredAssets.map((asset) => [asset.symbol, asset]));
  const prioritizedAssets = preferredSymbols
    .map((symbol) => bySymbol.get(symbol))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  const remainingAssets = filteredAssets.filter((asset) => !preferredSymbols.includes(asset.symbol));
  const selectedAssets = [...prioritizedAssets, ...remainingAssets].slice(0, options.limit ?? 36);
  const selectedSymbols = selectedAssets.map((asset) => asset.symbol);

  const tData = perfNow();
  const [snapshots, historyBySymbol] = await Promise.all([
    loadQuoteSnapshots(selectedSymbols, undefined, { preferCached: options.preferCached ?? false }).catch(() => []),
    getMarketHistoryBarsBySymbols(selectedSymbols, DB_HISTORY_LIMIT).catch(
      () => ({} as Record<string, PersistedMarketHistoryBar[]>),
    ),
  ]);
  perfLog(`market-graph:data-fetch symbols=${selectedSymbols.length} timeframe=${timeframeId}`, tData);

  // For symbols with no DB history (or insufficient history for the timeframe),
  // fetch from provider now (crypto/ETF cold-start fix, and long-timeframe top-up).
  const minBarsForTimeframe = timeframeConfig.targetPointCount;
  const requestedResolution = mapTimeframeToResolution(timeframeId);
  const symbolsMissingHistory = selectedSymbols.filter(
    (sym) => !historyBySymbol[sym] || historyBySymbol[sym]!.length < Math.floor(minBarsForTimeframe * 0.75),
  );
  if (symbolsMissingHistory.length > 0) {
    const tFetch = perfNow();
    const fetched = await Promise.allSettled(
      symbolsMissingHistory.map((sym) => loadHistoryBars(sym, minBarsForTimeframe, requestedResolution)),
    );
    fetched.forEach((result, idx) => {
      const symbol = symbolsMissingHistory[idx];
      if (symbol && result.status === 'fulfilled' && result.value.length > 0) {
        historyBySymbol[symbol] = result.value;
      }
    });
    perfLog(`market-graph:on-demand-history fetched=${symbolsMissingHistory.length} minBars=${minBarsForTimeframe}`, tFetch);
  }

  // Use the reference date from the most recent bar of the primary asset (or now).
  const primarySymbol = selectedAssets[0]?.symbol ?? '';
  let primaryAllBars = (historyBySymbol[primarySymbol] ?? [])
    .slice()
    .sort((l, r) => new Date(l.timestamp).getTime() - new Date(r.timestamp).getTime());
  let latestBarTimestamp = primaryAllBars.at(-1)?.timestamp;
  let referenceDate = latestBarTimestamp ? new Date(latestBarTimestamp) : new Date();

  // Determine overall metadata from the primary asset's bars.
  const primarySliceResult = sliceBarsForTimeframe(primaryAllBars, timeframeId, referenceDate);
  let slicedPrimary = primarySliceResult.bars;

  // Apply downsampling for 1Y and 2Y to keep SVG manageable.
  if (timeframeConfig.aggregationPolicy === 'downsample') {
    slicedPrimary = downsampleBars(slicedPrimary, timeframeConfig.targetPointCount);
  }

  let pointCount = slicedPrimary.length;
  let isDegraded = pointCount < timeframeConfig.degradedThreshold;
  let isDailyFallback = primarySliceResult.isDailyFallback;

  // Determine actual resolution.
  let actualResolution: MarketGraphDataMeta['actualResolution'] = 'unknown';
  if (primaryAllBars.length >= 2) {
    const first = new Date(primaryAllBars[0]!.timestamp).getTime();
    const second = new Date(primaryAllBars[1]!.timestamp).getTime();
    const deltaMs = second - first;
    if (Number.isFinite(deltaMs)) {
      actualResolution = deltaMs < 6 * 60 * 60 * 1000 ? 'intraday' : 'daily';
    }
  }

  // Compute coverage ratio: how much of the requested window is actually covered.
  let requestedStartDate = new Date(referenceDate.getTime() - timeframeConfig.coverageDays * 24 * 60 * 60 * 1000);
  let requestedStartIso = requestedStartDate.toISOString().slice(0, 10);
  let actualStartIso = primaryAllBars[0]?.timestamp?.slice(0, 10) ?? null;

  let coverageRatio = 0;
  if (actualStartIso) {
    const actualStartMs = new Date(actualStartIso).getTime();
    const referenceMs = referenceDate.getTime();
    const requestedMs = requestedStartDate.getTime();
    const requestedWindowMs = referenceMs - requestedMs;
    const actualWindowMs = referenceMs - actualStartMs;
    coverageRatio = requestedWindowMs > 0 ? Math.min(1, actualWindowMs / requestedWindowMs) : 0;
  }

  // Build fallback / degraded reason strings.
  let fallbackReason: string | null = null;
  let degradedReason: string | null = null;

  const isIntradayRequested =
    timeframeConfig.requestedProviderResolution === '1min' ||
    timeframeConfig.requestedProviderResolution === '60min';

  if (isIntradayRequested && isDailyFallback) {
    const assetLabel = selectedAssets[0]?.assetClass === 'crypto' ? 'crypto' : selectedAssets[0]?.assetClass === 'etf' ? 'ETF' : 'stock';
    fallbackReason = `Intraday ${assetLabel} bars unavailable from current provider/config. Showing daily provider history.`;
  }

  const hasSufficientCoverage = coverageRatio >= 0.75;
  let backfillAttempted = false;
  let backfillSucceeded = false;
  let providerReturnedBars = 0;

  if (!hasSufficientCoverage && (timeframeId === '1Y' || timeframeId === '2Y') && primarySymbol) {
    backfillAttempted = true;
    const topUpBars = await loadHistoryBars(primarySymbol, timeframeConfig.targetPointCount, '1d').catch(() => []);
    providerReturnedBars = topUpBars.length;
    if (topUpBars.length > primaryAllBars.length) {
      backfillSucceeded = true;
      historyBySymbol[primarySymbol] = topUpBars;
      primaryAllBars = topUpBars
        .slice()
        .sort((l, r) => new Date(l.timestamp).getTime() - new Date(r.timestamp).getTime());
      latestBarTimestamp = primaryAllBars.at(-1)?.timestamp;
      referenceDate = latestBarTimestamp ? new Date(latestBarTimestamp) : new Date();
      const nextSlice = sliceBarsForTimeframe(primaryAllBars, timeframeId, referenceDate);
      slicedPrimary =
        timeframeConfig.aggregationPolicy === 'downsample'
          ? downsampleBars(nextSlice.bars, timeframeConfig.targetPointCount)
          : nextSlice.bars;
      pointCount = slicedPrimary.length;
      isDegraded = pointCount < timeframeConfig.degradedThreshold;
      isDailyFallback = nextSlice.isDailyFallback;
      requestedStartDate = new Date(referenceDate.getTime() - timeframeConfig.coverageDays * 24 * 60 * 60 * 1000);
      requestedStartIso = requestedStartDate.toISOString().slice(0, 10);
      actualStartIso = primaryAllBars[0]?.timestamp?.slice(0, 10) ?? null;
      coverageRatio = 0;
      if (actualStartIso) {
        const actualStartMs = new Date(actualStartIso).getTime();
        const referenceMs = referenceDate.getTime();
        const requestedMs = requestedStartDate.getTime();
        const requestedWindowMs = referenceMs - requestedMs;
        const actualWindowMs = referenceMs - actualStartMs;
        coverageRatio = requestedWindowMs > 0 ? Math.min(1, actualWindowMs / requestedWindowMs) : 0;
      }
    }
  }

  const isDegradedFinal = isDegraded || !hasSufficientCoverage;

  if (isDegraded) {
    degradedReason =
      pointCount === 0
        ? `Insufficient history for selected timeframe.`
        : `Provider returned ${pointCount} bars for ${timeframeId}.`;
  } else if (!hasSufficientCoverage) {
    const actualMonths = Math.round((coverageRatio * timeframeConfig.coverageDays) / 30);
    const requestedMonths = Math.round(timeframeConfig.coverageDays / 30);
    degradedReason = `Only ${actualMonths} month${actualMonths !== 1 ? 's' : ''} of ${requestedMonths}-month history available.`;
  }

  const provider = snapshots[0]?.source ?? 'cache';
  const providerQuoteMode: MarketGraphDataMeta['providerQuoteMode'] =
    provider === 'binance' || provider === 'polygon' ? 'live' : provider === 'eodhd' ? 'delayed' : provider === 'cache' ? 'cached' : 'cached';
  const lastBarTimestamp = latestBarTimestamp ?? null;
  const isFresh = lastBarTimestamp
    ? Date.now() - new Date(lastBarTimestamp).getTime() < timeframeConfig.maxStalenessMs
    : false;

  const meta: MarketGraphDataMeta = {
    selectedTimeframe: timeframeId,
    requestedResolution: timeframeConfig.requestedProviderResolution,
    actualResolution,
    pointCount,
    minAcceptablePoints: timeframeConfig.minAcceptablePoints,
    provider,
    isFresh,
    isFallback: isDailyFallback,
    fallbackReason,
    isDegraded: isDegradedFinal,
    degradedReason,
    lastBarTimestamp,
    totalBarsInCache: primaryAllBars.length,
    requestedStart: requestedStartIso,
    actualStart: actualStartIso,
    coverageRatio,
    backfillAttempted,
    backfillSucceeded,
    providerReturnedBars,
    providerQuoteMode,
  };

  // Build per-asset histories — send the full sorted bar set so the client can slice
  // client-side when the user switches timeframes. Downsampling is left to the client.
  // The server-side slice above is used only for metadata (pointCount, isDegraded, etc.).
  const histories = selectedAssets.map((asset) => {
    const allBars = (historyBySymbol[asset.symbol] ?? [])
      .slice()
      .sort((l, r) => new Date(l.timestamp).getTime() - new Date(r.timestamp).getTime());

    // Derive signal from the last 252 closes (1Y window) for a meaningful score.
    const signalCloses = allBars.slice(-252).map((bar) => bar.close);
    return {
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass as 'stock' | 'etf' | 'crypto',
      history: allBars.map(buildBarPoint),
      signal: signalCloses.length > 1 ? deriveSignalSnapshot(asset.assetId, signalCloses) : null,
    };
  });

  const resultAssets: MarketGraphAssetResult[] = histories.map((asset) => ({
    ...asset,
    snapshot: (() => {
      const snapshot = snapshots.find((item) => item.symbol === asset.symbol);
      if (!snapshot || typeof snapshot.price !== 'number') {
        return null;
      }
      const observedAt = snapshot.observedAt ?? snapshot.fetchedAt ?? null;
      if (typeof snapshot.changePercent === 'number') {
        return { price: snapshot.price, changePercent: snapshot.changePercent, observedAt };
      }
      return { price: snapshot.price, observedAt };
    })(),
  }));

  perfLog(`market-graph:total timeframe=${timeframeId} bars=${pointCount}`, t0);

  return { assets: resultAssets, meta };
}
