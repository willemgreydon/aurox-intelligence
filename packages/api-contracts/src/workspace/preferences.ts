import { z } from 'zod';

export const localeSchema = z.enum(['en', 'de', 'fr']);
export const chartTypeSchema = z.enum(['bar', 'donut', 'comparison', 'trend', 'stock']);
export const timePeriodSchema = z.enum(['1s', '3s', '5s', '10s', '1m', '1h', '1d', '1w', '1mo', '1y', '2y', '5y']);
export const dashboardModuleIdSchema = z.enum([
  'market-overview',
  'broker-tools',
  'system-observation',
  'watchlist',
  'forecast-analysis',
]);
export const brokerModeSchema = z.enum([
  'manual_stock_lane',
  'manual_multi_asset_lane',
  'ai_copilot_lane',
  'signal_follow_lane',
  'agent_sandbox_lane',
]);
export const brokerAssetScopeSchema = z.enum(['stock', 'etf', 'crypto', 'multi-asset']);

export const chartControlsSchema = z.object({
  chartType: chartTypeSchema,
  timePeriod: timePeriodSchema,
  availableChartTypes: z.array(chartTypeSchema),
  availableTimePeriods: z.array(timePeriodSchema),
});

export const normalizedChartPointSchema = z.object({
  label: z.string(),
  timestamp: z.string().nullable().optional(),
  value: z.number(),
  secondaryValue: z.number().nullable().optional(),
  tertiaryValue: z.number().nullable().optional(),
  lowerBound: z.number().nullable().optional(),
  upperBound: z.number().nullable().optional(),
  tone: z.enum(['positive', 'negative', 'neutral', 'warning']).nullable().optional(),
});

export const normalizedChartSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  chartType: chartTypeSchema,
  timePeriod: timePeriodSchema,
  points: z.array(normalizedChartPointSchema),
  emptyStateMessage: z.string().nullable(),
});

export const dashboardPresetSchema = z.object({
  locale: localeSchema,
  defaultChartType: chartTypeSchema,
  defaultTimePeriod: timePeriodSchema,
  trackedSymbols: z.array(z.string()),
  visibleModules: z.array(dashboardModuleIdSchema),
  simulationPreferences: z.object({
    preferredBrokerMode: brokerModeSchema,
    brokerModeCapitalLimitUsd: z.number().int().nonnegative(),
    microTradeAllocationPercent: z.number().min(0).max(100),
    defaultAssetScope: brokerAssetScopeSchema,
  }),
  activityPreferences: z.object({
    orderActivityDigest: z.boolean(),
    laneStatusAlerts: z.boolean(),
  }),
});

export const watchlistItemSchema = z.object({
  assetId: z.string(),
  symbol: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'fx']),
  addedAt: z.string(),
});

export const paymentProviderSchema = z.enum(['stripe', 'paypal', 'bank-balance']);
export const checkoutSessionStatusSchema = z.enum(['pending', 'ready', 'completed', 'cancelled']);

export const checkoutSessionStateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: paymentProviderSchema,
  purpose: z.enum(['portfolio-funding', 'subscription', 'trade-simulation']),
  assetSymbol: z.string().nullable(),
  amountLabel: z.string(),
  status: checkoutSessionStatusSchema,
  disclosure: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const simulatedOrderSideSchema = z.enum(['buy', 'sell']);
export const simulatedOrderStatusSchema = z.enum(['pending', 'submitted', 'filled', 'cancelled']);

export const simulatedOrderIntentSchema = z.object({
  userId: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto']),
  side: simulatedOrderSideSchema,
  quantity: z.string(),
  fundingSource: paymentProviderSchema,
  connectionState: z.enum(['sandbox', 'linked', 'manual']),
});

export const simulatedOrderSchema = simulatedOrderIntentSchema.extend({
  id: z.string(),
  status: simulatedOrderStatusSchema,
  disclosure: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Locale = z.infer<typeof localeSchema>;
export type ChartType = z.infer<typeof chartTypeSchema>;
export type TimePeriod = z.infer<typeof timePeriodSchema>;
export type DashboardModuleId = z.infer<typeof dashboardModuleIdSchema>;
export type BrokerMode = z.infer<typeof brokerModeSchema>;
export type BrokerAssetScope = z.infer<typeof brokerAssetScopeSchema>;
export type ChartControls = z.infer<typeof chartControlsSchema>;
export type NormalizedChartPoint = z.infer<typeof normalizedChartPointSchema>;
export type NormalizedChart = z.infer<typeof normalizedChartSchema>;
export type DashboardPreset = z.infer<typeof dashboardPresetSchema>;
export type WatchlistItem = z.infer<typeof watchlistItemSchema>;
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type CheckoutSessionState = z.infer<typeof checkoutSessionStateSchema>;
export type SimulatedOrderIntent = z.infer<typeof simulatedOrderIntentSchema>;
export type SimulatedOrder = z.infer<typeof simulatedOrderSchema>;
