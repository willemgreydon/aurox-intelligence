import { z } from 'zod';
export const routeStatusSchema = z.enum(['nominal', 'attention', 'degraded']);
export const freshnessStateSchema = z.enum(['live', 'delayed', 'stale', 'partial', 'unavailable']);
export const trendDirectionSchema = z.enum(['up', 'down', 'flat']);
export const sentimentStateSchema = z.enum(['positive', 'negative', 'neutral']);
export const tickerItemSchema = z.object({
    symbol: z.string(),
    label: z.string(),
    assetClass: z.enum(['stock', 'etf', 'crypto', 'fx', 'index']),
    price: z.number().nullable(),
    change: z.number().nullable(),
    changePercent: z.number().nullable(),
    direction: trendDirectionSchema,
    freshnessState: freshnessStateSchema,
    lastUpdatedAt: z.string().nullable(),
    source: z.string().nullable(),
});
export const marketTickerSchema = z.object({
    title: z.string(),
    status: routeStatusSchema,
    freshnessState: freshnessStateSchema,
    lastUpdatedAt: z.string().nullable(),
    sourceSummary: z.string(),
    items: z.array(tickerItemSchema),
    emptyStateMessage: z.string().nullable(),
});
