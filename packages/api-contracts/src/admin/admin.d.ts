import { z } from 'zod';
export declare const adminProviderStatusSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    configured: z.ZodBoolean;
    detail: z.ZodString;
    lastChecked: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const adminPipelineStatusSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    summary: z.ZodString;
    lastUpdated: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const adminWarningSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    detail: z.ZodString;
    severity: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
}, z.core.$strip>;
export declare const adminMonitoringSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    lastUpdated: z.ZodNullable<z.ZodString>;
    freshnessSummary: z.ZodString;
    providers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        status: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
        configured: z.ZodBoolean;
        detail: z.ZodString;
        lastChecked: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    pipelines: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        status: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
        summary: z.ZodString;
        lastUpdated: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    warnings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        detail: z.ZodString;
        severity: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
    }, z.core.$strip>>;
    notes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const monitoredProviderConfigSchema: z.ZodObject<{
    id: z.ZodString;
    providerKey: z.ZodString;
    providerName: z.ZodString;
    category: z.ZodEnum<{
        MARKET_DATA: "MARKET_DATA";
        NEWS: "NEWS";
        MACRO: "MACRO";
        AI: "AI";
        BROKER: "BROKER";
        DATABASE: "DATABASE";
        OBSERVABILITY: "OBSERVABILITY";
    }>;
    enabled: z.ZodBoolean;
    monitorHealth: z.ZodBoolean;
    monitorLatency: z.ZodBoolean;
    monitorQuota: z.ZodBoolean;
    monitorErrors: z.ZodBoolean;
    displayInDashboard: z.ZodBoolean;
    alertThresholdMs: z.ZodOptional<z.ZodNumber>;
    failureThreshold: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type AdminMonitoring = z.infer<typeof adminMonitoringSchema>;
export type MonitoredProviderConfig = z.infer<typeof monitoredProviderConfigSchema>;
//# sourceMappingURL=admin.d.ts.map