import { z } from 'zod';
const routeStatusSchema = z.enum(['nominal', 'attention', 'degraded']);
export const fxMetricSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
    detail: z.string(),
    status: routeStatusSchema,
});
export const fxPairItemSchema = z.object({
    pair: z.string(),
    displayName: z.string(),
    price: z.number().nullable(),
    changePercent: z.number().nullable(),
    freshness: z.string().nullable(),
    source: z.string(),
    directionalBias: z.enum(['bullish', 'bearish', 'neutral']).nullable(),
});
export const fxOverviewSchema = z.object({
    title: z.string(),
    description: z.string(),
    status: routeStatusSchema,
    lastUpdated: z.string().nullable(),
    freshnessSummary: z.string(),
    metrics: z.array(fxMetricSchema),
    trackedPairs: z.array(fxPairItemSchema),
    strongestPairs: z.array(fxPairItemSchema),
    insights: z.array(z.string()),
    emptyStateMessage: z.string().nullable(),
});
export const fxDetailPreviewSchema = z.object({
    pair: z.string(),
    title: z.string(),
    description: z.string(),
    status: routeStatusSchema,
    lastUpdated: z.string().nullable(),
    price: z.number().nullable(),
    changePercent: z.number().nullable(),
    source: z.string().nullable(),
    historyStatus: routeStatusSchema,
    historySummary: z.string(),
    historyWindowLabel: z.string(),
    history: z.array(z.object({
        label: z.string(),
        timestamp: z.string(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        volume: z.number().nullable(),
    })),
    historyEmptyMessage: z.string().nullable(),
    notes: z.array(z.string()),
});
