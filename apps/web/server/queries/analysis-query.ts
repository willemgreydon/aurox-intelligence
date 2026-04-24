import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';
import { fetchMarketHistory, fetchMarketSnapshot, getMarketSymbols, getProviderEnv } from '@repo/providers';

export type AssetAnalysisReadModel = {
  assetId: string;
  symbol: string;
  assetClass: 'stock';
  observation: Awaited<ReturnType<typeof fetchMarketSnapshot>>[number] | null;
  history: Awaited<ReturnType<typeof fetchMarketHistory>>;
};

export type AnalysisReadModel = {
  provider: string;
  providerError: string | null;
  dashboard: DashboardOperationalReadModel;
  assets: AssetAnalysisReadModel[];
};

const ANALYSIS_CACHE_TTL_MS = 60_000;
const ANALYSIS_CACHE_ERROR_TTL_MS = 10_000;
const ANALYSIS_READ_TYPE = 'dashboard-market-analysis-v1';

type AnalysisCacheEntry = { data: AnalysisReadModel; cachedAt: number; expiresAt: number };
const analysisCache = new Map<string, AnalysisCacheEntry>();

function toNormalizedSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function toAssetId(symbol: string) {
  return symbol.replace('.US', '');
}

function buildAnalysisCacheKey(provider: string, symbols: string[]) {
  const normalizedSymbols = [...new Set(symbols.map(toNormalizedSymbol).filter(Boolean))].sort();
  return `read=${ANALYSIS_READ_TYPE}|provider=${provider}|symbols=${normalizedSymbols.join(',')}`;
}

function getFreshCacheEntry(key: string): AnalysisCacheEntry | null {
  const entry = analysisCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    analysisCache.delete(key);
    return null;
  }

  return entry;
}

function cacheAnalysisResult(key: string, data: AnalysisReadModel) {
  const ttlMs = data.providerError ? ANALYSIS_CACHE_ERROR_TTL_MS : ANALYSIS_CACHE_TTL_MS;
  analysisCache.set(key, {
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getAnalysisReadModel(): Promise<AnalysisReadModel> {
  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;

  const env = getProviderEnv();
  const symbols = getMarketSymbols(env.MARKET_DATA_PROVIDER);
  const cacheKey = buildAnalysisCacheKey(env.MARKET_DATA_PROVIDER, symbols);
  const cachedEntry = getFreshCacheEntry(cacheKey);

  if (cachedEntry) {
    if (dev) {
      console.debug(`[analysis-query] cache hit (${symbols.length} symbols): ${(performance.now() - t0).toFixed(0)}ms`);
    }
    return cachedEntry.data;
  }

  if (dev) {
    console.debug(`[analysis-query] cache miss (${symbols.length} symbols)`);
  }

  const dashboard = await getDashboardReadModel();

  if (dev) {
    console.debug(`[analysis-query] dashboard+symbols (${symbols.length}): ${(performance.now() - t0).toFixed(0)}ms`);
  }

  const t1 = dev ? performance.now() : 0;
  const assets = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const [snapshotResult, history] = await Promise.all([
          fetchMarketSnapshot({
            provider: env.MARKET_DATA_PROVIDER,
            symbols: [symbol],
          }),
          fetchMarketHistory({
            provider: env.MARKET_DATA_PROVIDER,
            symbol,
          }),
        ]);
        const [observation] = snapshotResult;

        return {
          assetId: toAssetId(symbol),
          symbol: toAssetId(symbol),
          assetClass: 'stock' as const,
          observation: observation ?? null,
          history,
          error: null as string | null,
        };
      } catch (error) {
        return {
          assetId: toAssetId(symbol),
          symbol: toAssetId(symbol),
          assetClass: 'stock' as const,
          observation: null,
          history: [],
          error: error instanceof Error ? error.message : `Unable to fetch analysis data for ${symbol}.`,
        };
      }
    }),
  );

  if (dev) {
    console.debug(`[analysis-query] provider fetch (${symbols.length} symbols): ${(performance.now() - t1).toFixed(0)}ms`);
    console.debug(`[analysis-query] total: ${(performance.now() - t0).toFixed(0)}ms`);
  }

  const result: AnalysisReadModel = {
    provider: env.MARKET_DATA_PROVIDER,
    providerError: assets.find((asset) => asset.error)?.error ?? null,
    dashboard,
    assets: assets.map(({ error: _error, ...asset }) => asset),
  };

  cacheAnalysisResult(cacheKey, result);

  if (dev) {
    const entry = analysisCache.get(cacheKey);
    if (entry) {
      const ttlMsRemaining = Math.max(0, entry.expiresAt - Date.now());
      console.debug(`[analysis-query] cache store ttl=${ttlMsRemaining}ms error=${String(Boolean(result.providerError))}`);
    }
  }

  return result;
}
