import { z } from 'zod';
export declare const dashboardStatusSchema: z.ZodEnum<{
    nominal: "nominal";
    attention: "attention";
    degraded: "degraded";
}>;
export declare const dashboardMetricToneSchema: z.ZodEnum<{
    positive: "positive";
    negative: "negative";
    neutral: "neutral";
    warning: "warning";
}>;
export declare const dashboardCallToActionSchema: z.ZodObject<{
    label: z.ZodString;
    href: z.ZodString;
}, z.core.$strip>;
export declare const dashboardOverviewSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    overallStatus: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    lastUpdated: z.ZodNullable<z.ZodString>;
    freshnessSummary: z.ZodString;
    callToActions: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const dashboardMetricSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    value: z.ZodString;
    context: z.ZodString;
    tone: z.ZodEnum<{
        positive: "positive";
        negative: "negative";
        neutral: "neutral";
        warning: "warning";
    }>;
}, z.core.$strip>;
export declare const dashboardForecastPreviewSchema: z.ZodObject<{
    assetId: z.ZodString;
    symbol: z.ZodString;
    assetName: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        fx: "fx";
    }>;
    horizon: z.ZodEnum<{
        short: "short";
        medium: "medium";
        long: "long";
    }>;
    directionalBias: z.ZodEnum<{
        neutral: "neutral";
        bullish: "bullish";
        bearish: "bearish";
    }>;
    confidenceLabel: z.ZodString;
    producedAt: z.ZodNullable<z.ZodString>;
    keyDriverSummary: z.ZodString;
    riskSummary: z.ZodString;
}, z.core.$strip>;
export declare const dashboardForecastSectionSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        symbol: z.ZodString;
        assetName: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            fx: "fx";
        }>;
        horizon: z.ZodEnum<{
            short: "short";
            medium: "medium";
            long: "long";
        }>;
        directionalBias: z.ZodEnum<{
            neutral: "neutral";
            bullish: "bullish";
            bearish: "bearish";
        }>;
        confidenceLabel: z.ZodString;
        producedAt: z.ZodNullable<z.ZodString>;
        keyDriverSummary: z.ZodString;
        riskSummary: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const dashboardModuleSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    href: z.ZodString;
    ownerArea: z.ZodEnum<{
        markets: "markets";
        analytics: "analytics";
        operations: "operations";
    }>;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
}, z.core.$strip>;
export declare const dashboardMethodologyStepSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    boundary: z.ZodString;
}, z.core.$strip>;
export declare const dashboardSystemStatusSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    summary: z.ZodString;
    detail: z.ZodString;
    lastUpdated: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const dashboardSnapshotSchema: z.ZodObject<{
    overview: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        overallStatus: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
        lastUpdated: z.ZodNullable<z.ZodString>;
        freshnessSummary: z.ZodString;
        callToActions: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            href: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    metrics: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodString;
        context: z.ZodString;
        tone: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
            neutral: "neutral";
            warning: "warning";
        }>;
    }, z.core.$strip>>;
    forecastOverview: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            assetId: z.ZodString;
            symbol: z.ZodString;
            assetName: z.ZodString;
            assetClass: z.ZodEnum<{
                stock: "stock";
                fx: "fx";
            }>;
            horizon: z.ZodEnum<{
                short: "short";
                medium: "medium";
                long: "long";
            }>;
            directionalBias: z.ZodEnum<{
                neutral: "neutral";
                bullish: "bullish";
                bearish: "bearish";
            }>;
            confidenceLabel: z.ZodString;
            producedAt: z.ZodNullable<z.ZodString>;
            keyDriverSummary: z.ZodString;
            riskSummary: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    modules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        href: z.ZodString;
        ownerArea: z.ZodEnum<{
            markets: "markets";
            analytics: "analytics";
            operations: "operations";
        }>;
        status: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
    }, z.core.$strip>>;
    methodology: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        boundary: z.ZodString;
    }, z.core.$strip>>;
    systemStatuses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        status: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
        summary: z.ZodString;
        detail: z.ZodString;
        lastUpdated: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    readinessNotes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type DashboardStatus = z.infer<typeof dashboardStatusSchema>;
export type DashboardMetricTone = z.infer<typeof dashboardMetricToneSchema>;
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
export type DashboardForecastPreview = z.infer<typeof dashboardForecastPreviewSchema>;
export type DashboardModule = z.infer<typeof dashboardModuleSchema>;
export type DashboardSystemStatus = z.infer<typeof dashboardSystemStatusSchema>;
//# sourceMappingURL=dashboard.d.ts.map