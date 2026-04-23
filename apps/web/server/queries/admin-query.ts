import { fetchMarketSnapshot, getProviderEnv, type MarketDataProvider } from '@repo/providers';
import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';

export type ProviderCheck = {
  id: string;
  name: string;
  displayName: string;
  category: 'primary-market-data' | 'secondary-market-data' | 'crypto' | 'metadata' | 'legacy';
  capabilities: string[];
  configured: boolean;
  isActiveProvider: boolean;
  status: 'nominal' | 'attention' | 'degraded';
  detail: string;
  lastChecked: string | null;
};

export type AdminReadModel = {
  dashboard: DashboardOperationalReadModel;
  activeProvider: MarketDataProvider;
  providerChecks: ProviderCheck[];
};

type ProviderMeta = {
  displayName: string;
  category: ProviderCheck['category'];
  capabilities: string[];
  testSymbols: string[];
};

const PROVIDER_REGISTRY: Record<MarketDataProvider, ProviderMeta> = {
  polygon: {
    displayName: 'Polygon.io',
    category: 'primary-market-data',
    capabilities: ['Stocks', 'ETFs', 'Forex', 'Crypto', 'Options', 'Historical bars', 'Real-time quotes'],
    testSymbols: ['AAPL'],
  },
  'twelve-data': {
    displayName: 'Twelve Data',
    category: 'secondary-market-data',
    capabilities: ['Stocks', 'ETFs', 'Forex', 'Crypto', 'Historical bars', 'Technical indicators'],
    testSymbols: ['AAPL'],
  },
  tiingo: {
    displayName: 'Tiingo',
    category: 'metadata',
    capabilities: ['Stocks', 'ETFs', 'EOD prices', 'Fundamentals metadata', 'News feed'],
    testSymbols: ['AAPL'],
  },
  coingecko: {
    displayName: 'CoinGecko',
    category: 'crypto',
    capabilities: ['Crypto quotes', 'Market cap', 'Volume', 'Global crypto metrics', '24/7 coverage'],
    testSymbols: ['BINANCE:BTCUSDT'],
  },
  finnhub: {
    displayName: 'Finnhub',
    category: 'legacy',
    capabilities: ['Stocks', 'ETFs', 'Forex', 'Crypto', 'Real-time quotes', 'Company fundamentals'],
    testSymbols: ['AAPL'],
  },
  eodhd: {
    displayName: 'EODHD',
    category: 'legacy',
    capabilities: ['Stocks', 'ETFs', 'Forex', 'End-of-day data', 'Fundamentals', 'Global exchanges'],
    testSymbols: ['AAPL.US'],
  },
};

async function runProviderCheck(
  provider: MarketDataProvider,
  configured: boolean,
  activeProvider: MarketDataProvider,
): Promise<ProviderCheck> {
  const meta = PROVIDER_REGISTRY[provider];

  if (!configured) {
    return {
      id: provider,
      name: provider,
      displayName: meta.displayName,
      category: meta.category,
      capabilities: meta.capabilities,
      configured: false,
      isActiveProvider: provider === activeProvider,
      status: provider === activeProvider ? 'degraded' : 'attention',
      detail: `No API key is configured for ${meta.displayName}. Set the corresponding environment variable.`,
      lastChecked: null,
    };
  }

  try {
    const result = await fetchMarketSnapshot({
      provider,
      symbols: meta.testSymbols,
    });

    return {
      id: provider,
      name: provider,
      displayName: meta.displayName,
      category: meta.category,
      capabilities: meta.capabilities,
      configured: true,
      isActiveProvider: provider === activeProvider,
      status: result.length > 0 ? 'nominal' : 'attention',
      detail: result.length > 0
        ? `Connectivity confirmed. Returned ${result.length} observation(s) for test symbol.`
        : `${meta.displayName} responded but returned no observations for the test symbol.`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: provider,
      name: provider,
      displayName: meta.displayName,
      category: meta.category,
      capabilities: meta.capabilities,
      configured: true,
      isActiveProvider: provider === activeProvider,
      status: 'degraded',
      detail: error instanceof Error ? error.message : `${meta.displayName} check failed.`,
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function getAdminReadModel(): Promise<AdminReadModel> {
  const env = getProviderEnv();
  const dashboard = await getDashboardReadModel();
  const activeProvider = env.MARKET_DATA_PROVIDER;

  const providerChecks = await Promise.all([
    runProviderCheck('polygon', Boolean(env.POLYGON_API_KEY), activeProvider),
    runProviderCheck('twelve-data', Boolean(env.TWELVE_DATA_API_KEY), activeProvider),
    runProviderCheck('tiingo', Boolean(env.TIINGO_API_KEY), activeProvider),
    runProviderCheck('coingecko', Boolean(env.COINGECKO_API_KEY), activeProvider),
    runProviderCheck('finnhub', Boolean(env.FINNHUB_API_KEY), activeProvider),
    runProviderCheck('eodhd', Boolean(env.EODHD_API_KEY), activeProvider),
  ]);

  return {
    dashboard,
    activeProvider,
    providerChecks,
  };
}
