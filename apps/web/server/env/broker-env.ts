import { z } from 'zod';

const csvString = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const booleanish = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    return value.trim().toLowerCase() === 'true';
  });

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const brokerEnvSchema = z.object({
  BROKER_EXECUTION_PROVIDER: z.enum(['simulation', 'binance', 'coinbase']).default('simulation'),
  BROKER_DRY_RUN: booleanish.default(true),
  BROKER_SANDBOX_MODE: booleanish.default(true),
  BROKER_ORDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  BROKER_ALLOWED_LIVE_MODE_IDS: csvString,

  BINANCE_API_KEY: optionalString,
  BINANCE_API_SECRET: optionalString,
  BINANCE_API_BASE_URL: optionalString.default('https://testnet.binance.vision'),
  BINANCE_RECV_WINDOW_MS: z.coerce.number().int().positive().max(60_000).default(5_000),
  BINANCE_ALLOWED_SYMBOLS: csvString,

  COINBASE_API_KEY_ID: optionalString,
  COINBASE_API_KEY_SECRET: optionalString,
  COINBASE_API_BASE_URL: optionalString.default('https://api.coinbase.com'),
  COINBASE_ALLOWED_PRODUCT_IDS: csvString,
  COINBASE_JWT_EXPIRES_IN_SEC: z.coerce.number().int().positive().max(300).default(120),
  COINBASE_BEARER_TOKEN: optionalString,
  COINBASE_PORTFOLIO_UUID: optionalString,
});

export type BrokerEnv = z.infer<typeof brokerEnvSchema>;

let cachedEnv: BrokerEnv | null = null;

function normalizeCoinbaseSecret(secret?: string): string | undefined {
  if (!secret) return undefined;
  return secret.includes('\\n') ? secret.replace(/\\n/g, '\n') : secret;
}

export function getBrokerEnv(): BrokerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = brokerEnvSchema.parse({
    BROKER_EXECUTION_PROVIDER: process.env.BROKER_EXECUTION_PROVIDER,
    BROKER_DRY_RUN: process.env.BROKER_DRY_RUN,
    BROKER_SANDBOX_MODE: process.env.BROKER_SANDBOX_MODE,
    BROKER_ORDER_TIMEOUT_MS: process.env.BROKER_ORDER_TIMEOUT_MS,
    BROKER_ALLOWED_LIVE_MODE_IDS: process.env.BROKER_ALLOWED_LIVE_MODE_IDS,

    BINANCE_API_KEY: process.env.BINANCE_API_KEY,
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
    BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL,
    BINANCE_RECV_WINDOW_MS: process.env.BINANCE_RECV_WINDOW_MS,
    BINANCE_ALLOWED_SYMBOLS: process.env.BINANCE_ALLOWED_SYMBOLS,

    COINBASE_API_KEY_ID: process.env.COINBASE_API_KEY_ID,
    COINBASE_API_KEY_SECRET: process.env.COINBASE_API_KEY_SECRET,
    COINBASE_API_BASE_URL: process.env.COINBASE_API_BASE_URL,
    COINBASE_ALLOWED_PRODUCT_IDS: process.env.COINBASE_ALLOWED_PRODUCT_IDS,
    COINBASE_JWT_EXPIRES_IN_SEC: process.env.COINBASE_JWT_EXPIRES_IN_SEC,
    COINBASE_BEARER_TOKEN: process.env.COINBASE_BEARER_TOKEN,
    COINBASE_PORTFOLIO_UUID: process.env.COINBASE_PORTFOLIO_UUID,
  });

  cachedEnv = {
    ...parsed,
    COINBASE_API_KEY_SECRET: normalizeCoinbaseSecret(parsed.COINBASE_API_KEY_SECRET),
  };

  return cachedEnv;
}

export function hasBinanceBrokerCredentials(): boolean {
  const env = getBrokerEnv();
  return Boolean(env.BINANCE_API_KEY && env.BINANCE_API_SECRET);
}

export function hasCoinbaseBrokerCredentials(): boolean {
  const env = getBrokerEnv();
  return Boolean(
    env.COINBASE_BEARER_TOKEN ||
      (env.COINBASE_API_KEY_ID && env.COINBASE_API_KEY_SECRET),
  );
}

export function hasAnyLiveBrokerConfigured(): boolean {
  return hasBinanceBrokerCredentials() || hasCoinbaseBrokerCredentials();
}

export function canUseLiveExecutionForMode(modeId: string): boolean {
  const env = getBrokerEnv();

  if (env.BROKER_ALLOWED_LIVE_MODE_IDS.length === 0) {
    return true;
  }

  return env.BROKER_ALLOWED_LIVE_MODE_IDS.includes(modeId);
}

export function getBrokerConnectionSummary() {
  const env = getBrokerEnv();

  return {
    provider: env.BROKER_EXECUTION_PROVIDER,
    dryRun: env.BROKER_DRY_RUN,
    sandboxMode: env.BROKER_SANDBOX_MODE,
    hasConfiguredBroker: hasAnyLiveBrokerConfigured(),
    hasBinance: hasBinanceBrokerCredentials(),
    hasCoinbase: hasCoinbaseBrokerCredentials(),
    allowedLiveModeIds: env.BROKER_ALLOWED_LIVE_MODE_IDS,
    allowedBinanceSymbols: env.BINANCE_ALLOWED_SYMBOLS,
    allowedCoinbaseProductIds: env.COINBASE_ALLOWED_PRODUCT_IDS,
    binanceBaseUrl: env.BINANCE_API_BASE_URL,
    coinbaseBaseUrl: env.COINBASE_API_BASE_URL,
  };
}