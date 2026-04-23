import { getProviderEnv, requirePolygonApiKey } from '../../config';
import { createMissingConfigError } from '../errors';
import { assetMetadataSchema, marketHistoryPointSchema, marketObservationSchema } from '../schemas';
import { resolvePolygonSymbol } from '../provider-symbols';
import type { AssetMetadata, HistoricalBar, MarketQuote } from '../types';
import { buildUrl, fetchJson } from '../../shared/http-client';

type PolygonSnapshotResponse = {
  ticker?: {
    ticker?: string;
    name?: string;
    todaysChange?: number;
    todaysChangePerc?: number;
    day?: { c?: number };
    prevDay?: { c?: number };
    updated?: number;
  };
};

type PolygonAggregatesResponse = {
  results?: Array<{
    t?: number;
    o?: number;
    h?: number;
    l?: number;
    c?: number;
    v?: number;
  }>;
};

type PolygonTickerDetailsResponse = {
  results?: {
    ticker?: string;
    name?: string;
    primary_exchange?: string;
    description?: string;
    sic_description?: string;
    market_cap?: number;
    homepage_url?: string;
    locale?: string;
    branding?: {
      logo_url?: string;
    };
  };
};

export function isPolygonConfigured() {
  return Boolean(getProviderEnv().POLYGON_API_KEY);
}

export async function fetchPolygonQuote(symbol: string): Promise<MarketQuote> {
  const providerSymbol = resolvePolygonSymbol(symbol);

  if (!providerSymbol) {
    throw createMissingConfigError('polygon', `Polygon does not support symbol ${symbol}.`);
  }

  if (!isPolygonConfigured()) {
    throw createMissingConfigError('polygon', 'Polygon is not configured.');
  }

  const apiKey = requirePolygonApiKey();
  const url = buildUrl(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${providerSymbol}`, {
    apikey: apiKey,
  });
  const response = await fetchJson<PolygonSnapshotResponse>(url);
  const ticker = response.ticker;
  const price = ticker?.day?.c ?? null;

  if (!ticker || price === null || price === undefined) {
    throw new Error(`Polygon returned no quote for ${symbol}.`);
  }

  const previousClose = ticker.prevDay?.c;
  const observation = marketObservationSchema.parse({
    symbol,
    assetKind: 'stock',
    price,
    timestamp: new Date(ticker.updated ?? Date.now()).toISOString(),
    source: 'polygon',
    currency: 'USD',
    ...(typeof ticker.todaysChange === 'number' ? { change: ticker.todaysChange } : {}),
    ...(typeof ticker.todaysChangePerc === 'number' ? { changePercent: ticker.todaysChangePerc } : {}),
    ...(previousClose !== undefined ? { previousClose } : {}),
  });

  return observation;
}

export async function fetchPolygonHistory(symbol: string, from?: string, to?: string): Promise<HistoricalBar[]> {
  const providerSymbol = resolvePolygonSymbol(symbol);

  if (!providerSymbol) {
    throw createMissingConfigError('polygon', `Polygon does not support symbol ${symbol}.`);
  }

  if (!isPolygonConfigured()) {
    throw createMissingConfigError('polygon', 'Polygon is not configured.');
  }

  const apiKey = requirePolygonApiKey();
  const start = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to) : new Date();
  const url = buildUrl(
    `https://api.polygon.io/v2/aggs/ticker/${providerSymbol}/range/1/day/${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`,
    {
      adjusted: 'true',
      sort: 'asc',
      limit: 5000,
      apikey: apiKey,
    },
  );
  const response = await fetchJson<PolygonAggregatesResponse>(url);

  return (response.results ?? []).flatMap((bar) => {
    if (
      typeof bar.t !== 'number' ||
      typeof bar.o !== 'number' ||
      typeof bar.h !== 'number' ||
      typeof bar.l !== 'number' ||
      typeof bar.c !== 'number'
    ) {
      return [];
    }

    return [
      marketHistoryPointSchema.parse({
        symbol,
        assetKind: 'stock',
        timestamp: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        ...(typeof bar.v === 'number' ? { volume: bar.v } : {}),
        source: 'polygon',
      }),
    ];
  });
}

export async function fetchPolygonMetadata(symbol: string): Promise<AssetMetadata> {
  const providerSymbol = resolvePolygonSymbol(symbol);

  if (!providerSymbol) {
    throw createMissingConfigError('polygon', `Polygon does not support metadata for ${symbol}.`);
  }

  if (!isPolygonConfigured()) {
    throw createMissingConfigError('polygon', 'Polygon is not configured.');
  }

  const apiKey = requirePolygonApiKey();
  const url = buildUrl(`https://api.polygon.io/v3/reference/tickers/${providerSymbol}`, {
    apikey: apiKey,
  });
  const response = await fetchJson<PolygonTickerDetailsResponse>(url);
  const result = response.results;

  if (!result?.ticker || !result.name) {
    throw new Error(`Polygon returned no metadata for ${symbol}.`);
  }

  return assetMetadataSchema.parse({
    symbol,
    assetKind: 'stock',
    name: result.name,
    exchange: result.primary_exchange ?? null,
    currency: 'USD',
    description: result.description ?? null,
    industry: result.sic_description ?? null,
    country: result.locale ?? null,
    website: result.homepage_url ?? null,
    logoUrl: result.branding?.logo_url ?? null,
    marketCap: typeof result.market_cap === 'number' ? result.market_cap : null,
    source: 'polygon',
    updatedAt: new Date().toISOString(),
  });
}
