import { getProviderEnv, type MarketDataProvider } from '../config';
import { detectCanonicalAssetKind, normalizeMarketSymbol } from './provider-symbols';
import type { MarketAssetKind, MarketReadKind, ProviderCapabilityMatrix, ProviderHealthStatus } from './types';

type ProviderRegistryEntry = {
  provider: MarketDataProvider;
  label: string;
  priority: number;
  supportedKinds: MarketReadKind[];
  capabilities: ProviderCapabilityMatrix;
  isConfigured: () => boolean;
};

type ProviderHealthState = {
  successCount: number;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastLatencyMs: number | null;
};

const providerHealthState = new Map<MarketDataProvider, ProviderHealthState>();

function getHealthState(provider: MarketDataProvider): ProviderHealthState {
  const existing = providerHealthState.get(provider);

  if (existing) {
    return existing;
  }

  const initial: ProviderHealthState = {
    successCount: 0,
    failureCount: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastLatencyMs: null,
  };

  providerHealthState.set(provider, initial);
  return initial;
}

function buildCapabilities(input: Partial<ProviderCapabilityMatrix>): ProviderCapabilityMatrix {
  return {
    quote: false,
    history: false,
    metadata: false,
    cryptoGlobal: false,
    stocks: false,
    etfs: false,
    crypto: false,
    fx: false,
    indexes: false,
    ...input,
  };
}

export const PROVIDER_REGISTRY: Record<MarketDataProvider, ProviderRegistryEntry> = {
  polygon: {
    provider: 'polygon',
    label: 'Polygon',
    priority: 100,
    supportedKinds: ['quote', 'history', 'metadata'],
    capabilities: buildCapabilities({
      quote: true,
      history: true,
      metadata: true,
      stocks: true,
      etfs: true,
      indexes: true,
    }),
    isConfigured: () => Boolean(getProviderEnv().POLYGON_API_KEY),
  },
  'twelve-data': {
    provider: 'twelve-data',
    label: 'Twelve Data',
    priority: 86,
    supportedKinds: ['quote', 'history'],
    capabilities: buildCapabilities({
      quote: true,
      history: true,
      stocks: true,
      etfs: true,
      crypto: true,
      fx: true,
      indexes: true,
    }),
    isConfigured: () => Boolean(getProviderEnv().TWELVE_DATA_API_KEY),
  },
  tiingo: {
    provider: 'tiingo',
    label: 'Tiingo',
    priority: 76,
    supportedKinds: ['metadata'],
    capabilities: buildCapabilities({
      metadata: true,
      stocks: true,
      etfs: true,
    }),
    isConfigured: () => Boolean(getProviderEnv().TIINGO_API_KEY),
  },
  coingecko: {
    provider: 'coingecko',
    label: 'CoinGecko',
    priority: 88,
    supportedKinds: ['quote', 'history', 'metadata', 'crypto-global'],
    capabilities: buildCapabilities({
      quote: true,
      history: true,
      metadata: true,
      cryptoGlobal: true,
      crypto: true,
    }),
    isConfigured: () => Boolean(getProviderEnv().COINGECKO_API_KEY),
  },
  finnhub: {
    provider: 'finnhub',
    label: 'Finnhub',
    priority: 72,
    supportedKinds: ['quote', 'history'],
    capabilities: buildCapabilities({
      quote: true,
      history: true,
      stocks: true,
      etfs: true,
      fx: true,
      crypto: true,
      indexes: true,
    }),
    isConfigured: () => Boolean(getProviderEnv().FINNHUB_API_KEY),
  },
  eodhd: {
    provider: 'eodhd',
    label: 'EODHD',
    priority: 68,
    supportedKinds: ['quote', 'history'],
    capabilities: buildCapabilities({
      quote: true,
      history: true,
      stocks: true,
      etfs: true,
      fx: true,
      crypto: true,
      indexes: true,
    }),
    isConfigured: () => Boolean(getProviderEnv().EODHD_API_KEY),
  },
};

export function isProviderConfigured(provider: MarketDataProvider): boolean {
  return PROVIDER_REGISTRY[provider].isConfigured();
}

export function getConfiguredProviders(): MarketDataProvider[] {
  return (Object.keys(PROVIDER_REGISTRY) as MarketDataProvider[]).filter(isProviderConfigured);
}

export function recordProviderSuccess(provider: MarketDataProvider, latencyMs: number) {
  const state = getHealthState(provider);
  state.successCount += 1;
  state.lastSuccessAt = new Date().toISOString();
  state.lastLatencyMs = Math.max(0, Math.round(latencyMs));
}

export function recordProviderFailure(provider: MarketDataProvider, latencyMs?: number) {
  const state = getHealthState(provider);
  state.failureCount += 1;
  state.lastFailureAt = new Date().toISOString();

  if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) {
    state.lastLatencyMs = Math.max(0, Math.round(latencyMs));
  }
}

function calculateHealthScore(provider: MarketDataProvider): number {
  const registry = PROVIDER_REGISTRY[provider];
  const state = getHealthState(provider);

  if (!registry.isConfigured()) {
    return 0;
  }

  const totalAttempts = state.successCount + state.failureCount;
  const successRatio = totalAttempts === 0 ? 1 : state.successCount / totalAttempts;
  const latencyPenalty = state.lastLatencyMs === null ? 0 : Math.min(25, Math.round(state.lastLatencyMs / 100));

  return Math.max(0, registry.priority + Math.round(successRatio * 25) - latencyPenalty);
}

