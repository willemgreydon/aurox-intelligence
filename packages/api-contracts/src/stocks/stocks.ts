import { z } from 'zod';
import { freshnessStateSchema, routeStatusSchema } from '../market/market';
import { marketInsightSummarySchema } from '../intelligence/market-intelligence';

export const stocksOverviewMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  status: routeStatusSchema,
});

export const stockWatchlistItemSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number().nullable(),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  freshness: z.string().nullable(),
  source: z.string(),
  forecastBias: z.enum(['bullish', 'bearish', 'neutral']).nullable(),
});

export const stocksOverviewSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: routeStatusSchema,
  freshnessState: freshnessStateSchema,
  lastUpdated: z.string().nullable(),
  freshnessSummary: z.string(),
  sourceSummary: z.string(),
  metrics: z.array(stocksOverviewMetricSchema),
  marketSnapshot: z.object({
    advancers: z.number().int().nonnegative(),
    decliners: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
    averageMovePercent: z.number().nullable(),
    strongestSymbol: z.string().nullable(),
    weakestSymbol: z.string().nullable(),
  }),
  trackedStocks: z.array(stockWatchlistItemSchema),
  topMovers: z.array(stockWatchlistItemSchema),
  sectorViews: z.array(
    z.object({
      label: z.string(),
      value: z.number().nullable(),
      symbols: z.array(z.string()),
    }),
  ),
  forecastPreview: z.array(
    z.object({
      symbol: z.string(),
      directionalBias: z.enum(['bullish', 'bearish', 'neutral']),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }),
  ),
  latestInsight: marketInsightSummarySchema.nullable(),
  insights: z.array(z.string()),
  emptyStateMessage: z.string().nullable(),
});

export const stockDetailPreviewSchema = z.object({
  symbol: z.string(),
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
  history: z.array(
    z.object({
      label: z.string(),
      timestamp: z.string(),
      open: z.number(),
      high: z.number(),
      low: z.number(),
      close: z.number(),
      volume: z.number().nullable(),
    }),
  ),
  historyEmptyMessage: z.string().nullable(),
  notes: z.array(z.string()),
});

export type StocksOverview = z.infer<typeof stocksOverviewSchema>;
export type StockDetailPreview = z.infer<typeof stockDetailPreviewSchema>;
