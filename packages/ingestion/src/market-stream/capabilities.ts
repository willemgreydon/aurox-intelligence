import type { MarketStreamAssetClass } from './contracts';

export type ProviderAuthMode = 'none' | 'api-key' | 'hmac';
export type ProviderReliabilityTier = 'experimental' | 'standard' | 'high';
export type UnifiedProviderId =
  | 'binance'
  | 'bybit'
  | 'okx'
  | 'coinbase'
  | 'finnhub'
  | 'polygon'
  | 'twelve-data'
  | 'coingecko'
  | 'eodhd'
  | 'tiingo'
  | 'local-cache';

export type MarketHistoryResolution = '1m' | '5m' | '15m' | '30m' | '60m' | '1d';
export type ProviderQuoteMode = 'live' | 'delayed' | 'cached' | 'none';

export type ProviderCapabilities = {
  providerId: UnifiedProviderId;
  displayName: string;
  authMode: ProviderAuthMode;
  assetClasses: MarketStreamAssetClass[];
  supportsRest: boolean;
  supportsWebSocket: boolean;
  supportsAuthenticatedAccount: boolean;
  supportsSpot: boolean;
  supportsPerpetuals: boolean;
  supportsFutures: boolean;
  supportsFundingRates: boolean;
  supportsOpenInterest: boolean;
  supportsLiquidations: boolean;
  supportsOrderBook: boolean;
  supportsTrades: boolean;
  supportsCandles: boolean;
  supportsTickers: boolean;
  supportsHistorical: boolean;
  supportedIntervals: MarketHistoryResolution[];
  quoteMode: ProviderQuoteMode;
  rateLimitProfile: string;
  dataFreshnessProfile: string;
  reliabilityTier: ProviderReliabilityTier;
  notes: string;
};

const CAPS: Record<UnifiedProviderId, ProviderCapabilities> = {
  binance: {
    providerId: 'binance', displayName: 'Binance', authMode: 'hmac', assetClasses: ['crypto'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: true, supportsSpot: true,
    supportsPerpetuals: true, supportsFutures: true, supportsFundingRates: true, supportsOpenInterest: true,
    supportsLiquidations: true, supportsOrderBook: true, supportsTrades: true, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'live',
    rateLimitProfile: 'Exchange quota model', dataFreshnessProfile: 'Realtime', reliabilityTier: 'high',
    notes: 'Primary authenticated crypto source.',
  },
  bybit: {
    providerId: 'bybit', displayName: 'Bybit (Public)', authMode: 'none', assetClasses: ['crypto'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: true, supportsFutures: true, supportsFundingRates: true, supportsOpenInterest: true,
    supportsLiquidations: true, supportsOrderBook: true, supportsTrades: true, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'live',
    rateLimitProfile: 'Public quota', dataFreshnessProfile: 'Realtime', reliabilityTier: 'standard',
    notes: 'Derivatives intelligence source.',
  },
  okx: {
    providerId: 'okx', displayName: 'OKX (Public)', authMode: 'none', assetClasses: ['crypto'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: true, supportsFutures: true, supportsFundingRates: true, supportsOpenInterest: true,
    supportsLiquidations: true, supportsOrderBook: true, supportsTrades: true, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'live',
    rateLimitProfile: 'Public quota', dataFreshnessProfile: 'Realtime', reliabilityTier: 'standard',
    notes: 'Derivatives intelligence source.',
  },
  coinbase: {
    providerId: 'coinbase', displayName: 'Coinbase (Public)', authMode: 'none', assetClasses: ['crypto'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: true, supportsTrades: true, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'live',
    rateLimitProfile: 'Public quota', dataFreshnessProfile: 'Realtime', reliabilityTier: 'standard',
    notes: 'US spot reference source.',
  },
  finnhub: {
    providerId: 'finnhub', displayName: 'Finnhub', authMode: 'api-key', assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: false, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'live',
    rateLimitProfile: 'API key quota', dataFreshnessProfile: 'Near realtime', reliabilityTier: 'high',
    notes: 'Primary stock/ETF quote source.',
  },
  polygon: {
    providerId: 'polygon', displayName: 'Polygon', authMode: 'api-key', assetClasses: ['stock', 'etf', 'index'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: true, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'delayed',
    rateLimitProfile: 'API key quota', dataFreshnessProfile: 'Historical focus', reliabilityTier: 'high',
    notes: 'Primary historical OHLCV source.',
  },
  'twelve-data': {
    providerId: 'twelve-data', displayName: 'Twelve Data', authMode: 'api-key', assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'],
    supportsRest: true, supportsWebSocket: true, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: false, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1m', '5m', '15m', '30m', '60m', '1d'], quoteMode: 'delayed',
    rateLimitProfile: 'API key quota', dataFreshnessProfile: 'Fallback', reliabilityTier: 'standard',
    notes: 'Fallback multi-asset provider.',
  },
  coingecko: {
    providerId: 'coingecko', displayName: 'CoinGecko', authMode: 'api-key', assetClasses: ['crypto'],
    supportsRest: true, supportsWebSocket: false, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: false, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1d'], quoteMode: 'cached',
    rateLimitProfile: 'API key quota', dataFreshnessProfile: 'Delayed', reliabilityTier: 'standard',
    notes: 'Fallback crypto source.',
  },
  eodhd: {
    providerId: 'eodhd', displayName: 'EODHD', authMode: 'api-key', assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'],
    supportsRest: true, supportsWebSocket: false, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: false, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1d'], quoteMode: 'delayed',
    rateLimitProfile: 'API key quota', dataFreshnessProfile: 'Daily', reliabilityTier: 'standard',
    notes: 'Legacy fallback provider.',
  },
  tiingo: {
    providerId: 'tiingo', displayName: 'Tiingo', authMode: 'api-key', assetClasses: ['stock', 'etf'],
    supportsRest: true, supportsWebSocket: false, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: false, supportsCandles: true, supportsTickers: false,
    supportsHistorical: true, supportedIntervals: ['1d'], quoteMode: 'cached',
    rateLimitProfile: 'API key quota', dataFreshnessProfile: 'Metadata-focused', reliabilityTier: 'standard',
    notes: 'Metadata fallback.',
  },
  'local-cache': {
    providerId: 'local-cache', displayName: 'Local Cache', authMode: 'none', assetClasses: ['stock', 'etf', 'crypto', 'fx', 'index'],
    supportsRest: false, supportsWebSocket: false, supportsAuthenticatedAccount: false, supportsSpot: true,
    supportsPerpetuals: false, supportsFutures: false, supportsFundingRates: false, supportsOpenInterest: false,
    supportsLiquidations: false, supportsOrderBook: false, supportsTrades: false, supportsCandles: true, supportsTickers: true,
    supportsHistorical: true, supportedIntervals: ['1d'], quoteMode: 'cached',
    rateLimitProfile: 'Internal only', dataFreshnessProfile: 'Fallback only', reliabilityTier: 'standard',
    notes: 'Degraded fallback source.',
  },
};

export function getProviderCapabilities(providerId: UnifiedProviderId): ProviderCapabilities {
  return CAPS[providerId];
}

export function listProviderCapabilities(): ProviderCapabilities[] {
  return Object.values(CAPS);
}
