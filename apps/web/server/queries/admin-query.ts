import {
  fetchMarketSnapshot,
  getProviderEnv,
  getProviderHealthStatus,
  type MarketDataProvider,
  type ProviderHealthStatus,
} from '@repo/providers';
import { fetchNewsStream } from '@repo/providers';
import { getDashboardReadModel, listProviderMonitorConfigs, type DashboardOperationalReadModel } from '@repo/db';
import type { MonitoredProviderConfig } from '@repo/api-contracts';
import { normalizeProviderErrorMessage } from '../lib/provider-error-normalizer';

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

export type ProviderCapabilityRow = {
  provider: string;
  displayName: string;
  configured: boolean;
  requiresApiKey: boolean;
  authMode: 'none' | 'api-key' | 'hmac';
  quoteMode: 'live' | 'delayed' | 'cached' | 'none';
  assetClasses: string[];
  resolutions: Array<'1m' | '5m' | '15m' | '30m' | '60m' | '1d'>;
  supportsWebSocket: boolean;
  supportsRest: boolean;
  streamStatus: 'connected' | 'degraded' | 'disconnected' | 'n/a';
  lastMessageAt: string | null;
  subscribedSymbols: string[];
  activeChannels: string[];
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  degradedReason: string | null;
  fallbackProvider: string | null;
  rateLimitState: 'nominal' | 'warning';
};

const ALL_RESOLUTIONS: Array<'1m' | '5m' | '15m' | '30m' | '60m' | '1d'> = ['1m', '5m', '15m', '30m', '60m', '1d'];

type CapabilityDescriptor = {
  displayName: string;
  authMode: 'none' | 'api-key' | 'hmac';
  supportsWebSocket: boolean;
  supportsRest: boolean;
  assetClasses: string[];
  resolutions: Array<'1m' | '5m' | '15m' | '30m' | '60m' | '1d'>;
  quoteMode: 'live' | 'delayed' | 'cached' | 'none';
};

