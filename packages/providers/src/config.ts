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
    .enum(['polygon', 'twelve-data', 'tiingo', 'coingecko', 'finnhub', 'eodhd', 'binance'])
    .default('polygon'),

  POLYGON_API_KEY: optionalNonEmptyString,
  TWELVE_DATA_API_KEY: optionalNonEmptyString,
  TIINGO_API_KEY: optionalNonEmptyString,
  COINGECKO_API_KEY: optionalNonEmptyString,
  FINNHUB_API_KEY: optionalNonEmptyString,
  EODHD_API_KEY: optionalNonEmptyString,
  ANTHROPIC_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString,
  CLAUDE_FINANCE_API_KEY: optionalNonEmptyString,
  ANTHROPIC_PROVIDER_ENABLED: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.union([z.literal('true'), z.literal('false')]).optional()),
  OPENAI_PROVIDER_ENABLED: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.union([z.literal('true'), z.literal('false')]).optional()),
  AI_PRIMARY_PROVIDER: z.enum(['anthropic', 'openai']).optional(),
  AI_FALLBACK_PROVIDER: z.enum(['anthropic', 'openai']).optional(),
  CLAUDE_FINANCE_PROVIDER_ENABLED: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.union([z.literal('true'), z.literal('false')]).optional()),

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
export type AiProviderName = 'anthropic' | 'openai';
export type AiProviderUnavailableReason =
  | 'missing_primary_key'
  | 'primary_disabled'
  | 'missing_all_keys'
  | 'all_providers_disabled';

export type ResolvedAiProviderConfig =
  | {
      available: true;
      provider: AiProviderName;
      apiKey: string;
      fallbackProviderUsed: boolean;
      usingDeprecatedClaudeAlias: boolean;
    }
  | {
      available: false;
      provider: AiProviderName | null;
      fallbackProviderUsed: boolean;
      usingDeprecatedClaudeAlias: boolean;
      reason: AiProviderUnavailableReason;
    };

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

function asEnabledFlag(
  value: 'true' | 'false' | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true';
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
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CLAUDE_FINANCE_API_KEY: process.env.CLAUDE_FINANCE_API_KEY,
    ANTHROPIC_PROVIDER_ENABLED: process.env.ANTHROPIC_PROVIDER_ENABLED,
    OPENAI_PROVIDER_ENABLED: process.env.OPENAI_PROVIDER_ENABLED,
    AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER as 'anthropic' | 'openai' | undefined,
    AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER as 'anthropic' | 'openai' | undefined,
    CLAUDE_FINANCE_PROVIDER_ENABLED: process.env.CLAUDE_FINANCE_PROVIDER_ENABLED,

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
    case 'binance':
      throw new Error('Binance uses public market-data endpoints and does not require an API key.');
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

export function getClaudeFinanceApiKey(): string | undefined {
  const env = getProviderEnv();
  return env.ANTHROPIC_API_KEY ?? env.CLAUDE_FINANCE_API_KEY;
}

export function isClaudeFinanceProviderEnabled(): boolean {
  const env = getProviderEnv();
  if (env.ANTHROPIC_PROVIDER_ENABLED !== undefined) {
    return env.ANTHROPIC_PROVIDER_ENABLED === 'true';
  }
  if (!env.CLAUDE_FINANCE_PROVIDER_ENABLED) return true;
  return env.CLAUDE_FINANCE_PROVIDER_ENABLED === 'true';
}

export function resolveAiProviderConfig(): ResolvedAiProviderConfig {
  const env = getProviderEnv();
  const anthropicKey = env.ANTHROPIC_API_KEY ?? env.CLAUDE_FINANCE_API_KEY;
  const usingDeprecatedClaudeAlias = !env.ANTHROPIC_API_KEY && Boolean(env.CLAUDE_FINANCE_API_KEY);
  const openaiKey = env.OPENAI_API_KEY;

  const anthropicEnabled = asEnabledFlag(env.ANTHROPIC_PROVIDER_ENABLED, true);
  const openaiEnabled = asEnabledFlag(env.OPENAI_PROVIDER_ENABLED, true);
  const primaryProvider: AiProviderName = env.AI_PRIMARY_PROVIDER ?? 'anthropic';
  const fallbackProvider: AiProviderName =
    env.AI_FALLBACK_PROVIDER ?? (primaryProvider === 'anthropic' ? 'openai' : 'anthropic');

  const providers: Record<AiProviderName, { enabled: boolean; key?: string }> = {
    anthropic: { enabled: anthropicEnabled, key: anthropicKey },
    openai: { enabled: openaiEnabled, key: openaiKey },
  };

  const primary = providers[primaryProvider];
  if (primary.enabled && primary.key) {
    return {
      available: true,
      provider: primaryProvider,
      apiKey: primary.key,
      fallbackProviderUsed: false,
      usingDeprecatedClaudeAlias,
    };
  }

  const fallback = providers[fallbackProvider];
  if (fallbackProvider !== primaryProvider && fallback.enabled && fallback.key) {
    return {
      available: true,
      provider: fallbackProvider,
      apiKey: fallback.key,
      fallbackProviderUsed: true,
      usingDeprecatedClaudeAlias,
    };
  }

  const anyEnabled = anthropicEnabled || openaiEnabled;
  const anyKey = Boolean(anthropicKey || openaiKey);
  const reason: AiProviderUnavailableReason = !anyEnabled
    ? 'all_providers_disabled'
    : !anyKey
      ? 'missing_all_keys'
      : primary.enabled
        ? 'missing_primary_key'
        : 'primary_disabled';

  return {
    available: false,
    provider: null,
    fallbackProviderUsed: false,
    usingDeprecatedClaudeAlias,
    reason,
  };
}
