import { getBrokerEnv } from '../../env/broker-env';
import { signCoinbaseRestJwt } from './coinbase-jwt';

export interface CoinbaseMarketOrderInput {
  readonly symbol: string;
  readonly side: 'buy' | 'sell';
  readonly quantity: number;
  readonly clientOrderId: string;
}

export interface CoinbaseExecutionResult {
  readonly broker: 'coinbase';
  readonly orderId: string;
  readonly symbol: string;
  readonly side: 'buy' | 'sell';
  readonly executedQuantity: number;
  readonly executedPrice: number;
  readonly requestedPrice: number;
  readonly status: 'submitted' | 'filled';
  readonly filledAt: string;
  readonly raw: unknown;
}

interface CoinbaseCreateOrderResponse {
  success?: boolean;
  success_response?: {
    order_id?: string;
    product_id?: string;
  };
  error_response?: {
    error?: string;
    message?: string;
  };
}

interface CoinbaseKeyPermissionsResponse {
  can_view?: boolean;
  can_trade?: boolean;
  can_transfer?: boolean;
  portfolio_uuid?: string;
  portfolio_type?: string;
}

function assertConfigured() {
  const env = getBrokerEnv();

  const hasDirectToken = Boolean(env.COINBASE_BEARER_TOKEN);
  const hasKeyMaterial = Boolean(env.COINBASE_API_KEY_ID && env.COINBASE_API_KEY_SECRET);

  if (!hasDirectToken && !hasKeyMaterial) {
    throw new Error(
      'Coinbase credentials are missing. Set COINBASE_BEARER_TOKEN or COINBASE_API_KEY_ID + COINBASE_API_KEY_SECRET.',
    );
  }

  return env;
}

function normalizeProductId(symbol: string): string {
  const stripped = symbol.replace(/^COINBASE:/i, '').trim().toUpperCase();

  if (stripped.includes('-')) {
    return stripped;
  }

  if (stripped.endsWith('USD')) {
    return `${stripped.slice(0, -3)}-USD`;
  }

  return stripped;
}

function assertAllowedProductId(productId: string) {
  const env = getBrokerEnv();
  const allowed = env.COINBASE_ALLOWED_PRODUCT_IDS.map((entry) => entry.toUpperCase());

  if (allowed.length > 0 && !allowed.includes(productId.toUpperCase())) {
    throw new Error(`Coinbase product ${productId} is not in COINBASE_ALLOWED_PRODUCT_IDS.`);
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildAuthorizationHeader(method: string, path: string): string {
  const env = assertConfigured();

  if (env.COINBASE_BEARER_TOKEN) {
    return `Bearer ${env.COINBASE_BEARER_TOKEN}`;
  }

  return `Bearer ${signCoinbaseRestJwt({
    apiKeyId: env.COINBASE_API_KEY_ID!,
    apiKeySecret: env.COINBASE_API_KEY_SECRET!,
    requestMethod: method,
    requestHost: new URL(env.COINBASE_API_BASE_URL).host,
    requestPath: path,
    expiresInSec: env.COINBASE_JWT_EXPIRES_IN_SEC,
  })}`;
}

export async function getCoinbaseKeyPermissions(): Promise<CoinbaseKeyPermissionsResponse> {
  const env = assertConfigured();
  const path = '/api/v3/brokerage/key_permissions';

  const response = await fetchWithTimeout(
    `${env.COINBASE_API_BASE_URL}${path}`,
    {
      method: 'GET',
      headers: {
        Authorization: buildAuthorizationHeader('GET', path),
      },
    },
    env.BROKER_ORDER_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Coinbase key permissions request failed with HTTP ${response.status}.`);
  }

  return response.json() as Promise<CoinbaseKeyPermissionsResponse>;
}

export async function assertCoinbaseTradingPermission(): Promise<void> {
  const permissions = await getCoinbaseKeyPermissions();

  if (permissions.can_trade === false) {
    throw Object.assign(
      new Error(
        'Coinbase API key has view-only permissions. Trading requires a key with trade permission enabled. ' +
          'Update your Coinbase API key to include the "Trade" permission before placing live orders.',
      ),
      { code: 'COINBASE_INSUFFICIENT_PERMISSIONS' },
    );
  }
}

export async function placeCoinbaseMarketOrder(
  input: CoinbaseMarketOrderInput,
  requestedPrice: number,
): Promise<CoinbaseExecutionResult> {
  const env = assertConfigured();
  const productId = normalizeProductId(input.symbol);

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Coinbase order quantity must be a positive number.');
  }

  assertAllowedProductId(productId);

  if (env.BROKER_DRY_RUN) {
    return {
      broker: 'coinbase',
      orderId: `coinbase-dry-${input.clientOrderId}`,
      symbol: productId,
      side: input.side,
      executedQuantity: input.quantity,
      executedPrice: requestedPrice,
      requestedPrice,
      status: 'filled',
      filledAt: new Date().toISOString(),
      raw: {
        dryRun: true,
        product_id: productId,
        side: input.side.toUpperCase(),
        quantity: input.quantity,
      },
    };
  }

  await assertCoinbaseTradingPermission();

  const path = '/api/v3/brokerage/orders';
  const body = {
    client_order_id: input.clientOrderId,
    product_id: productId,
    side: input.side.toUpperCase(),
    order_configuration: {
      market_market_ioc: {
        base_size: String(input.quantity),
      },
    },
    ...(env.COINBASE_PORTFOLIO_UUID
      ? { retail_portfolio_id: env.COINBASE_PORTFOLIO_UUID }
      : {}),
  };

  const response = await fetchWithTimeout(
    `${env.COINBASE_API_BASE_URL}${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildAuthorizationHeader('POST', path),
      },
      body: JSON.stringify(body),
    },
    env.BROKER_ORDER_TIMEOUT_MS,
  );

  const raw = (await response.json().catch(() => null)) as CoinbaseCreateOrderResponse | null;

  if (!response.ok || !raw) {
    throw new Error(`Coinbase order failed with HTTP ${response.status}.`);
  }

  if (!raw.success) {
    const message =
      raw.error_response?.message ||
      raw.error_response?.error ||
      'Coinbase order was rejected by the broker.';
    throw new Error(message);
  }

  return {
    broker: 'coinbase',
    orderId: raw.success_response?.order_id ?? input.clientOrderId,
    symbol: raw.success_response?.product_id ?? productId,
    side: input.side,
    executedQuantity: input.quantity,
    executedPrice: requestedPrice,
    requestedPrice,
    status: 'submitted',
    filledAt: new Date().toISOString(),
    raw,
  };
}
