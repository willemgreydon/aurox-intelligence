import { fetchMarketSnapshot, getProviderEnv, type MarketDataProvider } from '@repo/providers';
import { fetchNewsStream } from '@repo/providers';
import { getDashboardReadModel, listProviderMonitorConfigs, type DashboardOperationalReadModel } from '@repo/db';
import type { MonitoredProviderConfig } from '@repo/api-contracts';

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
  latencyMs: number | null;
  monitored: boolean;
  enabled: boolean;
  lastSuccessfulCheck: string | null;
  lastError: string | null;
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
  monitorConfig: MonitoredProviderConfig | null,
): Promise<ProviderCheck> {
  const meta = PROVIDER_REGISTRY[provider];
  if (monitorConfig && (!monitorConfig.enabled || !monitorConfig.monitorHealth)) {
    return {
      id: provider,
      name: provider,
      displayName: meta.displayName,
      category: meta.category,
      capabilities: meta.capabilities,
      configured,
      isActiveProvider: provider === activeProvider,
      status: 'attention',
      detail: monitorConfig.enabled ? 'Health monitoring is disabled by admin configuration.' : 'Disabled by admin monitor configuration.',
      lastChecked: null,
      latencyMs: null,
      monitored: Boolean(monitorConfig.displayInDashboard),
      enabled: Boolean(monitorConfig.enabled),
      lastSuccessfulCheck: null,
      lastError: null,
    };
  }

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
      latencyMs: null,
      monitored: Boolean(monitorConfig?.displayInDashboard ?? true),
      enabled: Boolean(monitorConfig?.enabled ?? true),
      lastSuccessfulCheck: null,
      lastError: `Missing API key for ${meta.displayName}.`,
    };
  }

  try {
    const startedAt = new Date().toISOString();
    const result = await fetchMarketSnapshot({
      provider,
      symbols: meta.testSymbols,
    });
    const latencyMs = Date.now() - new Date(startedAt).getTime();

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
      latencyMs,
      monitored: Boolean(monitorConfig?.displayInDashboard ?? true),
      enabled: Boolean(monitorConfig?.enabled ?? true),
      lastSuccessfulCheck: new Date().toISOString(),
      lastError: null,
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
      latencyMs: null,
      monitored: Boolean(monitorConfig?.displayInDashboard ?? true),
      enabled: Boolean(monitorConfig?.enabled ?? true),
      lastSuccessfulCheck: null,
      lastError: error instanceof Error ? error.message : `${meta.displayName} check failed.`,
    };
  }
}

async function runNewsProviderCheck(providerKey: 'finnhub-news' | 'polygon-news', monitorConfig: MonitoredProviderConfig | null): Promise<ProviderCheck> {
  if (monitorConfig && (!monitorConfig.enabled || !monitorConfig.monitorHealth)) {
    return {
      id: providerKey,
      name: providerKey,
      displayName: providerKey === 'finnhub-news' ? 'Finnhub News' : 'Polygon News',
      category: 'secondary-market-data',
      capabilities: ['News'],
      configured: true,
      isActiveProvider: false,
      status: 'attention',
      detail: monitorConfig.enabled ? 'Health monitoring is disabled by admin configuration.' : 'Disabled by admin monitor configuration.',
      lastChecked: null,
      latencyMs: null,
      monitored: Boolean(monitorConfig.displayInDashboard),
      enabled: Boolean(monitorConfig.enabled),
      lastSuccessfulCheck: null,
      lastError: null,
    };
  }
  const t0 = Date.now();
  const result = await fetchNewsStream({
    symbols: ['AAPL'],
    fromIso: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    toIso: new Date().toISOString(),
    timeoutMs: 1500,
    maxItemsPerSymbol: 1,
  });
  const status = result.providerHealth.find((item) => item.provider === (providerKey === 'finnhub-news' ? 'finnhub' : 'polygon'));
  return {
    id: providerKey,
    name: providerKey,
    displayName: providerKey === 'finnhub-news' ? 'Finnhub News' : 'Polygon News',
    category: 'secondary-market-data',
    capabilities: ['News'],
    configured: true,
    isActiveProvider: false,
    status: status?.health === 'healthy' ? 'nominal' : status?.health === 'disabled' ? 'attention' : 'degraded',
    detail: status?.detail ?? 'No status available.',
    lastChecked: new Date().toISOString(),
    latencyMs: Date.now() - t0,
    monitored: Boolean(monitorConfig?.displayInDashboard ?? true),
    enabled: Boolean(monitorConfig?.enabled ?? true),
    lastSuccessfulCheck: status?.health === 'healthy' ? new Date().toISOString() : null,
    lastError: status?.health === 'healthy' ? null : (status?.detail ?? 'No status available.'),
  };
}

export function shouldDisplayProviderCheck(
  check: ProviderCheck,
  configByKey: ReadonlyMap<string, MonitoredProviderConfig>,
) {
  const config = configByKey.get(check.id);
  if (!config) return true;
  return config.enabled && config.displayInDashboard;
}

export async function getAdminReadModel(): Promise<AdminReadModel> {
  const env = getProviderEnv();
  const dashboard = await getDashboardReadModel();
  const activeProvider = env.MARKET_DATA_PROVIDER;
  const monitorConfigs = await listProviderMonitorConfigs();
  const configByKey = new Map(monitorConfigs.map((config) => [config.providerKey, config]));

  const providerChecks = await Promise.all([
    runProviderCheck('polygon', Boolean(env.POLYGON_API_KEY), activeProvider, configByKey.get('polygon') ?? null),
    runProviderCheck('twelve-data', Boolean(env.TWELVE_DATA_API_KEY), activeProvider, configByKey.get('twelve-data') ?? null),
    runProviderCheck('tiingo', Boolean(env.TIINGO_API_KEY), activeProvider, configByKey.get('tiingo') ?? null),
    runProviderCheck('coingecko', Boolean(env.COINGECKO_API_KEY), activeProvider, configByKey.get('coingecko') ?? null),
    runProviderCheck('finnhub', Boolean(env.FINNHUB_API_KEY), activeProvider, configByKey.get('finnhub') ?? null),
    runProviderCheck('eodhd', Boolean(env.EODHD_API_KEY), activeProvider, configByKey.get('eodhd') ?? null),
    runNewsProviderCheck('finnhub-news', configByKey.get('finnhub-news') ?? null),
    runNewsProviderCheck('polygon-news', configByKey.get('polygon-news') ?? null),
  ]);

  const filteredProviderChecks = providerChecks.filter((check) => shouldDisplayProviderCheck(check, configByKey));

  return {
    dashboard,
    activeProvider,
    providerChecks: filteredProviderChecks,
  };
}
