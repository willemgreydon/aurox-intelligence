import { getLinkedInvestmentAccounts, listCatalogAssets, type CatalogAsset } from '@repo/db';
import { getProviderEnv, getSparkasseGeorgeConnectionCapability, type ProviderMarketObservation } from '@repo/providers';
import type { ConnectedInvestmentAccount } from '@repo/api-contracts';
import { unstable_cache } from 'next/cache';
import { loadMiniHistorySeries, loadQuoteSnapshots } from '../services/stock-simulation-service';

export type InvestReadModel = {
  provider: string;
  providerError: string | null;
  assets: CatalogAsset[];
  totalAssets: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  observations: ProviderMarketObservation[];
  historySeriesBySymbol: Record<string, number[]>;
  linkedAccounts: ConnectedInvestmentAccount[];
  bankConnections: ReturnType<typeof getSparkasseGeorgeConnectionCapability>[];
};

const INVEST_CACHE_TTL_MS = 60_000;
const INVEST_CACHE_ERROR_TTL_MS = 10_000;
const DEFAULT_HISTORY_SYMBOL_LIMIT = 40;
const INVEST_READ_TYPE = 'invest-read-model-v2';

export type InvestReadModelOptions = {
  quoteSymbolLimit?: number;
  historySymbolLimit?: number;
  includeHistory?: boolean;
  preferredSymbols?: string[];
  pageContext?: string;
  assetClassFilter?: CatalogAsset['assetClass'];
  page?: number;
  pageSize?: number;
};

type ResolvedInvestReadModelOptions = {
  quoteSymbolLimit: number | null;
  historySymbolLimit: number;
  includeHistory: boolean;
  preferredSymbols: string[];
  pageContext: string;
  assetClassFilter: CatalogAsset['assetClass'] | null;
  page: number;
  pageSize: number | null;
};

type InvestCacheEntry = { data: InvestReadModel; cachedAt: number; ttlMs: number };
const investReadCache = new Map<string, InvestCacheEntry>();

const loadCatalogAssets = unstable_cache(
  async () => listCatalogAssets(),
  ['invest-catalog-assets-v1'],
  { revalidate: 300 },
);

const loadLinkedAccounts = unstable_cache(
  async () => getLinkedInvestmentAccounts(),
  ['invest-linked-accounts-v1'],
  { revalidate: 30 },
);

function resolveOptions(options: InvestReadModelOptions): ResolvedInvestReadModelOptions {
  return {
    quoteSymbolLimit:
      typeof options.quoteSymbolLimit === 'number' && Number.isFinite(options.quoteSymbolLimit) && options.quoteSymbolLimit > 0
        ? Math.floor(options.quoteSymbolLimit)
        : null,
    historySymbolLimit:
      typeof options.historySymbolLimit === 'number' && Number.isFinite(options.historySymbolLimit) && options.historySymbolLimit > 0
        ? Math.floor(options.historySymbolLimit)
        : DEFAULT_HISTORY_SYMBOL_LIMIT,
    includeHistory: options.includeHistory ?? true,
    preferredSymbols: [...new Set((options.preferredSymbols ?? []).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))],
    pageContext: options.pageContext?.trim() || 'invest',
    assetClassFilter:
      options.assetClassFilter === 'stock' ||
      options.assetClassFilter === 'etf' ||
      options.assetClassFilter === 'crypto' ||
      options.assetClassFilter === 'fx' ||
      options.assetClassFilter === 'index'
        ? options.assetClassFilter
        : null,
    page:
      typeof options.page === 'number' && Number.isFinite(options.page) && options.page > 0
        ? Math.floor(options.page)
        : 1,
    pageSize:
      typeof options.pageSize === 'number' && Number.isFinite(options.pageSize) && options.pageSize > 0
        ? Math.floor(options.pageSize)
        : null,
  };
}

function prioritizeAssets(assets: CatalogAsset[], preferredSymbols: string[]) {
  if (preferredSymbols.length === 0) {
    return assets;
  }

  const bySymbol = new Map(assets.map((asset) => [asset.symbol, asset]));
  const prioritized = preferredSymbols
    .map((symbol) => bySymbol.get(symbol))
    .filter((asset): asset is CatalogAsset => Boolean(asset));
  const prioritizedSymbols = new Set(prioritized.map((asset) => asset.symbol));
  const remaining = assets.filter((asset) => !prioritizedSymbols.has(asset.symbol));

  return [...prioritized, ...remaining];
}

function buildInvestCacheKey(provider: string, assets: CatalogAsset[], options: ResolvedInvestReadModelOptions) {
  const symbols = assets.map((asset) => asset.symbol).sort();
  return [
    `read=${INVEST_READ_TYPE}`,
    `provider=${provider}`,
    `context=${options.pageContext}`,
    `assetClass=${options.assetClassFilter ?? 'all'}`,
    `assetKind=stock,etf,crypto`,
    `quoteLimit=${options.quoteSymbolLimit ?? 'all'}`,
    `page=${options.page}`,
    `pageSize=${options.pageSize ?? 'all'}`,
    `historyRange=30`,
    `historyLimit=${options.includeHistory ? options.historySymbolLimit : 0}`,
    `symbols=${symbols.join(',')}`,
  ].join('|');
}

