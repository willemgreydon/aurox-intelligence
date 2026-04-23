import crypto from 'node:crypto';
import { getBrokerEnv } from '../../env/broker-env';

export interface BinanceMarketOrderInput {
  readonly symbol: string;
  readonly side: 'buy' | 'sell';
  readonly quantity: number;
  readonly clientOrderId: string;
}

export interface BinanceExecutionResult {
  readonly broker: 'binance';
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

interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime?: number;
  executedQty?: string;
  cummulativeQuoteQty?: string;
  status?: string;
}

function assertConfigured() {
  const env = getBrokerEnv();

  if (!env.BINANCE_API_KEY || !env.BINANCE_API_SECRET) {
    throw new Error('Binance broker credentials are missing. Set BINANCE_API_KEY and BINANCE_API_SECRET.');
  }

  return env;
}

function normalizeSymbol(symbol: string): string {
  return symbol
    .replace(/^BINANCE:/i, '')
    .replace(/[-_/:\s]/g, '')
    .toUpperCase();
}

function assertAllowedSymbol(symbol: string) {
  const env = getBrokerEnv();
  const allowed = env.BINANCE_ALLOWED_SYMBOLS.map((entry) => entry.toUpperCase());

  if (allowed.length > 0 && !allowed.includes(symbol.toUpperCase())) {
    throw new Error(`Binance symbol ${symbol} is not in BINANCE_ALLOWED_SYMBOLS.`);
  }
}

function formatQuantity(quantity: number): string {
  const rounded = Math.round(quantity * 1_000_000) / 1_000_000;
  return rounded.toFixed(6).replace(/\.?0+$/, '');
}

function signQuery(query: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(query).digest('hex');
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

export async function pingBinance(): Promise<boolean> {
  const env = assertConfigured();
  const response = await fetchWithTimeout(
    `${env.BINANCE_API_BASE_URL}/api/v3/ping`,
    {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': env.BINANCE_API_KEY! },
    },
    env.BROKER_ORDER_TIMEOUT_MS,
  );

  return response.ok;
}

export async function placeBinanceMarketOrder(
  input: BinanceMarketOrderInput,
  requestedPrice: number,
): Promise<BinanceExecutionResult> {
  const env = assertConfigured();
  const symbol = normalizeSymbol(input.symbol);

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Binance order quantity must be a positive number.');
  }

  assertAllowedSymbol(symbol);

  if (env.BROKER_DRY_RUN) {
    return {
      broker: 'binance',
      orderId: `binance-dry-${input.clientOrderId}`,
      symbol,
      side: input.side,
      executedQuantity: input.quantity,
      executedPrice: requestedPrice,
      requestedPrice,
      status: 'filled',
      filledAt: new Date().toISOString(),
      raw: {
        dryRun: true,
        symbol,
        side: input.side.toUpperCase(),
        quantity: input.quantity,
      },
    };
  }

  const timestamp = Date.now();
  const params = new URLSearchParams({
    symbol,
    side: input.side.toUpperCase(),
    type: 'MARKET',
    quantity: formatQuantity(input.quantity),
    newClientOrderId: input.clientOrderId,
    recvWindow: String(env.BINANCE_RECV_WINDOW_MS),
    timestamp: String(timestamp),
  });

  const signature = signQuery(params.toString(), env.BINANCE_API_SECRET!);
  params.append('signature', signature);

  const response = await fetchWithTimeout(
    `${env.BINANCE_API_BASE_URL}/api/v3/order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-MBX-APIKEY': env.BINANCE_API_KEY!,
      },
      body: params.toString(),
    },
    env.BROKER_ORDER_TIMEOUT_MS,
  );

  const raw = (await response.json().catch(() => null)) as BinanceOrderResponse | null;

  if (!response.ok || !raw) {
    const detail = raw
      ? ` — ${(raw as Record<string, unknown>).msg ?? (raw as Record<string, unknown>).code ?? 'no detail'}`
      : '';
    throw new Error(`Binance order failed (HTTP ${response.status})${detail}.`);
  }

  const executedQty = Number(raw.executedQty ?? input.quantity);
  const quoteQty = Number(raw.cummulativeQuoteQty ?? requestedPrice * executedQty);
  const executedPrice = executedQty > 0 ? quoteQty / executedQty : requestedPrice;

  return {
    broker: 'binance',
    orderId: String(raw.orderId),
    symbol: raw.symbol ?? symbol,
    side: input.side,
    executedQuantity: executedQty,
    executedPrice,
    requestedPrice,
    status: raw.status === 'NEW' ? 'submitted' : 'filled',
    filledAt: new Date(raw.transactTime ?? Date.now()).toISOString(),
    raw,
  };
}