const CAPABILITY_DESCRIPTORS: Record<string, CapabilityDescriptor> = {
  polygon: { displayName: 'Polygon', authMode: 'api-key', supportsWebSocket: true, supportsRest: true, assetClasses: ['stock', 'etf', 'index'], resolutions: ALL_RESOLUTIONS, quoteMode: 'delayed' },
  'twelve-data': { displayName: 'Twelve Data', authMode: 'api-key', supportsWebSocket: true, supportsRest: true, assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'], resolutions: ALL_RESOLUTIONS, quoteMode: 'delayed' },
  tiingo: { displayName: 'Tiingo', authMode: 'api-key', supportsWebSocket: false, supportsRest: true, assetClasses: ['stock', 'etf'], resolutions: ['1d'], quoteMode: 'cached' },
  coingecko: { displayName: 'CoinGecko', authMode: 'api-key', supportsWebSocket: false, supportsRest: true, assetClasses: ['crypto'], resolutions: ['1d'], quoteMode: 'cached' },
  finnhub: { displayName: 'Finnhub', authMode: 'api-key', supportsWebSocket: true, supportsRest: true, assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'], resolutions: ALL_RESOLUTIONS, quoteMode: 'live' },
  eodhd: { displayName: 'EODHD', authMode: 'api-key', supportsWebSocket: false, supportsRest: true, assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'], resolutions: ['1d'], quoteMode: 'delayed' },
  binance: { displayName: 'Binance', authMode: 'hmac', supportsWebSocket: true, supportsRest: true, assetClasses: ['crypto'], resolutions: ALL_RESOLUTIONS, quoteMode: 'live' },
  bybit: { displayName: 'Bybit (Public)', authMode: 'none', supportsWebSocket: true, supportsRest: true, assetClasses: ['crypto'], resolutions: ALL_RESOLUTIONS, quoteMode: 'live' },
  okx: { displayName: 'OKX (Public)', authMode: 'none', supportsWebSocket: true, supportsRest: true, assetClasses: ['crypto'], resolutions: ALL_RESOLUTIONS, quoteMode: 'live' },
  coinbase: { displayName: 'Coinbase (Public)', authMode: 'none', supportsWebSocket: true, supportsRest: true, assetClasses: ['crypto'], resolutions: ALL_RESOLUTIONS, quoteMode: 'live' },
  'local-cache': { displayName: 'Local Cache', authMode: 'none', supportsWebSocket: false, supportsRest: false, assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'], resolutions: ['1d'], quoteMode: 'cached' },
};

function toCapabilityRow(status: ProviderHealthStatus): ProviderCapabilityRow {
  const descriptor = CAPABILITY_DESCRIPTORS[status.provider];
  const caps = status.capabilityMatrix;
  const assetClasses: string[] = [];
  if (caps.stocks) assetClasses.push('stock');
  if (caps.etfs) assetClasses.push('etf');
  if (caps.crypto) assetClasses.push('crypto');
  if (caps.fx) assetClasses.push('fx');
  if (caps.indexes) assetClasses.push('index');
  const resolutionSet = new Set<'1m' | '5m' | '15m' | '30m' | '60m' | '1d'>();
  const byAsset = caps.historyResolutionsByAsset ?? {};
  for (const values of Object.values(byAsset)) {
    for (const resolution of values ?? []) {
      resolutionSet.add(resolution);
    }
  }
  if (caps.history && resolutionSet.size === 0) {
    resolutionSet.add('1d');
  }
  return {
    provider: status.provider,
    displayName: descriptor?.displayName ?? status.provider,
    configured: status.configured,
    requiresApiKey: status.provider !== 'binance',
    authMode: descriptor?.authMode ?? 'api-key',
    quoteMode: caps.quoteMode ?? 'none',
    assetClasses,
    resolutions: ALL_RESOLUTIONS.filter((r) => resolutionSet.has(r)),
    supportsWebSocket: descriptor?.supportsWebSocket ?? false,
    supportsRest: descriptor?.supportsRest ?? true,
    streamStatus: 'n/a',
    lastMessageAt: null,
    subscribedSymbols: [],
    activeChannels: [],
    lastSuccessAt: status.lastSuccessAt,
    lastFailureAt: status.lastFailureAt,
    lastError: status.lastFailureAt && (!status.lastSuccessAt || status.lastFailureAt > status.lastSuccessAt)
      ? 'Most recent request failed.'
      : null,
    degradedReason: null,
    fallbackProvider: null,
    rateLimitState: status.errorRate > 0.3 ? 'warning' : 'nominal',
  };
}

export function getProviderCapabilityRows(): ProviderCapabilityRow[] {
  const healthRows = getProviderHealthStatus().map(toCapabilityRow);
  const byId = new Map(healthRows.map((row) => [row.provider, row] as const));
  const rows = Object.entries(CAPABILITY_DESCRIPTORS).map(([providerId, descriptor]) => {
    const existing = byId.get(providerId);
    if (existing) return existing;
    return {
      provider: providerId,
      displayName: descriptor.displayName,
      configured: descriptor.authMode === 'none',
      requiresApiKey: descriptor.authMode !== 'none',
      authMode: descriptor.authMode,
      quoteMode: descriptor.quoteMode,
      assetClasses: descriptor.assetClasses,
      resolutions: descriptor.resolutions,
      supportsWebSocket: descriptor.supportsWebSocket,
      supportsRest: descriptor.supportsRest,
      streamStatus: 'n/a',
      lastMessageAt: null,
      subscribedSymbols: [],
      activeChannels: [],
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      degradedReason: null,
      fallbackProvider: null,
      rateLimitState: 'nominal',
    } satisfies ProviderCapabilityRow;
  });
  return rows;
}

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
  binance: {
    displayName: 'Binance',
    category: 'crypto',
    capabilities: ['Crypto quotes', '1m/5m/15m/30m/1h/1d klines', 'Public market data'],
    testSymbols: ['BINANCE:BTCUSDT'],
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
    const safeError = normalizeProviderErrorMessage(error);
    return {
      id: provider,
      name: provider,
      displayName: meta.displayName,
      category: meta.category,
      capabilities: meta.capabilities,
      configured: true,
      isActiveProvider: provider === activeProvider,
      status: 'degraded',
      detail: safeError,
      lastChecked: new Date().toISOString(),
      latencyMs: null,
      monitored: Boolean(monitorConfig?.displayInDashboard ?? true),
      enabled: Boolean(monitorConfig?.enabled ?? true),
      lastSuccessfulCheck: null,
      lastError: safeError,
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
    runProviderCheck('binance', true, activeProvider, configByKey.get('binance') ?? null),
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
