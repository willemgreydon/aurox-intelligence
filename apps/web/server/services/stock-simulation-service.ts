'use server';

import {
  getCatalogAssetBySymbol,
  getMarketHistoryBarsBySymbols,
  getLatestMarketQuoteSnapshots,
  getMarketHistoryBars,
  getSimulationWorkspace,
  getUserWatchlist,
  listCatalogAssets,
  listSimulationTradableAssets,
  replaceMarketHistoryBars,
  searchStockAssets,
  upsertMarketQuoteSnapshots,
  type CatalogAsset,
  type PersistedMarketHistoryBar,
  type PersistedMarketQuoteSnapshot,
} from '@repo/db';
import { fetchMarketHistory, fetchMarketSnapshot, getProviderEnv } from '@repo/providers';
import { getOptionalCurrentSession, requireCurrentSession } from '../auth/session';
import { buildSimulationActivityLanes, type SimulationActivityLane } from './simulation-activity-lanes';

const QUOTE_STALE_MS = 15 * 60 * 1000;
const HISTORY_STALE_MS = 18 * 60 * 60 * 1000;
const QUOTE_CACHE_TTL_MS = 45 * 1000;
const HISTORY_SERIES_CACHE_TTL_MS = 10 * 60 * 1000;
const PROVIDER_ERROR_CACHE_TTL_MS = 10 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const quoteSnapshotCache = new Map<string, CacheEntry<PersistedMarketQuoteSnapshot[]>>();
const quoteSnapshotInFlight = new Map<string, Promise<PersistedMarketQuoteSnapshot[]>>();
const historySeriesCache = new Map<string, CacheEntry<Record<string, number[]>>>();
const historySeriesInFlight = new Map<string, Promise<Record<string, number[]>>>();

function getFreshCacheValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCacheValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function buildQuoteCacheKey(symbols: string[]) {
  const provider = getProviderEnv().MARKET_DATA_PROVIDER;
  const normalizedSymbols = [...symbols].sort();
  return `provider=${provider}|assetKind=stock,etf,crypto|symbols=${normalizedSymbols.join(',')}`;
}

function buildHistorySeriesCacheKey(symbols: string[], limit: number) {
  const normalizedSymbols = [...symbols].sort();
  return `interval=1d|range=${limit}|symbols=${normalizedSymbols.join(',')}`;
}

function isFreshEnough(timestamp: string | null | undefined, maxAgeMs: number) {
  if (!timestamp) {
    return false;
  }

  const parsed = new Date(timestamp).getTime();

  if (Number.isNaN(parsed)) {
    return false;
  }

  return Date.now() - parsed <= maxAgeMs;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeHistoryBars(bars: PersistedMarketHistoryBar[]): PersistedMarketHistoryBar[] {
  const dedupedByTimestamp = new Map<string, PersistedMarketHistoryBar>();

  for (const bar of bars) {
    const time = new Date(bar.timestamp).getTime();
    const hasFinitePriceRange =
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close);

    if (!Number.isFinite(time) || !hasFinitePriceRange) {
      continue;
    }

    dedupedByTimestamp.set(new Date(time).toISOString(), {
      ...bar,
      timestamp: new Date(time).toISOString(),
    });
  }

  return [...dedupedByTimestamp.values()].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

export async function loadMiniHistorySeries(
  symbols: string[],
  limit = 24,
): Promise<Record<string, number[]>> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];

  if (normalized.length === 0 || limit <= 0) {
    return {};
  }

  const cacheKey = buildHistorySeriesCacheKey(normalized, limit);
  const cached = getFreshCacheValue(historySeriesCache, cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = historySeriesInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const loader = (async () => {
    try {
      const rowsBySymbol = await getMarketHistoryBarsBySymbols(normalized, limit);
      const seriesBySymbol: Record<string, number[]> = {};

      for (const symbol of normalized) {
        const bars = normalizeHistoryBars(rowsBySymbol[symbol] ?? []);
        const closes = bars
          .map((bar) => bar.close)
          .filter((value) => Number.isFinite(value))
          .slice(-limit);

        seriesBySymbol[symbol] = closes;
      }

      setCacheValue(historySeriesCache, cacheKey, seriesBySymbol, HISTORY_SERIES_CACHE_TTL_MS);
      return seriesBySymbol;
    } catch {
      setCacheValue(historySeriesCache, cacheKey, {}, PROVIDER_ERROR_CACHE_TTL_MS);
      return {};
    } finally {
      historySeriesInFlight.delete(cacheKey);
    }
  })();

  historySeriesInFlight.set(cacheKey, loader);
  return loader;
}