function supportsAssetKind(provider: MarketDataProvider, assetKind: MarketAssetKind): boolean {
  const capabilities = PROVIDER_REGISTRY[provider].capabilities;

  switch (assetKind) {
    case 'stock':
      return capabilities.stocks;
    case 'etf':
      return capabilities.etfs;
    case 'crypto':
      return capabilities.crypto;
    case 'fx':
      return capabilities.fx;
    case 'index':
      return capabilities.indexes;
    default:
      return false;
  }
}

function supportsReadKind(provider: MarketDataProvider, kind: MarketReadKind): boolean {
  const entry = PROVIDER_REGISTRY[provider];
  return entry.supportedKinds.includes(kind);
}

function getReadPreferenceBoost(
  provider: MarketDataProvider,
  kind: MarketReadKind,
  assetKind: MarketAssetKind,
  normalizedSymbol: string | null,
): number {
  if (kind === 'crypto-global') {
    return provider === 'coingecko' ? 1000 : 0;
  }

  if (kind === 'metadata') {
    if (assetKind === 'crypto') {
      return provider === 'coingecko' ? 180 : provider === 'twelve-data' ? 20 : 0;
    }

    if (assetKind === 'stock' || assetKind === 'etf') {
      if (provider === 'polygon') return 160;
      if (provider === 'tiingo') return 140;
      if (provider === 'twelve-data') return 50;
      return 0;
    }

    if (assetKind === 'index') {
      return provider === 'polygon' ? 120 : provider === 'twelve-data' ? 80 : 0;
    }
  }

  if (kind === 'quote' || kind === 'history') {
    if (assetKind === 'crypto') {
      if (provider === 'coingecko') return 180;
      if (provider === 'twelve-data') return 120;
      if (provider === 'finnhub') return 60;
      if (provider === 'eodhd') return 55;
      return 0;
    }

    if (assetKind === 'etf') {
      if (provider === 'polygon') return 180;
      if (provider === 'twelve-data') return 130;
      if (provider === 'finnhub') return 90;
      if (provider === 'eodhd') return 70;
      return 0;
    }

    if (assetKind === 'stock') {
      if (provider === 'polygon') return 190;
      if (provider === 'twelve-data') return 120;
      if (provider === 'finnhub') return 85;
      if (provider === 'eodhd') return 65;
      return 0;
    }

    if (assetKind === 'fx') {
      if (provider === 'twelve-data') return 160;
      if (provider === 'finnhub') return 110;
      if (provider === 'eodhd') return 90;
      return 0;
    }

    if (assetKind === 'index') {
      if (provider === 'polygon') return 170;
      if (provider === 'twelve-data') return 120;
      if (provider === 'finnhub') return 90;
      return 0;
    }
  }

  if (normalizedSymbol && normalizedSymbol.startsWith('BINANCE:') && provider === 'coingecko') {
    return 30;
  }

  return 0;
}

export function resolveProvidersForRead(
  kind: MarketReadKind,
  assetKind: MarketAssetKind,
  symbol?: string | null,
): MarketDataProvider[] {
  const normalizedSymbol = symbol ? normalizeMarketSymbol(symbol) : null;
  const resolvedAssetKind = normalizedSymbol ? detectCanonicalAssetKind(normalizedSymbol) : assetKind;

  return (Object.keys(PROVIDER_REGISTRY) as MarketDataProvider[])
    .filter((provider) => isProviderConfigured(provider))
    .filter((provider) => supportsReadKind(provider, kind))
    .filter((provider) => supportsAssetKind(provider, resolvedAssetKind))
    .sort((left, right) => {
      const leftScore =
        calculateHealthScore(left) +
        getReadPreferenceBoost(left, kind, resolvedAssetKind, normalizedSymbol);
      const rightScore =
        calculateHealthScore(right) +
        getReadPreferenceBoost(right, kind, resolvedAssetKind, normalizedSymbol);

      return rightScore - leftScore;
    });
}

export function getProviderHealthStatuses(): ProviderHealthStatus[] {
  return (Object.keys(PROVIDER_REGISTRY) as MarketDataProvider[])
    .map((provider) => {
      const entry = PROVIDER_REGISTRY[provider];
      const state = getHealthState(provider);
      const totalAttempts = state.successCount + state.failureCount;
      const errorRate = totalAttempts === 0 ? 0 : state.failureCount / totalAttempts;

      return {
        provider,
        configured: entry.isConfigured(),
        supportedKinds: entry.supportedKinds,
        priority: entry.priority,
        healthScore: calculateHealthScore(provider),
        successCount: state.successCount,
        failureCount: state.failureCount,
        errorRate,
        lastSuccessAt: state.lastSuccessAt,
        lastFailureAt: state.lastFailureAt,
        lastLatencyMs: state.lastLatencyMs,
        capabilityMatrix: entry.capabilities,
      };
    })
    .sort((left, right) => right.healthScore - left.healthScore);
}