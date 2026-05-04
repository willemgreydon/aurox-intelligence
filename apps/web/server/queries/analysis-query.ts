import { getDashboardReadModel, getMarketHistoryBarsBySymbols, type DashboardOperationalReadModel } from '@repo/db';
import { getMarketSymbols, getProviderEnv, type ProviderMarketObservation } from '@repo/providers';
import { cache } from 'react';
import { hashSymbols } from '../lib/cache-key';
import { perfLog, perfNow } from '../lib/perf';
import { loadQuoteSnapshotsRequestScoped } from '../services/stock-simulation-service';
import type { PersistedMarketHistoryBar } from '@repo/db';
import { withDbReadFallback } from '../lib/db-runtime';

export type AssetAnalysisReadModel = {
  assetId: string;
  symbol: string;
  assetClass: 'stock';
  observation: ProviderMarketObservation | null;
  history: Array<{
    symbol: string;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number | null;
    source?: string;
  }>;
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
const ANALYSIS_SYMBOL_LIMIT = 48;
const ANALYSIS_HISTORY_LIMIT = 90;
const ANALYSIS_PRIORITY_SYMBOLS = ['SPY', 'QQQ', 'VTI', 'IWM', 'TLT', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'];

type AnalysisCacheEntry = { data: AnalysisReadModel; cachedAt: number; expiresAt: number };
const analysisCache = new Map<string, AnalysisCacheEntry>();

function toNormalizedSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function toAssetId(symbol: string) {
  return symbol.replace('.US', '');
}

function buildAnalysisCacheKey(provider: string, symbols: string[]) {
  const normalizedSymbols = [...new Set(symbols.map(toNormalizedSymbol).filter(Boolean))];
  return `read=${ANALYSIS_READ_TYPE}|provider=${provider}|assetKind=stock,etf,crypto,index|historyRange=1d|historyLimit=${ANALYSIS_HISTORY_LIMIT}|symbolLimit=${ANALYSIS_SYMBOL_LIMIT}|symbolHash=${hashSymbols(normalizedSymbols)}|count=${normalizedSymbols.length}`;
}

function prioritizeSymbols(symbols: string[]) {
  const normalized = [...new Set(symbols.map(toNormalizedSymbol).filter(Boolean))];
  const bySymbol = new Set(normalized);
  const prioritized = ANALYSIS_PRIORITY_SYMBOLS.filter((symbol) => bySymbol.has(symbol));
  const prioritizedSet = new Set(prioritized);
  const remaining = normalized.filter((symbol) => !prioritizedSet.has(symbol));
  return [...prioritized, ...remaining].slice(0, ANALYSIS_SYMBOL_LIMIT);
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
  const t0 = perfNow();

  const env = getProviderEnv();
  const symbols = prioritizeSymbols(getMarketSymbols(env.MARKET_DATA_PROVIDER));
  const cacheKey = buildAnalysisCacheKey(env.MARKET_DATA_PROVIDER, symbols);
  const cachedEntry = getFreshCacheEntry(cacheKey);

  if (cachedEntry) {
    perfLog(`analysis-query:cache-hit symbols=${symbols.length}`, t0);
    return cachedEntry.data;
  }

  perfLog(`analysis-query:cache-miss symbols=${symbols.length}`, t0);

  const tDb = perfNow();
  const dashboard = (await withDbReadFallback('analysis-query:getDashboardReadModel', {
    dataSource: { configured: false, mode: 'stub' as const },
    assetCount: 0,
    latestObservationAt: null,
    latestForecastAt: null,
    latestIngestionCompletedAt: null,
    latestSuccessfulSyncAt: null,
    forecasts: [],
    ingestionRuns: [],
    providerSyncs: [],
  }, () => getDashboardReadModel())).value;
  perfLog('analysis-query:dashboard-fetch', tDb);

  const symbolsKey = symbols.join(',');
  const tProvider = perfNow();
  const [snapshots, historyBySymbol] = await Promise.all([
    loadQuoteSnapshotsRequestScoped(symbolsKey),
    getMarketHistoryBarsBySymbols(symbols, ANALYSIS_HISTORY_LIMIT).catch(
      () => ({} as Record<string, PersistedMarketHistoryBar[]>),
    ),
  ]);
  perfLog(`analysis-query:provider-fetch symbols=${symbols.length}`, tProvider);

  const observationBySymbol = new Map(
    snapshots.flatMap((snapshot) => {
      if (typeof snapshot.price !== 'number') {
        return [];
      }

      const observation: ProviderMarketObservation = {
        symbol: snapshot.symbol,
        assetKind: 'stock',
        price: snapshot.price,
        timestamp: snapshot.observedAt ?? snapshot.fetchedAt,
        source: snapshot.source as ProviderMarketObservation['source'],
        currency: 'USD',
        ...(typeof snapshot.change === 'number' ? { change: snapshot.change } : {}),
        ...(typeof snapshot.changePercent === 'number' ? { changePercent: snapshot.changePercent } : {}),
      };
      return [[snapshot.symbol, observation] as const];
    }),
  );

  let providerError: string | null = null;
  if (snapshots.length === 0) {
    providerError = 'Live analysis snapshots are currently unavailable.';
  }

  const result: AnalysisReadModel = {
    provider: env.MARKET_DATA_PROVIDER,
    providerError,
    dashboard,
    assets: symbols.map((symbol) => ({
      assetId: toAssetId(symbol),
      symbol: toAssetId(symbol),
      assetClass: 'stock',
      observation: observationBySymbol.get(symbol) ?? null,
      history: (historyBySymbol[symbol] ?? []).map((bar) => ({
        symbol: bar.symbol,
        timestamp: bar.timestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? null,
        source: bar.source,
      })),
    })),
  };

  cacheAnalysisResult(cacheKey, result);
  perfLog('analysis-query:total', t0);

  return result;
}

export const getAnalysisReadModelCached = cache(async () => getAnalysisReadModel());
