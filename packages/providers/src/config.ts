import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as nextEnv from '@next/env';
import { z } from 'zod';
import {
  DEFAULT_CRYPTO_SYMBOLS,
  DEFAULT_ETF_SYMBOLS,
  DEFAULT_INDEX_SYMBOLS,
  DEFAULT_STOCK_SYMBOLS,
} from './market/default-symbol-universe';

const { loadEnvConfig } = nextEnv;

let envLoaded = false;

function tryLoadEnv(dir: string) {
  try {
    loadEnvConfig(dir);
    return true;
  } catch {
    return false;
  }
}

function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(currentDir, '../../..');
  const candidateDirs = [
    repoRoot,
    path.resolve(repoRoot, 'apps/web'),
    path.resolve(repoRoot, 'apps/worker'),
    path.resolve(repoRoot, 'packages/providers'),
  ];

  for (const dir of candidateDirs) {
    tryLoadEnv(dir);
  }

  envLoaded = true;
}

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().min(1).optional());

const providerEnvSchema = z.object({
  MARKET_DATA_PROVIDER: z
    .enum(['polygon', 'twelve-data', 'tiingo', 'coingecko', 'finnhub', 'eodhd'])
    .default('polygon'),

  POLYGON_API_KEY: optionalNonEmptyString,
  TWELVE_DATA_API_KEY: optionalNonEmptyString,
  TIINGO_API_KEY: optionalNonEmptyString,
  COINGECKO_API_KEY: optionalNonEmptyString,
  FINNHUB_API_KEY: optionalNonEmptyString,
  EODHD_API_KEY: optionalNonEmptyString,

  MARKET_SYMBOLS: optionalNonEmptyString,
  SIMULATION_SYMBOLS: optionalNonEmptyString,
  SIMULATION_STOCK_SYMBOLS: optionalNonEmptyString,
  SIMULATION_ETF_SYMBOLS: optionalNonEmptyString,
  SIMULATION_CRYPTO_SYMBOLS: optionalNonEmptyString,
  LIVE_CANDIDATE_SYMBOLS: optionalNonEmptyString,
  HISTORY_PRIORITY_SYMBOLS: optionalNonEmptyString,

  ERSTE_CONNECT_CLIENT_ID: optionalNonEmptyString,
  ERSTE_CONNECT_CLIENT_SECRET: optionalNonEmptyString,
  ERSTE_CONNECT_REDIRECT_URI: optionalNonEmptyString,
  ERSTE_CONNECT_AUTH_URL: optionalNonEmptyString,
  ERSTE_CONNECT_TOKEN_URL: optionalNonEmptyString,
  ERSTE_CONNECT_API_BASE_URL: optionalNonEmptyString,

  ENABLE_SPARKASSE_GEORGE_SANDBOX: z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.union([z.literal('true'), z.literal('false')]).optional()),
});

export type ProviderEnv = z.infer<typeof providerEnvSchema>;
export type MarketDataProvider = ProviderEnv['MARKET_DATA_PROVIDER'];