export async function loadQuoteSnapshots(
  symbols: string[],
  knownAssetIdBySymbol?: ReadonlyMap<string, string>,
): Promise<PersistedMarketQuoteSnapshot[]> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];

  if (normalized.length === 0) {
    return [];
  }

  const cacheKey = buildQuoteCacheKey(normalized);
  const cached = getFreshCacheValue(quoteSnapshotCache, cacheKey);
  if (cached) {
    return normalized.flatMap((symbol) => (cached.find((item) => item.symbol === symbol) ? [cached.find((item) => item.symbol === symbol)!] : []));
  }

  const inFlight = quoteSnapshotInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const loader = (async () => {
    const cachedSnapshots = await getLatestMarketQuoteSnapshots(normalized);
    const cachedBySymbol = new Map(cachedSnapshots.map((snapshot) => [snapshot.symbol, snapshot]));
    const staleOrMissingSymbols = normalized.filter((symbol) => !isFreshEnough(cachedBySymbol.get(symbol)?.observedAt ?? null, QUOTE_STALE_MS));

    if (staleOrMissingSymbols.length === 0) {
      const snapshots = normalized.flatMap((symbol) => (cachedBySymbol.get(symbol) ? [cachedBySymbol.get(symbol)!] : []));
      setCacheValue(
        quoteSnapshotCache,
        cacheKey,
        snapshots,
        snapshots.length > 0 ? QUOTE_CACHE_TTL_MS : PROVIDER_ERROR_CACHE_TTL_MS,
      );
      return snapshots;
    }

    // Use the pre-built map when the caller already has the catalog, avoiding a duplicate DB round-trip.
    const assetIdBySymbol = knownAssetIdBySymbol ?? new Map((await listCatalogAssets()).map((asset) => [asset.symbol, asset.assetId]));

    try {
      const fetchedSnapshots = await fetchMarketSnapshot({
        symbols: staleOrMissingSymbols,
      });

      await upsertMarketQuoteSnapshots(
        fetchedSnapshots.map((snapshot) => ({
          symbol: snapshot.symbol,
          assetId: assetIdBySymbol.get(snapshot.symbol) ?? null,
          price: snapshot.price ?? null,
          change: snapshot.change ?? null,
          changePercent: snapshot.changePercent ?? null,
          source: snapshot.source,
          observedAt: snapshot.timestamp ?? null,
        })),
      );

      for (const snapshot of fetchedSnapshots) {
        cachedBySymbol.set(snapshot.symbol, {
          symbol: snapshot.symbol,
          assetId: assetIdBySymbol.get(snapshot.symbol) ?? null,
          price: snapshot.price ?? null,
          change: snapshot.change ?? null,
          changePercent: snapshot.changePercent ?? null,
          source: snapshot.source,
          observedAt: snapshot.timestamp ?? null,
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Gracefully keep cached data when the live provider path is unavailable.
    }

    const snapshots = normalized.flatMap((symbol) => (cachedBySymbol.get(symbol) ? [cachedBySymbol.get(symbol)!] : []));
    setCacheValue(
      quoteSnapshotCache,
      cacheKey,
      snapshots,
      snapshots.length > 0 ? QUOTE_CACHE_TTL_MS : PROVIDER_ERROR_CACHE_TTL_MS,
    );
    return snapshots;
  })().finally(() => {
    quoteSnapshotInFlight.delete(cacheKey);
  });

  quoteSnapshotInFlight.set(cacheKey, loader);
  return loader;
}

export async function loadHistoryBars(symbol: string): Promise<PersistedMarketHistoryBar[]> {
  const normalized = symbol.trim().toUpperCase();

  if (!normalized) {
    return [];
  }

  const cachedBars = normalizeHistoryBars(await getMarketHistoryBars(normalized, 90));
  const lastBarTimestamp = cachedBars.at(-1)?.timestamp ?? null;

  if (cachedBars.length >= 20 && isFreshEnough(lastBarTimestamp, HISTORY_STALE_MS)) {
    return cachedBars;
  }

  try {
    const history = await fetchMarketHistory({
      symbol: normalized,
    });

    const normalizedHistory = normalizeHistoryBars(
      history.map((bar) => ({
        symbol: normalized,
        timestamp: bar.timestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? null,
        source: bar.source,
        fetchedAt: new Date().toISOString(),
      })),
    );

    if (normalizedHistory.length > 0) {
      await replaceMarketHistoryBars(
        normalized,
        normalizedHistory.map((bar) => ({
          symbol: normalized,
          timestamp: bar.timestamp,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume ?? null,
          source: bar.source,
        })),
      );

      return normalizedHistory;
    }
  } catch {
    // Gracefully fall back to cached history.
  }

  return cachedBars;
}

export type StockCatalogPageData = {
  query: string;
  totalStocks: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  stocks: Array<{
    asset: CatalogAsset;
    quote: PersistedMarketQuoteSnapshot | null;
    isWatched: boolean;
    position: {
      quantity: number;
      marketValue: number;
      unrealizedPnl: number;
    } | null;
  }>;
  providerError: string | null;
};

export async function getStockCatalogPageData(
  query = '',
  options: { page?: number; pageSize?: number } = {},
): Promise<StockCatalogPageData> {
  const page =
    typeof options.page === 'number' && Number.isFinite(options.page) && options.page > 0
      ? Math.floor(options.page)
      : 1;
  const pageSize =
    typeof options.pageSize === 'number' && Number.isFinite(options.pageSize) && options.pageSize > 0
      ? Math.floor(options.pageSize)
      : 36;
  const [session, assets] = await Promise.all([
    getOptionalCurrentSession(),
    searchStockAssets(query),
  ]);
  const totalStocks = assets.length;
  const startIndex = (page - 1) * pageSize;
  const pagedAssets = assets.slice(startIndex, startIndex + pageSize);
  const hasPreviousPage = page > 1 && totalStocks > 0;
  const hasNextPage = page * pageSize < totalStocks;
  const quotes = await loadQuoteSnapshots(pagedAssets.map((asset) => asset.symbol));
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

  const watchlist = session ? await getUserWatchlist(session.user.id) : [];
  const quoteMap = Object.fromEntries(quotes.map((quote) => [quote.symbol, quote.price]));
  const workspace = session ? await getSimulationWorkspace(session.user.id, quoteMap) : null;
  const positionBySymbol = new Map(workspace?.positions.map((position) => [position.symbol, position]) ?? []);

  return {
    query,
    totalStocks,
    page,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    providerError: quotes.length === 0 ? 'Live or cached quote data is currently unavailable.' : null,
    stocks: pagedAssets.map((asset) => {
      const quote = quoteBySymbol.get(asset.symbol) ?? null;
      const position = positionBySymbol.get(asset.symbol) ?? null;

      return {
        asset,
        quote,
        isWatched: watchlist.some((item) => item.assetId === asset.assetId),
        position: position
          ? {
              quantity: position.quantity,
              marketValue: position.marketValue,
              unrealizedPnl: position.unrealizedPnl,
            }
          : null,
      };
    }),
  };
}

export type StockDetailPageData = {
  asset: CatalogAsset;
  quote: PersistedMarketQuoteSnapshot | null;
  history: PersistedMarketHistoryBar[];
  isWatched: boolean;
  position: {
    quantity: number;
    averageCost: number;
    marketValue: number;
    unrealizedPnl: number;
  } | null;
};

export type InvestableAssetDetailPageData = {
  asset: CatalogAsset;
  quote: PersistedMarketQuoteSnapshot | null;
  history: PersistedMarketHistoryBar[];
  isWatched: boolean;
  position: {
    quantity: number;
    averageCost: number;
    marketValue: number;
    unrealizedPnl: number;
  } | null;
};

export async function getInvestableAssetDetailPageData(
  symbol: string,
  requiredAssetClass?: CatalogAsset['assetClass'],
): Promise<InvestableAssetDetailPageData | null> {
  const normalized = symbol.trim().toUpperCase();
  const asset = await getCatalogAssetBySymbol(normalized);

  if (!asset || (requiredAssetClass ? asset.assetClass !== requiredAssetClass : false)) {
    return null;
  }

  if (asset.assetClass !== 'stock' && asset.assetClass !== 'etf' && asset.assetClass !== 'crypto') {
    return null;
  }

  const [session, quote, history] = await Promise.all([
    getOptionalCurrentSession(),
    loadQuoteSnapshots([normalized]).then((snapshots) => snapshots[0] ?? null),
    loadHistoryBars(normalized),
  ]);

  let isWatched = false;
  let position: StockDetailPageData['position'] = null;

  if (session) {
    const watchlist = await getUserWatchlist(session.user.id);
    const workspace = await getSimulationWorkspace(
      session.user.id,
      quote ? { [normalized]: quote.price } : {},
    );

    isWatched = watchlist.some((item) => item.assetId === asset.assetId);
    const holding = workspace.positions.find((item) => item.symbol === normalized) ?? null;
    position = holding
      ? {
          quantity: holding.quantity,
          averageCost: holding.averageCost,
          marketValue: holding.marketValue,
          unrealizedPnl: holding.unrealizedPnl,
        }
      : null;
  }

  return {
    asset,
    quote,
    history,
    isWatched,
    position,
  };
}

export async function getStockDetailPageData(symbol: string): Promise<StockDetailPageData | null> {
  const detail = await getInvestableAssetDetailPageData(symbol, 'stock');
  return detail;
}

export type SimulationPortfolioPageData = {
  workspace: Awaited<ReturnType<typeof getSimulationWorkspace>>;
  tradableAssets: Array<{
    asset: CatalogAsset;
    quote: PersistedMarketQuoteSnapshot | null;
    isWatched: boolean;
  }>;
  watchlist: Array<{
    asset: CatalogAsset;
    quote: PersistedMarketQuoteSnapshot | null;
  }>;
  equityCurve: Array<{
    timestamp: string;
    close: number;
  }>;
  positionsByAssetClass: Array<{
    assetClass: 'stock' | 'etf' | 'crypto';
    activeCount: number;
    marketValue: number;
  }>;
  activityLanes: SimulationActivityLane[];
};

export type SimulationOverviewData = {
  summary: Awaited<ReturnType<typeof getSimulationWorkspace>>['summary'];
  activityLanes: SimulationActivityLane[];
  recentOrders: Awaited<ReturnType<typeof getSimulationWorkspace>>['orders'];
  hasActiveInvestments: boolean;
};

export async function getSimulationOverviewDataForUser(userId: string): Promise<SimulationOverviewData> {
  const workspace = await getSimulationWorkspace(userId);
  return {
    summary: workspace.summary,
    activityLanes: buildSimulationActivityLanes(workspace),
    recentOrders: workspace.orders.slice(0, 8),
    hasActiveInvestments: workspace.summary.activeInvestmentCount > 0,
  };
}

export async function getSimulationPortfolioPageData(): Promise<SimulationPortfolioPageData> {
  const session = await requireCurrentSession('/invest/simulation');
  const [tradableAssets, watchlist] = await Promise.all([
    listSimulationTradableAssets('multi-asset'),
    getUserWatchlist(session.user.id),
  ]);

  const quoteCandidates = [...new Set([...tradableAssets.map((asset) => asset.symbol), ...watchlist.map((item) => item.symbol)])];
  const quotes = await loadQuoteSnapshots(quoteCandidates);
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const workspace = await getSimulationWorkspace(
    session.user.id,
    Object.fromEntries(quotes.map((quote) => [quote.symbol, quote.price])),
  );
  const assetById = new Map(tradableAssets.map((asset) => [asset.assetId, asset]));
  const watchedAssets = watchlist
    .map((item) => assetById.get(item.assetId))
    .filter((asset): asset is CatalogAsset => Boolean(asset));
  const positionsByAssetClass = (['stock', 'etf', 'crypto'] as const).map((assetClass) => {
    const rows = workspace.positions.filter((position) => position.assetClass === assetClass);
    return {
      assetClass,
      activeCount: rows.length,
      marketValue: roundCurrency(rows.reduce((sum, position) => sum + position.marketValue, 0)),
    };
  });

  return {
    workspace,
    tradableAssets: tradableAssets.map((asset) => ({
      asset,
      quote: quoteBySymbol.get(asset.symbol) ?? null,
      isWatched: watchlist.some((item) => item.assetId === asset.assetId),
    })),
    watchlist: watchedAssets.map((asset) => ({
      asset,
      quote: quoteBySymbol.get(asset.symbol) ?? null,
    })),
    equityCurve: [...workspace.snapshots]
      .sort((left, right) => new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime())
      .map((snapshot) => ({
        timestamp: snapshot.takenAt,
        close: roundCurrency(snapshot.equityValue),
      })),
    positionsByAssetClass,
    activityLanes: buildSimulationActivityLanes(workspace),
  };
}
