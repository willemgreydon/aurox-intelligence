import { z } from 'zod';

const providerSchema = z.enum(['polygon', 'twelve-data', 'tiingo', 'coingecko', 'finnhub', 'eodhd', 'binance']);
const assetKindSchema = z.enum(['stock', 'etf', 'crypto', 'fx', 'index']);

export const marketObservationSchema = z.object({
  symbol: z.string(),
  assetKind: assetKindSchema,
  price: z.number().finite(),
  timestamp: z.string(),
  source: providerSchema,
  currency: z.literal('USD'),
  change: z.number().finite().optional(),
  changePercent: z.number().finite().optional(),
  previousClose: z.number().finite().optional(),
});

export const marketHistoryPointSchema = z.object({
  symbol: z.string(),
  assetKind: assetKindSchema,
  timestamp: z.string(),
  open: z.number().finite(),
  high: z.number().finite(),
  low: z.number().finite(),
  close: z.number().finite(),
  source: providerSchema,
  volume: z.number().finite().optional(),
});

export const assetMetadataSchema = z.object({
  symbol: z.string(),
  assetKind: z.enum(['stock', 'etf', 'crypto']),
  name: z.string(),
  exchange: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  marketCap: z.number().finite().nullable().optional(),
  source: providerSchema,
  updatedAt: z.string(),
});

export const cryptoGlobalMetricsSchema = z.object({
  activeCryptocurrencies: z.number().finite().nullable(),
  markets: z.number().finite().nullable(),
  totalMarketCapUsd: z.number().finite().nullable(),
  totalVolume24hUsd: z.number().finite().nullable(),
  bitcoinDominancePercent: z.number().finite().nullable(),
  ethereumDominancePercent: z.number().finite().nullable(),
  marketCapChange24hPercent: z.number().finite().nullable(),
  source: providerSchema,
  observedAt: z.string(),
});

export const finnhubQuoteSchema = z.object({
  c: z.number(),
  d: z.number().optional(),
  dp: z.number().optional(),
  pc: z.number().optional(),
  t: z.number().int().nonnegative(),
});

export const finnhubCandleSchema = z.object({
  c: z.array(z.number()),
  h: z.array(z.number()),
  l: z.array(z.number()),
  o: z.array(z.number()),
  s: z.enum(['ok', 'no_data']),
  t: z.array(z.number().int().nonnegative()),
  v: z.array(z.number()).optional(),
});

export const eodhdRealTimeSchema = z.object({
  code: z.string().optional(),
  close: z.union([z.number(), z.string()]).optional(),
  change: z.union([z.number(), z.string()]).optional(),
  change_p: z.union([z.number(), z.string()]).optional(),
  previousClose: z.union([z.number(), z.string()]).optional(),
  timestamp: z.union([z.number(), z.string()]).optional(),
  gmtoffset: z.number().optional(),
});

export const eodhdHistoricalPointSchema = z.object({
  date: z.string().optional(),
  open: z.union([z.number(), z.string()]).optional(),
  high: z.union([z.number(), z.string()]).optional(),
  low: z.union([z.number(), z.string()]).optional(),
  close: z.union([z.number(), z.string()]).optional(),
  adjusted_close: z.union([z.number(), z.string()]).optional(),
  volume: z.union([z.number(), z.string()]).optional(),
});
