import { getLinkedInvestmentAccounts, listCatalogAssets, type CatalogAsset } from '@repo/db';
import { getSparkasseGeorgeConnectionCapability, type ProviderMarketObservation } from '@repo/providers';
import type { ConnectedInvestmentAccount } from '@repo/api-contracts';
import { loadMiniHistorySeries, loadQuoteSnapshots } from '../services/stock-simulation-service';

export type InvestReadModel = {
  provider: string;
  providerError: string | null;
  assets: CatalogAsset[];
  observations: ProviderMarketObservation[];
  historySeriesBySymbol: Record<string, number[]>;
  linkedAccounts: ConnectedInvestmentAccount[];
  bankConnections: ReturnType<typeof getSparkasseGeorgeConnectionCapability>[];
};

// Module-level TTL cache for shared (non-user-specific) market data.
// Safe: watchlist, auth, and simulation stats are fetched outside this function.
// Error paths use a shorter TTL so the provider is retried soon on degraded state.
const INVEST_CACHE_TTL_MS = 60_000;
const INVEST_CACHE_ERROR_TTL_MS = 10_000;
const MAX_HISTORY_SYMBOLS = 40;

type InvestCacheEntry = { data: InvestReadModel; cachedAt: number; ttlMs: number };
let _cache: InvestCacheEntry | null = null;

function isCacheFresh(): boolean {
  return _cache !== null && Date.now() - _cache.cachedAt < _cache.ttlMs;
}

export async function getInvestReadModel(): Promise<InvestReadModel> {
  if (isCacheFresh()) {
    return _cache!.data;
  }

  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;

  const [assets, linkedAccounts] = await Promise.all([listCatalogAssets(), getLinkedInvestmentAccounts()]);
  const bankConnections = [getSparkasseGeorgeConnectionCapability()];
  const assetIdBySymbol: ReadonlyMap<string, string> = new Map(assets.map((asset) => [asset.symbol, asset.assetId]));

  if (dev) console.debug(`[invest-query] catalog+accounts: ${(performance.now() - t0).toFixed(0)}ms`);

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
    const historySymbols = symbolsWithQuotes.slice(0, MAX_HISTORY_SYMBOLS);
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
      observations: [],
      historySeriesBySymbol: {},
      linkedAccounts,
      bankConnections,
    };
  }

  if (dev) console.debug(`[invest-query] total: ${(performance.now() - t0).toFixed(0)}ms`);

  _cache = { data: result, cachedAt: Date.now(), ttlMs: result.providerError ? INVEST_CACHE_ERROR_TTL_MS : INVEST_CACHE_TTL_MS };
  return result;
}
