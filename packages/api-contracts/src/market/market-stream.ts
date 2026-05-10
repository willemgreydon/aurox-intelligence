import { z } from 'zod';

export const marketStreamAssetClassSchema = z.enum(['stock', 'etf', 'crypto', 'fx', 'index']);

export const marketTickSchema = z.object({
  provider: z.string().min(1),
  symbol: z.string().min(1),
  normalizedSymbol: z.string().min(1),
  assetClass: marketStreamAssetClassSchema,
  price: z.number(),
  bid: z.number().nullable(),
  ask: z.number().nullable(),
  bidSize: z.number().nullable(),
  askSize: z.number().nullable(),
  volume24h: z.number().nullable(),
  change24h: z.number().nullable(),
  eventTime: z.string(),
  receivedAt: z.string(),
  latencyMs: z.number().int().min(0).nullable(),
  raw: z.unknown(),
});

export const tradeEventSideSchema = z.enum(['buy', 'sell', 'unknown']);
export const tradeEventSchema = z.object({
  provider: z.string().min(1),
  symbol: z.string().min(1),
  normalizedSymbol: z.string().min(1),
  assetClass: marketStreamAssetClassSchema,
  tradeId: z.string().min(1),
  price: z.number(),
  size: z.number(),
  side: tradeEventSideSchema,
  eventTime: z.string(),
  receivedAt: z.string(),
  raw: z.unknown(),
});

export const orderBookLevelSchema = z.object({
  price: z.number(),
  size: z.number(),
});
export const orderBookUpdateSchema = z.object({
  provider: z.string().min(1),
  symbol: z.string().min(1),
  normalizedSymbol: z.string().min(1),
  assetClass: marketStreamAssetClassSchema,
  bids: z.array(orderBookLevelSchema),
  asks: z.array(orderBookLevelSchema),
  sequence: z.union([z.string(), z.number()]).nullable(),
  eventTime: z.string(),
  receivedAt: z.string(),
  raw: z.unknown(),
});

export const fundingRateEventSchema = z.object({
  provider: z.string().min(1),
  symbol: z.string().min(1),
  normalizedSymbol: z.string().min(1),
  fundingRate: z.number(),
  predictedFundingRate: z.number().nullable(),
  fundingTime: z.string(),
  eventTime: z.string(),
  receivedAt: z.string(),
  raw: z.unknown(),
});

export const liquidationEventSchema = z.object({
  provider: z.string().min(1),
  symbol: z.string().min(1),
  normalizedSymbol: z.string().min(1),
  side: tradeEventSideSchema,
  price: z.number(),
  size: z.number(),
  eventTime: z.string(),
  receivedAt: z.string(),
  raw: z.unknown(),
});

export type MarketStreamAssetClass = z.infer<typeof marketStreamAssetClassSchema>;
export type MarketTick = z.infer<typeof marketTickSchema>;
export type TradeEvent = z.infer<typeof tradeEventSchema>;
export type OrderBookLevel = z.infer<typeof orderBookLevelSchema>;
export type OrderBookUpdate = z.infer<typeof orderBookUpdateSchema>;
export type FundingRateEvent = z.infer<typeof fundingRateEventSchema>;
export type LiquidationEvent = z.infer<typeof liquidationEventSchema>;
