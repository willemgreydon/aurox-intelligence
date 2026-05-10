import type {
  FundingRateEvent,
  LiquidationEvent,
  MarketTick,
  OrderBookUpdate,
  TradeEvent,
} from './contracts';
import { fundingRateEventSchema, liquidationEventSchema, marketTickSchema, orderBookUpdateSchema, tradeEventSchema } from './contracts';
import { inferAssetClassFromSymbol, fromProviderSymbol } from './symbol-normalization';

const nowIso = () => new Date().toISOString();

function parseIsoMillis(value: unknown): string {
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') {
    const time = Number(value);
    if (Number.isFinite(time)) return new Date(time).toISOString();
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return nowIso();
}

export function mapBinanceTicker(raw: any): MarketTick | null {
  if (!raw || typeof raw.s !== 'string') return null;
  const normalizedSymbol = fromProviderSymbol('binance', raw.s);
  return marketTickSchema.parse({
    provider: 'binance',
    symbol: raw.s,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    price: Number(raw.c),
    bid: Number(raw.b),
    ask: Number(raw.a),
    bidSize: Number(raw.B),
    askSize: Number(raw.A),
    volume24h: Number(raw.v),
    change24h: Number(raw.P),
    eventTime: parseIsoMillis(raw.E),
    receivedAt: nowIso(),
    latencyMs: null,
    raw,
  });
}