function parseCsv(input: string | undefined): string[] {
  return (input ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueUpper(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const raw of values) {
    const normalized = raw.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

function mergeSymbolSets(...sets: string[][]): string[] {
  return uniqueUpper(sets.flat());
}

export function getProviderEnv(): ProviderEnv {
  ensureEnvLoaded();

  return providerEnvSchema.parse({
    MARKET_DATA_PROVIDER: process.env.MARKET_DATA_PROVIDER,
    POLYGON_API_KEY: process.env.POLYGON_API_KEY,
    TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
    TIINGO_API_KEY: process.env.TIINGO_API_KEY,
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
    EODHD_API_KEY: process.env.EODHD_API_KEY,

    MARKET_SYMBOLS: process.env.MARKET_SYMBOLS,
    SIMULATION_SYMBOLS: process.env.SIMULATION_SYMBOLS,
    SIMULATION_STOCK_SYMBOLS: process.env.SIMULATION_STOCK_SYMBOLS,
    SIMULATION_ETF_SYMBOLS: process.env.SIMULATION_ETF_SYMBOLS,
    SIMULATION_CRYPTO_SYMBOLS: process.env.SIMULATION_CRYPTO_SYMBOLS,
    LIVE_CANDIDATE_SYMBOLS: process.env.LIVE_CANDIDATE_SYMBOLS,
    HISTORY_PRIORITY_SYMBOLS: process.env.HISTORY_PRIORITY_SYMBOLS,

    ERSTE_CONNECT_CLIENT_ID: process.env.ERSTE_CONNECT_CLIENT_ID,
    ERSTE_CONNECT_CLIENT_SECRET: process.env.ERSTE_CONNECT_CLIENT_SECRET,
    ERSTE_CONNECT_REDIRECT_URI: process.env.ERSTE_CONNECT_REDIRECT_URI,
    ERSTE_CONNECT_AUTH_URL: process.env.ERSTE_CONNECT_AUTH_URL,
    ERSTE_CONNECT_TOKEN_URL: process.env.ERSTE_CONNECT_TOKEN_URL,
    ERSTE_CONNECT_API_BASE_URL: process.env.ERSTE_CONNECT_API_BASE_URL,

    ENABLE_SPARKASSE_GEORGE_SANDBOX: process.env.ENABLE_SPARKASSE_GEORGE_SANDBOX,
  });
}

export function requirePolygonApiKey(): string {
  const env = getProviderEnv();
  if (!env.POLYGON_API_KEY) {
    throw new Error('Missing API key for Polygon. Set POLYGON_API_KEY.');
  }
  return env.POLYGON_API_KEY;
}

export function requireTwelveDataApiKey(): string {
  const env = getProviderEnv();
  if (!env.TWELVE_DATA_API_KEY) {
    throw new Error('Missing API key for Twelve Data. Set TWELVE_DATA_API_KEY.');
  }
  return env.TWELVE_DATA_API_KEY;
}

export function requireTiingoApiKey(): string {
  const env = getProviderEnv();
  if (!env.TIINGO_API_KEY) {
    throw new Error('Missing API key for Tiingo. Set TIINGO_API_KEY.');
  }
  return env.TIINGO_API_KEY;
}

export function requireCoinGeckoApiKey(): string {
  const env = getProviderEnv();
  if (!env.COINGECKO_API_KEY) {
    throw new Error('Missing API key for CoinGecko. Set COINGECKO_API_KEY.');
  }
  return env.COINGECKO_API_KEY;
}

export function requireFinnhubApiKey(): string {
  const env = getProviderEnv();
  if (!env.FINNHUB_API_KEY) {
    throw new Error('Missing API key for Finnhub. Set FINNHUB_API_KEY.');
  }
  return env.FINNHUB_API_KEY;
}

export function requireEodhdApiKey(): string {
  const env = getProviderEnv();
  if (!env.EODHD_API_KEY) {
    throw new Error('Missing API key for EODHD. Set EODHD_API_KEY.');
  }
  return env.EODHD_API_KEY;
}

export function getMarketProviderApiKey(provider: MarketDataProvider): string {
  switch (provider) {
    case 'polygon':
      return requirePolygonApiKey();
    case 'twelve-data':
      return requireTwelveDataApiKey();
    case 'tiingo':
      return requireTiingoApiKey();
    case 'coingecko':
      return requireCoinGeckoApiKey();
    case 'finnhub':
      return requireFinnhubApiKey();
    case 'eodhd':
      return requireEodhdApiKey();
    default:
      throw new Error(`Unsupported market data provider: ${provider satisfies never}`);
  }
}

export function getDefaultMarketSymbols(): string[] {
  return mergeSymbolSets(
    DEFAULT_STOCK_SYMBOLS,
    DEFAULT_ETF_SYMBOLS,
    DEFAULT_CRYPTO_SYMBOLS,
    DEFAULT_INDEX_SYMBOLS,
  );
}

export function getMarketSymbols(_provider?: MarketDataProvider): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.MARKET_SYMBOLS);

  if (configured.length > 0) {
    return mergeSymbolSets(configured);
  }

  return getDefaultMarketSymbols();
}

export function getSimulationStockSymbols(): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.SIMULATION_STOCK_SYMBOLS);
  return configured.length > 0 ? mergeSymbolSets(configured) : [...DEFAULT_STOCK_SYMBOLS];
}

export function getSimulationEtfSymbols(): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.SIMULATION_ETF_SYMBOLS);
  return configured.length > 0 ? mergeSymbolSets(configured) : [...DEFAULT_ETF_SYMBOLS];
}

export function getSimulationCryptoSymbols(): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.SIMULATION_CRYPTO_SYMBOLS);
  return configured.length > 0 ? mergeSymbolSets(configured) : [...DEFAULT_CRYPTO_SYMBOLS];
}

export function getSimulationSymbols(): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.SIMULATION_SYMBOLS);

  if (configured.length > 0) {
    return mergeSymbolSets(configured);
  }

  return mergeSymbolSets(
    getSimulationStockSymbols(),
    getSimulationEtfSymbols(),
    getSimulationCryptoSymbols(),
  );
}

export function getLiveCandidateSymbols(): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.LIVE_CANDIDATE_SYMBOLS);

  if (configured.length > 0) {
    return mergeSymbolSets(configured);
  }

  return mergeSymbolSets(
    ['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ', 'VTI'],
    ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'],
  );
}

export function getHistoryPrioritySymbols(): string[] {
  const env = getProviderEnv();
  const configured = parseCsv(env.HISTORY_PRIORITY_SYMBOLS);

  if (configured.length > 0) {
    return mergeSymbolSets(configured);
  }

  return mergeSymbolSets(
    getSimulationSymbols(),
    getLiveCandidateSymbols(),
    getMarketSymbols(),
  );
}
