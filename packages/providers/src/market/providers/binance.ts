import { buildUrl, fetchJson } from '../../shared/http-client';
import { createUnsupportedSymbolError } from '../errors';
import { marketHistoryPointSchema, marketObservationSchema } from '../schemas';
import { normalizeMarketSymbol } from '../provider-symbols';
import type { HistoricalBar, MarketHistoryResolution, MarketQuote } from '../types';

type BinanceTickerPriceResponse = {
  symbol?: string;
  price?: string;
};

type BinanceKline = [number, string, string, string, string, string, number, string, number, string, string, string];

const BINANCE_INTERVAL_BY_RESOLUTION: Record<Exclude<MarketHistoryResolution, '1d'>, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '60m': '1h',
};

function toBinanceSymbol(symbol: string): string | null {
  const normalized = normalizeMarketSymbol(symbol);
  if (!normalized.startsWith('BINANCE:')) {
    return null;
  }
  return normalized.slice('BINANCE:'.length);
}

function toNum(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchBinanceQuote(symbol: string): Promise<MarketQuote> {
  const providerSymbol = toBinanceSymbol(symbol);
  if (!providerSymbol) {
    throw createUnsupportedSymbolError('binance', `Binance does not support symbol ${symbol}.`);
  }
  const url = buildUrl('https://api.binance.com/api/v3/ticker/price', { symbol: providerSymbol });
  const response = await fetchJson<BinanceTickerPriceResponse>(url);
  const price = response.price ? toNum(response.price) : null;
  if (!price) {
    throw new Error(`Binance returned no quote for ${symbol}.`);
  }
  return marketObservationSchema.parse({
    symbol,
    assetKind: 'crypto',
    price,
    timestamp: new Date().toISOString(),
    source: 'binance',
    currency: 'USD',
  });
}

export async function fetchBinanceHistory(
  symbol: string,
  resolution: MarketHistoryResolution,
  from?: string,
  to?: string,
): Promise<HistoricalBar[]> {
  const providerSymbol = toBinanceSymbol(symbol);
  if (!providerSymbol) {
    throw createUnsupportedSymbolError('binance', `Binance does not support symbol ${symbol}.`);
  }
  const interval = resolution === '1d' ? '1d' : BINANCE_INTERVAL_BY_RESOLUTION[resolution];
  const startMs = from ? new Date(from).getTime() : undefined;
  const endMs = to ? new Date(to).getTime() : undefined;
  const url = buildUrl('https://api.binance.com/api/v3/klines', {
    symbol: providerSymbol,
    interval,
    ...(startMs ? { startTime: startMs } : {}),
    ...(endMs ? { endTime: endMs } : {}),
    limit: 1000,
  });
  const response = await fetchJson<BinanceKline[]>(url);
  return response.flatMap((kline) => {
    const [openTime, openRaw, highRaw, lowRaw, closeRaw, volumeRaw] = kline;
    const open = toNum(openRaw);
    const high = toNum(highRaw);
    const low = toNum(lowRaw);
    const close = toNum(closeRaw);
    const volume = toNum(volumeRaw);
    if (!Number.isFinite(openTime) || open === null || high === null || low === null || close === null) {
      return [];
    }
    return [
      marketHistoryPointSchema.parse({
        symbol,
        assetKind: 'crypto',
        timestamp: new Date(openTime).toISOString(),
        open,
        high,
        low,
        close,
        ...(volume !== null ? { volume } : {}),
        source: 'binance',
      }),
    ];
  });
}

