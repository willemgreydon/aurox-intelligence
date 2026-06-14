import { getLinkedInvestmentAccounts, listCatalogAssets, type CatalogAsset } from '@repo/db';
import { getProviderEnv, getSparkasseGeorgeConnectionCapability, type ProviderMarketObservation } from '@repo/providers';
import type { ConnectedInvestmentAccount } from '@repo/api-contracts';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import type { NewsStreamResponse } from '@repo/api-contracts';
import { hashSymbols } from '../lib/cache-key';
import { perfLog, perfNow } from '../lib/perf';
import {
  loadMiniHistorySeriesRequestScoped,
  loadQuoteSnapshots,
} from '../services/stock-simulation-service';
import { getNewsReadModel } from './news-query';

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
  newsStream: NewsStreamResponse;
};

const INVEST_CACHE_TTL_MS = 60_000;
const INVEST_CACHE_ERROR_TTL_MS = 10_000;
const DEFAULT_HISTORY_SYMBOL_LIMIT = 24;
const DEFAULT_QUOTE_SYMBOL_LIMIT = 60;
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

// Linked investment accounts are user-specific connected-account data. They must
// never be served from a shared cross-request cache (user-specific-cache-rule.md):
// a `unstable_cache` entry populated by one user could be read by another. Read
// fresh on every request. When this becomes a per-user repository query, it must
// be scoped by the authenticated user id and remain uncached (or keyed by user id).
const loadLinkedAccounts = async () => getLinkedInvestmentAccounts();

function resolveOptions(options: InvestReadModelOptions): ResolvedInvestReadModelOptions {
  return {
    quoteSymbolLimit:
      typeof options.quoteSymbolLimit === 'number' && Number.isFinite(options.quoteSymbolLimit) && options.quoteSymbolLimit > 0
        ? Math.floor(options.quoteSymbolLimit)
        : DEFAULT_QUOTE_SYMBOL_LIMIT,
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
    `quoteLimit=${options.quoteSymbolLimit}`,
    `page=${options.page}`,
    `pageSize=${options.pageSize ?? 'all'}`,
    `historyRange=30`,
    `historyLimit=${options.includeHistory ? options.historySymbolLimit : 0}`,
    `symbolHash=${hashSymbols(symbols)}`,
    `symbolCount=${symbols.length}`,
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
  const t0 = perfNow();
  const provider = getProviderEnv().MARKET_DATA_PROVIDER;

  const tDb = perfNow();
  const [catalogAssets, linkedAccounts, newsStream] = await Promise.all([loadCatalogAssets(), loadLinkedAccounts(), getNewsReadModel()]);
  perfLog('invest-query:db-read-models', tDb);
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
    perfLog(`invest-query:cache-hit context=${resolvedOptions.pageContext} symbols=${assets.length}`, t0);
    return cached;
  }

  const bankConnections = [getSparkasseGeorgeConnectionCapability()];
  const assetIdBySymbol: ReadonlyMap<string, string> = new Map(assets.map((asset) => [asset.symbol, asset.assetId]));

  perfLog(`invest-query:cache-miss context=${resolvedOptions.pageContext} symbols=${assets.length}/${scopedCatalogAssets.length}`, t0);

  let result: InvestReadModel;

  try {
    const symbols = assets.map((item) => item.symbol);
    const t1 = perfNow();
    const quotes = await loadQuoteSnapshots(symbols, assetIdBySymbol, {
      preferCached: true,
      maxSymbols: resolvedOptions.quoteSymbolLimit ?? undefined,
    });
    perfLog(`invest-query:provider-fetch symbols=${symbols.length}`, t1);

    const symbolsWithQuotes = quotes
      .filter((item) => typeof item.price === 'number')
      .map((item) => item.symbol);

    // Cap history fetch to avoid oversized DB window-function queries on large catalogs.
    const historySymbols = resolvedOptions.includeHistory
      ? symbolsWithQuotes.slice(0, resolvedOptions.historySymbolLimit)
      : [];
    const t2 = perfNow();
    const historyKey = historySymbols.join(',');
    const historySeriesBySymbol =
      historySymbols.length > 0
        ? await loadMiniHistorySeriesRequestScoped(historyKey, 30).catch(() => ({}))
        : {};
    perfLog(`invest-query:history-fetch symbols=${historySymbols.length}`, t2);

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
      newsStream,
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
      newsStream,
    };
  }

  perfLog('invest-query:total', t0);

  setCacheEntry(cacheKey, result);
  return result;
}

export const getInvestReadModelCached = cache(
  async (
    quoteSymbolLimit: number | null,
    historySymbolLimit: number | null,
    includeHistory: boolean,
    preferredSymbolsKey: string,
    pageContext: string,
    assetClassFilter: CatalogAsset['assetClass'] | null,
    page: number | null,
    pageSize: number | null,
  ): Promise<InvestReadModel> =>
    getInvestReadModel({
      ...(typeof quoteSymbolLimit === 'number' ? { quoteSymbolLimit } : {}),
      ...(typeof historySymbolLimit === 'number' ? { historySymbolLimit } : {}),
      includeHistory,
      preferredSymbols: preferredSymbolsKey ? preferredSymbolsKey.split(',') : [],
      pageContext,
      ...(assetClassFilter ? { assetClassFilter } : {}),
      ...(typeof page === 'number' ? { page } : {}),
      ...(typeof pageSize === 'number' ? { pageSize } : {}),
    }),
);
