import { getProviderEnv, requireTwelveDataApiKey } from '../../config';
import { buildUrl, fetchJson } from '../../shared/http-client';
import { createMissingConfigError } from '../errors';
import { marketHistoryPointSchema, marketObservationSchema } from '../schemas';
import { detectAssetKind } from '../routing';
import { resolveTwelveDataSymbol } from '../provider-symbols';
import type { HistoricalBar, MarketQuote } from '../types';

type TwelveDataQuoteResponse = {
  symbol?: string;
  close?: string;
  previous_close?: string;
  percent_change?: string;
  timestamp?: number | string;
};

type TwelveDataTimeSeriesResponse = {
  values?: Array<{
    datetime?: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
    volume?: string;
  }>;
  status?: string;
};

export function isTwelveDataConfigured() {
  return Boolean(getProviderEnv().TWELVE_DATA_API_KEY);
}

function toNumber(value: string | number | undefined | null) {
  const parsed = Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchTwelveDataQuote(symbol: string): Promise<MarketQuote> {
  const providerSymbol = resolveTwelveDataSymbol(symbol);

  if (!providerSymbol) {
    throw createMissingConfigError('twelve-data', `Twelve Data does not support symbol ${symbol}.`);
  }

  if (!isTwelveDataConfigured()) {
    throw createMissingConfigError('twelve-data', 'Twelve Data is not configured.');
  }

  const apiKey = requireTwelveDataApiKey();
  const url = buildUrl('https://api.twelvedata.com/quote', {
    symbol: providerSymbol,
    apikey: apiKey,
  });
  const response = await fetchJson<TwelveDataQuoteResponse>(url);
  const price = toNumber(response.close);

  if (price === null) {
    throw new Error(`Twelve Data returned no quote for ${symbol}.`);
  }

  const previousClose = toNumber(response.previous_close);
  const changePercent = toNumber(response.percent_change);

  return marketObservationSchema.parse({
    symbol,
    assetKind: detectAssetKind(symbol),
    price,
    timestamp: response.timestamp ? new Date(Number(response.timestamp) * 1000).toISOString() : new Date().toISOString(),
    source: 'twelve-data',
    currency: 'USD',
    ...(previousClose !== null ? { change: price - previousClose, previousClose } : {}),
    ...(changePercent !== null ? { changePercent } : {}),
  });
}

export async function fetchTwelveDataHistory(symbol: string, from?: string, to?: string): Promise<HistoricalBar[]> {
  const providerSymbol = resolveTwelveDataSymbol(symbol);

  if (!providerSymbol) {
    throw createMissingConfigError('twelve-data', `Twelve Data does not support symbol ${symbol}.`);
  }

  if (!isTwelveDataConfigured()) {
    throw createMissingConfigError('twelve-data', 'Twelve Data is not configured.');
  }

  const apiKey = requireTwelveDataApiKey();
  const start = from ? new Date(from).toISOString().slice(0, 10) : undefined;
  const end = to ? new Date(to).toISOString().slice(0, 10) : undefined;
  const url = buildUrl('https://api.twelvedata.com/time_series', {
    symbol: providerSymbol,
    interval: '1day',
    start_date: start,
    end_date: end,
    outputsize: 5000,
    timezone: 'UTC',
    apikey: apiKey,
  });
  const response = await fetchJson<TwelveDataTimeSeriesResponse>(url);

  return (response.values ?? [])
    .flatMap((bar) => {
      const open = toNumber(bar.open);
      const high = toNumber(bar.high);
      const low = toNumber(bar.low);
      const close = toNumber(bar.close);
      const volume = toNumber(bar.volume);

      if (!bar.datetime || open === null || high === null || low === null || close === null) {
        return [];
      }

      return [
        marketHistoryPointSchema.parse({
          symbol,
          assetKind: detectAssetKind(symbol),
          timestamp: new Date(bar.datetime.includes('T') ? bar.datetime : `${bar.datetime}T00:00:00Z`).toISOString(),
          open,
          high,
          low,
          close,
          ...(volume !== null ? { volume } : {}),
          source: 'twelve-data',
        }),
      ];
    })
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}
