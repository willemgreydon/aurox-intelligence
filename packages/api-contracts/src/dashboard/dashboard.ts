import { z } from 'zod';

export const dashboardStatusSchema = z.enum(['nominal', 'attention', 'degraded']);
export const dashboardMetricToneSchema = z.enum(['positive', 'neutral', 'warning', 'negative']);

export const dashboardCallToActionSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const dashboardOverviewSchema = z.object({
  title: z.string(),
  description: z.string(),
  overallStatus: dashboardStatusSchema,
  lastUpdated: z.string().nullable(),
  freshnessSummary: z.string(),
  callToActions: z.array(dashboardCallToActionSchema),
});

export const dashboardMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  context: z.string(),
  tone: dashboardMetricToneSchema,
});

export const dashboardForecastPreviewSchema = z.object({
  assetId: z.string(),
  symbol: z.string(),
  assetName: z.string(),
  assetClass: z.enum(['stock', 'fx']),
  horizon: z.enum(['short', 'medium', 'long']),
  directionalBias: z.enum(['bullish', 'bearish', 'neutral']),
  confidenceLabel: z.string(),
  producedAt: z.string().nullable(),
  keyDriverSummary: z.string(),
  riskSummary: z.string(),
});

export const dashboardForecastSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
  items: z.array(dashboardForecastPreviewSchema),
});

export const dashboardModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  href: z.string(),
  ownerArea: z.enum(['markets', 'analytics', 'operations']),
  status: dashboardStatusSchema,
});

export const dashboardMethodologyStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  boundary: z.string(),
});

export const dashboardSystemStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: dashboardStatusSchema,
  summary: z.string(),
  detail: z.string(),
  lastUpdated: z.string().nullable(),
});

export const dashboardSnapshotSchema = z.object({
  overview: dashboardOverviewSchema,
  metrics: z.array(dashboardMetricSchema),
  forecastOverview: dashboardForecastSectionSchema,
  modules: z.array(dashboardModuleSchema),
  methodology: z.array(dashboardMethodologyStepSchema),
  systemStatuses: z.array(dashboardSystemStatusSchema),
  readinessNotes: z.array(z.string()),
});

export type DashboardStatus = z.infer<typeof dashboardStatusSchema>;
export type DashboardMetricTone = z.infer<typeof dashboardMetricToneSchema>;
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
export type DashboardForecastPreview = z.infer<typeof dashboardForecastPreviewSchema>;
export type DashboardModule = z.infer<typeof dashboardModuleSchema>;
export type DashboardSystemStatus = z.infer<typeof dashboardSystemStatusSchema>;