function getFreshCacheEntry(key: string): InvestReadModel | null {
  const entry = investReadCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAt >= entry.ttlMs) {
    investReadCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCacheEntry(key: string, data: InvestReadModel) {
  investReadCache.set(key, {
    data,
    cachedAt: Date.now(),
    ttlMs: data.providerError ? INVEST_CACHE_ERROR_TTL_MS : INVEST_CACHE_TTL_MS,
  });
}

export async function getInvestReadModel(options: InvestReadModelOptions = {}): Promise<InvestReadModel> {
  const resolvedOptions = resolveOptions(options);
  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;
  const provider = getProviderEnv().MARKET_DATA_PROVIDER;

  const [catalogAssets, linkedAccounts] = await Promise.all([loadCatalogAssets(), loadLinkedAccounts()]);
  const scopedCatalogAssets =
    resolvedOptions.assetClassFilter === null
      ? catalogAssets
      : catalogAssets.filter((asset) => asset.assetClass === resolvedOptions.assetClassFilter);
  const prioritizedAssets = prioritizeAssets(scopedCatalogAssets, resolvedOptions.preferredSymbols);
  const totalAssets = prioritizedAssets.length;
  const pagedAssets = (() => {
    if (resolvedOptions.pageSize === null) {
      return prioritizedAssets;
    }
    const startIndex = (resolvedOptions.page - 1) * resolvedOptions.pageSize;
    return prioritizedAssets.slice(startIndex, startIndex + resolvedOptions.pageSize);
  })();
  const assets =
    resolvedOptions.quoteSymbolLimit === null
      ? pagedAssets
      : pagedAssets.slice(0, resolvedOptions.quoteSymbolLimit);
  const hasPreviousPage = resolvedOptions.page > 1 && totalAssets > 0;
  const hasNextPage =
    resolvedOptions.pageSize !== null
      ? resolvedOptions.page * resolvedOptions.pageSize < totalAssets
      : false;
  const cacheKey = buildInvestCacheKey(provider, assets, resolvedOptions);
  const cached = getFreshCacheEntry(cacheKey);
  if (cached) {
    if (dev) {
      console.debug(`[invest-query] cache hit context=${resolvedOptions.pageContext} symbols=${assets.length}: ${(performance.now() - t0).toFixed(0)}ms`);
    }
    return cached;
  }

  const bankConnections = [getSparkasseGeorgeConnectionCapability()];
  const assetIdBySymbol: ReadonlyMap<string, string> = new Map(assets.map((asset) => [asset.symbol, asset.assetId]));

  if (dev) {
    console.debug(`[invest-query] cache miss context=${resolvedOptions.pageContext} symbols=${assets.length}/${scopedCatalogAssets.length}`);
    console.debug(`[invest-query] catalog+accounts: ${(performance.now() - t0).toFixed(0)}ms`);
  }

  let result: InvestReadModel;

  try {
    const symbols = assets.map((item) => item.symbol);
    const t1 = dev ? performance.now() : 0;
    const quotes = await loadQuoteSnapshots(symbols, assetIdBySymbol);
    if (dev) console.debug(`[invest-query] quotes (${symbols.length}): ${(performance.now() - t1).toFixed(0)}ms`);

    const symbolsWithQuotes = quotes
      .filter((item) => typeof item.price === 'number')
      .map((item) => item.symbol);

    // Cap history fetch to avoid oversized DB window-function queries on large catalogs.
    const historySymbols = resolvedOptions.includeHistory
      ? symbolsWithQuotes.slice(0, resolvedOptions.historySymbolLimit)
      : [];
    const t2 = dev ? performance.now() : 0;
    const historySeriesBySymbol =
      historySymbols.length > 0
        ? await loadMiniHistorySeries(historySymbols, 30).catch(() => ({}))
        : {};
    if (dev) console.debug(`[invest-query] history (${historySymbols.length}): ${(performance.now() - t2).toFixed(0)}ms`);

    const quoteBySymbol = new Map(quotes.map((item) => [item.symbol, item]));

    const observations = assets.flatMap((asset) => {
      const item = quoteBySymbol.get(asset.symbol);
      return typeof item?.price === 'number'
        ? [{
            symbol: item.symbol,
            assetKind: asset.assetClass,
            price: item.price,
            timestamp: item.observedAt ?? item.fetchedAt,
            source: item.source as ProviderMarketObservation['source'],
            currency: 'USD' as const,
            ...(typeof item.change === 'number' ? { change: item.change } : {}),
            ...(typeof item.changePercent === 'number' ? { changePercent: item.changePercent } : {}),
          }]
        : [];
    });

    result = {
      provider: observations[0]?.source ?? 'cache',
      providerError: null,
      assets,
      totalAssets,
      page: resolvedOptions.page,
      pageSize: resolvedOptions.pageSize ?? assets.length,
      hasNextPage,
      hasPreviousPage,
      observations,
      historySeriesBySymbol,
      linkedAccounts,
      bankConnections,
    };
  } catch (error) {
    result = {
      provider: 'cache',
      providerError: error instanceof Error ? error.message : 'Unable to fetch investment quote context.',
      assets,
      totalAssets,
      page: resolvedOptions.page,
      pageSize: resolvedOptions.pageSize ?? assets.length,
      hasNextPage,
      hasPreviousPage,
      observations: [],
      historySeriesBySymbol: {},
      linkedAccounts,
      bankConnections,
    };
  }

  if (dev) console.debug(`[invest-query] total: ${(performance.now() - t0).toFixed(0)}ms`);

  setCacheEntry(cacheKey, result);
  return result;
}
