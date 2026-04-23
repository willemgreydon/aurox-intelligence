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
