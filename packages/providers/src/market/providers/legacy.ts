import { getMarketProviderApiKey, getProviderEnv, type MarketDataProvider } from '../../config';
import { buildUrl, fetchJson } from '../../shared/http-client';
import { mapEodhdHistory, mapEodhdObservation, mapFinnhubHistory, mapFinnhubObservation } from '../mapper';
import { resolveEodhdSymbol, resolveFinnhubSymbol } from '../provider-symbols';
import type { EodhdHistoricalPointResponse, EodhdRealTimeResponse, FinnhubCandleResponse, FinnhubQuoteResponse } from '../legacy-types';
import type { HistoricalBar, MarketQuote } from '../types';
import { createMissingConfigError } from '../errors';

export function isLegacyProviderConfigured(provider: Extract<MarketDataProvider, 'finnhub' | 'eodhd'>) {
  const env = getProviderEnv();
  return provider === 'finnhub' ? Boolean(env.FINNHUB_API_KEY) : Boolean(env.EODHD_API_KEY);
}

export async function fetchFinnhubQuote(symbol: string): Promise<MarketQuote> {
  const providerSymbol = resolveFinnhubSymbol(symbol);

  if (!providerSymbol || !isLegacyProviderConfigured('finnhub')) {
    throw createMissingConfigError('finnhub', `Finnhub is not configured or does not support ${symbol}.`);
  }

  const token = getMarketProviderApiKey('finnhub');
  const url = buildUrl('https://finnhub.io/api/v1/quote', {
    symbol: providerSymbol,
    token,
  });
  const response = await fetchJson<FinnhubQuoteResponse>(url);
  return mapFinnhubObservation(symbol, response);
}

export async function fetchFinnhubHistory(symbol: string, from?: string, to?: string): Promise<HistoricalBar[]> {
  const providerSymbol = resolveFinnhubSymbol(symbol);

  if (!providerSymbol || !isLegacyProviderConfigured('finnhub')) {
    throw createMissingConfigError('finnhub', `Finnhub is not configured or does not support ${symbol}.`);
  }

  const token = getMarketProviderApiKey('finnhub');
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const url = buildUrl('https://finnhub.io/api/v1/stock/candle', {
    symbol: providerSymbol,
    resolution: 'D',
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000),
    token,
  });
  const response = await fetchJson<FinnhubCandleResponse>(url);
  return mapFinnhubHistory(symbol, response);
}

export async function fetchEodhdQuote(symbol: string): Promise<MarketQuote> {
  const providerSymbol = resolveEodhdSymbol(symbol);

  if (!providerSymbol || !isLegacyProviderConfigured('eodhd')) {
    throw createMissingConfigError('eodhd', `EODHD is not configured or does not support ${symbol}.`);
  }

  const apiToken = getMarketProviderApiKey('eodhd');
  const url = buildUrl(`https://eodhd.com/api/real-time/${providerSymbol}`, {
    api_token: apiToken,
    fmt: 'json',
  });
  const response = await fetchJson<EodhdRealTimeResponse>(url);
  return mapEodhdObservation(symbol, response);
}

export async function fetchEodhdHistory(symbol: string, from?: string, to?: string): Promise<HistoricalBar[]> {
  const providerSymbol = resolveEodhdSymbol(symbol);

  if (!providerSymbol || !isLegacyProviderConfigured('eodhd')) {
    throw createMissingConfigError('eodhd', `EODHD is not configured or does not support ${symbol}.`);
  }

  const apiToken = getMarketProviderApiKey('eodhd');
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const url = buildUrl(`https://eodhd.com/api/eod/${providerSymbol}`, {
    api_token: apiToken,
    fmt: 'json',
    period: 'd',
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  });
  const response = await fetchJson<EodhdHistoricalPointResponse[]>(url);
  return mapEodhdHistory(symbol, response);
}