export function mapBinanceTrade(raw: any): TradeEvent | null {
  if (!raw || typeof raw.s !== 'string') return null;
  const normalizedSymbol = fromProviderSymbol('binance', raw.s);
  return tradeEventSchema.parse({
    provider: 'binance',
    symbol: raw.s,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    tradeId: String(raw.t ?? raw.a ?? 'unknown'),
    price: Number(raw.p),
    size: Number(raw.q),
    side: raw.m === true ? 'sell' : 'buy',
    eventTime: parseIsoMillis(raw.T ?? raw.E),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapBinanceOrderBook(raw: any): OrderBookUpdate | null {
  if (!raw || typeof raw.s !== 'string') return null;
  const normalizedSymbol = fromProviderSymbol('binance', raw.s);
  return orderBookUpdateSchema.parse({
    provider: 'binance',
    symbol: raw.s,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    bids: (raw.b ?? []).map((entry: [string, string]) => ({ price: Number(entry[0]), size: Number(entry[1]) })),
    asks: (raw.a ?? []).map((entry: [string, string]) => ({ price: Number(entry[0]), size: Number(entry[1]) })),
    sequence: raw.u ?? null,
    eventTime: parseIsoMillis(raw.E),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapBybitTicker(raw: any): MarketTick | null {
  const data = raw?.data?.[0];
  if (!data?.symbol) return null;
  const normalizedSymbol = fromProviderSymbol('bybit', data.symbol);
  return marketTickSchema.parse({
    provider: 'bybit',
    symbol: data.symbol,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    price: Number(data.lastPrice),
    bid: Number(data.bid1Price),
    ask: Number(data.ask1Price),
    bidSize: Number(data.bid1Size ?? 0),
    askSize: Number(data.ask1Size ?? 0),
    volume24h: Number(data.turnover24h ?? data.volume24h ?? 0),
    change24h: Number(data.price24hPcnt ?? 0) * 100,
    eventTime: parseIsoMillis(data.ts ?? raw.ts),
    receivedAt: nowIso(),
    latencyMs: null,
    raw,
  });
}

export function mapBybitTrade(raw: any): TradeEvent | null {
  const data = raw?.data?.[0];
  if (!data?.s) return null;
  const normalizedSymbol = fromProviderSymbol('bybit', data.s);
  return tradeEventSchema.parse({
    provider: 'bybit',
    symbol: data.s,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    tradeId: String(data.i ?? data.T ?? 'unknown'),
    price: Number(data.p),
    size: Number(data.v),
    side: String(data.S ?? '').toLowerCase() === 'buy' ? 'buy' : 'sell',
    eventTime: parseIsoMillis(data.T ?? raw.ts),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapBybitOrderBook(raw: any): OrderBookUpdate | null {
  const data = raw?.data;
  if (!data?.s) return null;
  const normalizedSymbol = fromProviderSymbol('bybit', data.s);
  return orderBookUpdateSchema.parse({
    provider: 'bybit',
    symbol: data.s,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    bids: (data.b ?? []).map((entry: [string, string]) => ({ price: Number(entry[0]), size: Number(entry[1]) })),
    asks: (data.a ?? []).map((entry: [string, string]) => ({ price: Number(entry[0]), size: Number(entry[1]) })),
    sequence: data.u ?? null,
    eventTime: parseIsoMillis(data.ts ?? raw.ts),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapOkxTicker(raw: any): MarketTick | null {
  const data = raw?.data?.[0];
  if (!data?.instId) return null;
  const normalizedSymbol = fromProviderSymbol('okx', data.instId);
  return marketTickSchema.parse({
    provider: 'okx',
    symbol: data.instId,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    price: Number(data.last),
    bid: Number(data.bidPx),
    ask: Number(data.askPx),
    bidSize: Number(data.bidSz ?? 0),
    askSize: Number(data.askSz ?? 0),
    volume24h: Number(data.vol24h ?? 0),
    change24h: Number(data.sodUtc0 ? ((Number(data.last) - Number(data.sodUtc0)) / Number(data.sodUtc0)) * 100 : 0),
    eventTime: parseIsoMillis(data.ts),
    receivedAt: nowIso(),
    latencyMs: null,
    raw,
  });
}

export function mapOkxTrade(raw: any): TradeEvent | null {
  const data = raw?.data?.[0];
  if (!data?.instId) return null;
  const normalizedSymbol = fromProviderSymbol('okx', data.instId);
  return tradeEventSchema.parse({
    provider: 'okx',
    symbol: data.instId,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    tradeId: String(data.tradeId ?? data.ts ?? 'unknown'),
    price: Number(data.px),
    size: Number(data.sz),
    side: String(data.side ?? 'unknown').toLowerCase(),
    eventTime: parseIsoMillis(data.ts),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapOkxOrderBook(raw: any): OrderBookUpdate | null {
  const data = raw?.data?.[0];
  if (!data?.asks || !data?.bids) return null;
  const symbol = data.instId ?? raw.arg?.instId;
  if (!symbol) return null;
  const normalizedSymbol = fromProviderSymbol('okx', symbol);
  return orderBookUpdateSchema.parse({
    provider: 'okx',
    symbol,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    bids: (data.bids ?? []).map((entry: [string, string]) => ({ price: Number(entry[0]), size: Number(entry[1]) })),
    asks: (data.asks ?? []).map((entry: [string, string]) => ({ price: Number(entry[0]), size: Number(entry[1]) })),
    sequence: data.seqId ?? data.ts ?? null,
    eventTime: parseIsoMillis(data.ts),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapCoinbaseTicker(raw: any): MarketTick | null {
  if (!raw?.product_id || raw.type !== 'ticker') return null;
  const normalizedSymbol = fromProviderSymbol('coinbase', raw.product_id);
  return marketTickSchema.parse({
    provider: 'coinbase',
    symbol: raw.product_id,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    price: Number(raw.price),
    bid: Number(raw.best_bid ?? raw.bid ?? 0),
    ask: Number(raw.best_ask ?? raw.ask ?? 0),
    bidSize: null,
    askSize: null,
    volume24h: Number(raw.volume_24h ?? raw.volume ?? 0),
    change24h: null,
    eventTime: parseIsoMillis(raw.time),
    receivedAt: nowIso(),
    latencyMs: null,
    raw,
  });
}

export function mapCoinbaseTrade(raw: any): TradeEvent | null {
  if (!raw?.product_id || (raw.type !== 'match' && raw.type !== 'last_match')) return null;
  const normalizedSymbol = fromProviderSymbol('coinbase', raw.product_id);
  return tradeEventSchema.parse({
    provider: 'coinbase',
    symbol: raw.product_id,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    tradeId: String(raw.trade_id ?? 'unknown'),
    price: Number(raw.price),
    size: Number(raw.size),
    side: String(raw.side ?? 'unknown').toLowerCase(),
    eventTime: parseIsoMillis(raw.time),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapCoinbaseOrderBook(raw: any): OrderBookUpdate | null {
  if (!raw?.product_id || raw.type !== 'l2update') return null;
  const normalizedSymbol = fromProviderSymbol('coinbase', raw.product_id);
  const bids: Array<{ price: number; size: number }> = [];
  const asks: Array<{ price: number; size: number }> = [];
  for (const change of raw.changes ?? []) {
    const [side, price, size] = change;
    if (side === 'buy') bids.push({ price: Number(price), size: Number(size) });
    if (side === 'sell') asks.push({ price: Number(price), size: Number(size) });
  }
  return orderBookUpdateSchema.parse({
    provider: 'coinbase',
    symbol: raw.product_id,
    normalizedSymbol,
    assetClass: inferAssetClassFromSymbol(normalizedSymbol),
    bids,
    asks,
    sequence: raw.sequence ?? null,
    eventTime: parseIsoMillis(raw.time),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapFundingEvent(
  provider: 'binance' | 'bybit' | 'okx',
  symbol: string,
  fundingRate: number,
  fundingTime: string,
  raw: unknown,
  predictedFundingRate?: number | null,
): FundingRateEvent {
  const normalizedSymbol = fromProviderSymbol(provider, symbol);
  return fundingRateEventSchema.parse({
    provider,
    symbol,
    normalizedSymbol,
    fundingRate,
    predictedFundingRate: predictedFundingRate ?? null,
    fundingTime,
    eventTime: nowIso(),
    receivedAt: nowIso(),
    raw,
  });
}

export function mapLiquidationEvent(
  provider: 'binance' | 'bybit' | 'okx',
  symbol: string,
  side: 'buy' | 'sell' | 'unknown',
  price: number,
  size: number,
  raw: unknown,
): LiquidationEvent {
  const normalizedSymbol = fromProviderSymbol(provider, symbol);
  return liquidationEventSchema.parse({
    provider,
    symbol,
    normalizedSymbol,
    side,
    price,
    size,
    eventTime: nowIso(),
    receivedAt: nowIso(),
    raw,
  });
}
