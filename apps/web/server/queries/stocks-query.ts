import type { ProviderMarketObservation } from '@repo/providers';
import { getProviderEnv } from '@repo/providers';
import { getDashboardReadModel, getInvestmentUniverse, type DashboardOperationalReadModel, type InvestmentUniverseAsset } from '@repo/db';
import { unstable_cache } from 'next/cache';
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
        : 64,
    pageContext: options.pageContext?.trim() || 'stocks',
  };
}

function buildStocksCacheKey(provider: string, metadata: InvestmentUniverseAsset[], options: Required<StocksReadModelOptions>) {
  const symbols = metadata.map((item) => item.symbol).sort();
  return [
    `read=${STOCKS_READ_TYPE}`,
    `provider=${provider}`,
    'assetKind=stock,etf',
    `limit=${options.symbolLimit}`,
    `context=${options.pageContext}`,
    `symbols=${symbols.join(',')}`,
  ].join('|');
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
  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;
  const resolvedOptions = resolveOptions(options);
  const provider = getProviderEnv().MARKET_DATA_PROVIDER;
  const [dashboard, investmentUniverse] = await Promise.all([loadDashboardReadModel(), loadInvestmentUniverse()]);
  const allStockMetadata = investmentUniverse.filter((item) => item.assetClass === 'stock' || item.assetClass === 'etf');
  const stockMetadata = allStockMetadata.slice(0, resolvedOptions.symbolLimit);
  const cacheKey = buildStocksCacheKey(provider, stockMetadata, resolvedOptions);
  const cached = getFreshStocksCache(cacheKey);
  if (cached) {
    if (dev) {
      console.debug(`[stocks-query] cache hit (${stockMetadata.length}/${allStockMetadata.length}): ${(performance.now() - t0).toFixed(0)}ms`);
    }
    return cached;
  }

  if (dev) {
    console.debug(
      `[stocks-query] cache miss context=${resolvedOptions.pageContext} limit=${resolvedOptions.symbolLimit} symbols=${stockMetadata.length}/${allStockMetadata.length}`,
    );
    console.debug(
      `[stocks-query] dashboard+universe (${stockMetadata.length}/${allStockMetadata.length}): ${(performance.now() - t0).toFixed(0)}ms`,
    );
  }

  try {
    const t1 = dev ? performance.now() : 0;
    const observations = await loadQuoteSnapshots(stockMetadata.map((item) => item.symbol));
    if (dev) {
      console.debug(`[stocks-query] quote-snapshots (${stockMetadata.length}): ${(performance.now() - t1).toFixed(0)}ms`);
      console.debug(`[stocks-query] total: ${(performance.now() - t0).toFixed(0)}ms`);
    }

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
    return result;
  }
}
