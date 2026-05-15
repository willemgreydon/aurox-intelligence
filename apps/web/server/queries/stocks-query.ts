import type { ProviderMarketObservation } from '@repo/providers';
import { getProviderEnv } from '@repo/providers';
import { getDashboardReadModel, getInvestmentUniverse, type DashboardOperationalReadModel, type InvestmentUniverseAsset } from '@repo/db';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { hashSymbols } from '../lib/cache-key';
import { getMarketQueryInitialLimit } from '../lib/market-runtime-config';
import { perfLog, perfNow } from '../lib/perf';
import { loadQuoteSnapshots } from '../services/stock-simulation-service';

export type StocksReadModel = {
  provider: string;
  providerError: string | null;
  observations: ProviderMarketObservation[];
  dashboard: DashboardOperationalReadModel;
  stockMetadata: InvestmentUniverseAsset[];
};

export type StocksReadModelOptions = {
  symbolLimit?: number;
  pageContext?: string;
  preferredSymbols?: string[];
  /** When true, skip live provider fetch and return whatever is in cache/DB. */
  preferCached?: boolean;
};

const STOCKS_CACHE_TTL_MS = 60_000;
const STOCKS_CACHE_ERROR_TTL_MS = 10_000;
const STOCKS_READ_TYPE = 'stocks-read-model-v2';

type StocksCacheEntry = {
  data: StocksReadModel;
  expiresAt: number;
};

const stocksReadCache = new Map<string, StocksCacheEntry>();

const loadDashboardReadModel = unstable_cache(
  async () => getDashboardReadModel(),
  ['stocks-dashboard-read-model-v1'],
  { revalidate: 30 },
);

const loadInvestmentUniverse = unstable_cache(
  async () => getInvestmentUniverse(),
  ['stocks-investment-universe-v1'],
  { revalidate: 300 },
);

function resolveOptions(options: StocksReadModelOptions): Required<StocksReadModelOptions> {
  return {
    symbolLimit:
      typeof options.symbolLimit === 'number' && Number.isFinite(options.symbolLimit) && options.symbolLimit > 0
        ? Math.floor(options.symbolLimit)
        : getMarketQueryInitialLimit(),
    pageContext: options.pageContext?.trim() || 'stocks',
    preferredSymbols: [...new Set((options.preferredSymbols ?? []).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))],
    preferCached: options.preferCached ?? false,
  };
}

function buildStocksCacheKey(provider: string, metadata: InvestmentUniverseAsset[], options: Required<StocksReadModelOptions>) {
  const symbols = metadata.map((item) => item.symbol).sort();
  return [
    `read=${STOCKS_READ_TYPE}`,
    `provider=${provider}`,
    `symbolsHash=${hashSymbols(symbols)}`,
    'assetKind=stock,etf',
    `limit=${options.symbolLimit}`,
    `context=${options.pageContext}`,
    `preferred=${options.preferredSymbols.join(',')}`,
    `symbols=${symbols.join(',')}`,
  ].join('|');
}

function prioritizeStockMetadata(
  metadata: InvestmentUniverseAsset[],
  preferredSymbols: string[],
): InvestmentUniverseAsset[] {
  if (preferredSymbols.length === 0) {
    return metadata;
  }

  const bySymbol = new Map(metadata.map((item) => [item.symbol.toUpperCase(), item]));
  const prioritized = preferredSymbols
    .map((symbol) => bySymbol.get(symbol))
    .filter((item): item is InvestmentUniverseAsset => Boolean(item));
  const remaining = metadata.filter((item) => !preferredSymbols.includes(item.symbol.toUpperCase()));
  return [...prioritized, ...remaining];
}

function getFreshStocksCache(key: string): StocksReadModel | null {
  const entry = stocksReadCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    stocksReadCache.delete(key);
    return null;
  }

  return entry.data;
}

function setStocksCache(key: string, data: StocksReadModel) {
  const ttlMs = data.providerError ? STOCKS_CACHE_ERROR_TTL_MS : STOCKS_CACHE_TTL_MS;
  stocksReadCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getStocksReadModel(options: StocksReadModelOptions = {}): Promise<StocksReadModel> {
  const t0 = perfNow();
  const resolvedOptions = resolveOptions(options);
  const provider = getProviderEnv().MARKET_DATA_PROVIDER;
  const tDb = perfNow();
  const [dashboard, investmentUniverse] = await Promise.all([loadDashboardReadModel(), loadInvestmentUniverse()]);
  perfLog('stocks-query:db-read-models', tDb);
  const allStockMetadata = prioritizeStockMetadata(
    investmentUniverse.filter((item) => item.assetClass === 'stock' || item.assetClass === 'etf'),
    resolvedOptions.preferredSymbols,
  );
  const stockMetadata = allStockMetadata.slice(0, resolvedOptions.symbolLimit);
  const cacheKey = buildStocksCacheKey(provider, stockMetadata, resolvedOptions);
  const cached = getFreshStocksCache(cacheKey);
  if (cached) {
    perfLog(`stocks-query:cache-hit context=${resolvedOptions.pageContext} symbols=${stockMetadata.length}/${allStockMetadata.length}`, t0);
    return cached;
  }

  perfLog(
    `stocks-query:cache-miss context=${resolvedOptions.pageContext} limit=${resolvedOptions.symbolLimit} symbols=${stockMetadata.length}/${allStockMetadata.length}`,
    t0,
  );

  try {
    const t1 = perfNow();
    const observations = await loadQuoteSnapshots(
      stockMetadata.map((item) => item.symbol),
      undefined,
      { preferCached: resolvedOptions.preferCached },
    );
    perfLog(`stocks-query:provider-fetch symbols=${stockMetadata.length}`, t1);

    const result: StocksReadModel = {
      provider: observations[0]?.source ?? 'cache',
      providerError: null,
      observations: observations.flatMap((item) =>
        typeof item.price === 'number'
          ? [{
              symbol: item.symbol,
              assetKind: item.symbol === 'SPY' || item.symbol === 'QQQ' ? 'etf' : 'stock',
              price: item.price,
              timestamp: item.observedAt ?? item.fetchedAt,
              source: item.source as ProviderMarketObservation['source'],
              currency: 'USD',
              ...(typeof item.change === 'number' ? { change: item.change } : {}),
              ...(typeof item.changePercent === 'number' ? { changePercent: item.changePercent } : {}),
            }]
          : [],
      ),
      dashboard,
      stockMetadata,
    };
    setStocksCache(cacheKey, result);
    perfLog('stocks-query:total', t0);
    return result;
  } catch (error) {
    const result: StocksReadModel = {
      provider: 'cache',
      providerError: error instanceof Error ? error.message : 'Unable to fetch stocks snapshot.',
      observations: [],
      dashboard,
      stockMetadata,
    };
    setStocksCache(cacheKey, result);
    perfLog('stocks-query:total-error', t0);
    return result;
  }
}

export const getStocksReadModelCached = cache(
  async (symbolLimit: number | null, pageContext: string, preferredSymbolsKey: string, preferCached = false): Promise<StocksReadModel> =>
    getStocksReadModel({
      ...(typeof symbolLimit === 'number' ? { symbolLimit } : {}),
      pageContext,
      ...(preferredSymbolsKey ? { preferredSymbols: preferredSymbolsKey.split(',') } : {}),
      preferCached,
    }),
);
