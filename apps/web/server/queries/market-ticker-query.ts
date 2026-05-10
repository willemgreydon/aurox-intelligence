import {
  type ProviderMarketObservation,
} from '@repo/providers';
import { unstable_cache } from 'next/cache';
import { perfLog, perfNow } from '../lib/perf';
import { loadQuoteSnapshots } from '../services/stock-simulation-service';

const tickerUniverse = [
  { symbol: 'SPY', label: 'S&P 500', assetClass: 'index' as const },
  { symbol: 'QQQ', label: 'Nasdaq 100', assetClass: 'etf' as const },
  { symbol: 'AAPL', label: 'Apple', assetClass: 'stock' as const },
  { symbol: 'MSFT', label: 'Microsoft', assetClass: 'stock' as const },
  { symbol: 'NVDA', label: 'NVIDIA', assetClass: 'stock' as const },
  { symbol: 'BINANCE:BTCUSDT', label: 'Bitcoin', assetClass: 'crypto' as const },
  { symbol: 'BINANCE:ETHUSDT', label: 'Ethereum', assetClass: 'crypto' as const },
] as const;

export type MarketTickerReadModel = {
  provider: string;
  providerError: string | null;
  observations: ProviderMarketObservation[];
  universe: typeof tickerUniverse;
  fallbackProvider: string | null;
  sourceSummary: string;
};

const loadTickerQuotes = unstable_cache(
  async () => loadQuoteSnapshots(tickerUniverse.map((item) => item.symbol), undefined, { preferCached: true, maxSymbols: 12 }),
  ['market-ticker-quotes-v1'],
  { revalidate: 20 },
);

export async function getMarketTickerReadModel(): Promise<MarketTickerReadModel> {
  const t0 = perfNow();

  try {
    const quotes = await loadTickerQuotes();
    const observations: ProviderMarketObservation[] = quotes.flatMap((item) =>
      typeof item.price === 'number'
        ? [{
            symbol: item.symbol,
            assetKind: tickerUniverse.find((entry) => entry.symbol === item.symbol)?.assetClass ?? 'stock',
            price: item.price,
            timestamp: item.observedAt ?? item.fetchedAt,
            source: item.source as ProviderMarketObservation['source'],
            currency: 'USD',
            ...(typeof item.change === 'number' ? { change: item.change } : {}),
            ...(typeof item.changePercent === 'number' ? { changePercent: item.changePercent } : {}),
          }]
        : [],
    );
    const provider = observations[0]?.source ?? 'cache';

    return {
      provider,
      providerError: null,
      observations,
      universe: tickerUniverse,
      fallbackProvider: null,
      sourceSummary:
        observations.length > 0
          ? `Market pulse served from cached provider observations refreshed by ${provider.toUpperCase()}.`
          : 'Ticker observations are not yet available from cache or live refresh.',
    };
  } catch (error) {
    return {
      provider: 'cache',
      providerError: error instanceof Error ? error.message : 'Ticker snapshot is currently unavailable.',
      observations: [],
      universe: tickerUniverse,
      fallbackProvider: null,
      sourceSummary: 'Ticker snapshot is currently unavailable from cache and live provider refresh.',
    };
  } finally {
    perfLog('market-ticker-query:total', t0);
  }
}
