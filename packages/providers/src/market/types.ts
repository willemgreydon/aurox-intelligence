import type { MarketDataProvider } from '../config';

export type MarketAssetKind = 'stock' | 'etf' | 'crypto' | 'fx' | 'index';
export type MarketReadKind = 'quote' | 'history' | 'metadata' | 'crypto-global';

export type ProviderErrorCode =
  | 'missing_config'
  | 'unauthorized'
  | 'rate_limited'
  | 'malformed_response'
  | 'unavailable'
  | 'unsupported_symbol'
  | 'not_found'
  | 'unknown';

export interface ProviderError {
  provider: MarketDataProvider;
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  status?: number | undefined;
}

export interface ProviderSelectionResult {
  kind: MarketReadKind;
  symbol: string | null;
  attemptedProviders: MarketDataProvider[];
  selectedProvider: MarketDataProvider | null;
  fallbackUsed: boolean;
  staleCacheEligible: boolean;
  errors: ProviderError[];
}

export interface CachedMarketRead<T> {
  data: T;
  cacheState: 'fresh' | 'stale';
  asOf: string | null;
  source: string | null;
}

export interface MarketQuote {
  symbol: string;
  assetKind: MarketAssetKind;
  price: number;
  timestamp: string;
  source: MarketDataProvider;
  currency: 'USD';
  change?: number | undefined;
  changePercent?: number | undefined;
  previousClose?: number | undefined;
}

export interface HistoricalBar {
  symbol: string;
  assetKind: MarketAssetKind;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  source: MarketDataProvider;
  volume?: number | undefined;
}

export interface AssetMetadata {
  symbol: string;
  assetKind: Exclude<MarketAssetKind, 'fx' | 'index'>;
  name: string;
  exchange?: string | null | undefined;
  currency?: string | null | undefined;
  description?: string | null | undefined;
  sector?: string | null | undefined;
  industry?: string | null | undefined;
  country?: string | null | undefined;
  website?: string | null | undefined;
  logoUrl?: string | null | undefined;
  marketCap?: number | null | undefined;
  source: MarketDataProvider;
  updatedAt: string;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  assetKind: MarketAssetKind;
  exchange?: string | null | undefined;
  currency?: string | null | undefined;
  source: MarketDataProvider;
}

export interface CryptoGlobalMetrics {
  activeCryptocurrencies: number | null;
  markets: number | null;
  totalMarketCapUsd: number | null;
  totalVolume24hUsd: number | null;
  bitcoinDominancePercent: number | null;
  ethereumDominancePercent: number | null;
  marketCapChange24hPercent: number | null;
  source: MarketDataProvider;
  observedAt: string;
}

export interface ProviderCapabilityMatrix {
  quote: boolean;
  history: boolean;
  metadata: boolean;
  cryptoGlobal: boolean;
  stocks: boolean;
  etfs: boolean;
  crypto: boolean;
  fx: boolean;
  indexes: boolean;
}

export interface ProviderHealthStatus {
  provider: MarketDataProvider;
  configured: boolean;
  supportedKinds: MarketReadKind[];
  priority: number;
  healthScore: number;
  successCount: number;
  failureCount: number;
  errorRate: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastLatencyMs: number | null;
  capabilityMatrix: ProviderCapabilityMatrix;
}

export interface ProviderReadResult<T> {
  data: T;
  selection: ProviderSelectionResult;
}

export interface FetchMarketSnapshotOptions {
  provider?: MarketDataProvider;
  symbols?: string[];
}

export interface FetchMarketHistoryOptions {
  provider?: MarketDataProvider;
  symbol: string;
  from?: string;
  to?: string;
  resolution?: 'D';
}

export interface FetchAssetMetadataOptions {
  provider?: MarketDataProvider;
  symbol: string;
}

export interface FetchCryptoGlobalMetricsOptions {
  provider?: MarketDataProvider;
}

export type ProviderMarketObservation = MarketQuote;
export type ProviderMarketHistoryPoint = HistoricalBar;