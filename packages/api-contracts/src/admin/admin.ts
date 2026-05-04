import { z } from 'zod';

const routeStatusSchema = z.enum(['nominal', 'attention', 'degraded']);

export const adminProviderStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: routeStatusSchema,
  configured: z.boolean(),
  detail: z.string(),
  lastChecked: z.string().nullable(),
});

export const adminPipelineStatusSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: routeStatusSchema,
  summary: z.string(),
  lastUpdated: z.string().nullable(),
});

export const adminWarningSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  severity: routeStatusSchema,
});

export const adminMonitoringSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: routeStatusSchema,
  lastUpdated: z.string().nullable(),
  freshnessSummary: z.string(),
  providers: z.array(adminProviderStatusSchema),
  pipelines: z.array(adminPipelineStatusSchema),
  warnings: z.array(adminWarningSchema),
  notes: z.array(z.string()),
});

export const monitoredProviderConfigSchema = z.object({
  id: z.string(),
  providerKey: z.string(),
  providerName: z.string(),
  category: z.enum(['MARKET_DATA', 'NEWS', 'MACRO', 'AI', 'BROKER', 'DATABASE', 'OBSERVABILITY']),
  enabled: z.boolean(),
  monitorHealth: z.boolean(),
  monitorLatency: z.boolean(),
  monitorQuota: z.boolean(),
  monitorErrors: z.boolean(),
  displayInDashboard: z.boolean(),
  alertThresholdMs: z.number().int().positive().optional(),
  failureThreshold: z.number().int().positive().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminMonitoring = z.infer<typeof adminMonitoringSchema>;
export type MonitoredProviderConfig = z.infer<typeof monitoredProviderConfigSchema>;
