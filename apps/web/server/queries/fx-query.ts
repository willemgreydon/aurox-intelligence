import { fetchMarketSnapshot, getProviderEnv, type MarketDataProvider, type ProviderMarketObservation } from '@repo/providers';
import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';

const fxSymbolsByProvider: Record<MarketDataProvider, string[]> = {
  polygon: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  'twelve-data': ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  tiingo: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  coingecko: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  finnhub: ['OANDA:EUR_USD', 'OANDA:GBP_USD', 'OANDA:USD_JPY', 'OANDA:AUD_USD'],
  eodhd: ['EURUSD.FOREX', 'GBPUSD.FOREX', 'USDJPY.FOREX', 'AUDUSD.FOREX'],
};

function resolveFxProvider(): MarketDataProvider {
  const env = getProviderEnv();

  if (env.EODHD_API_KEY) {
    return 'eodhd';
  }

  if (env.TWELVE_DATA_API_KEY) {
    return 'twelve-data';
  }

  return env.MARKET_DATA_PROVIDER;
}

export type FxReadModel = {
  provider: MarketDataProvider;
  providerError: string | null;
  pairs: ProviderMarketObservation[];
  dashboard: DashboardOperationalReadModel;
};

export async function getFxReadModel(): Promise<FxReadModel> {
  const provider = resolveFxProvider();
  const dashboard = await getDashboardReadModel();

  try {
    const pairs = await fetchMarketSnapshot({
      provider,
      symbols: fxSymbolsByProvider[provider],
    });

    return {
      provider,
      providerError: null,
      pairs,
      dashboard,
    };
  } catch (error) {
    return {
      provider,
      providerError: error instanceof Error ? error.message : 'Unable to fetch FX snapshot.',
      pairs: [],
      dashboard,
    };
  }
}
