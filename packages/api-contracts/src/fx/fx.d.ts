import { z } from 'zod';
export declare const fxMetricSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    value: z.ZodString;
    detail: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
}, z.core.$strip>;
export declare const fxPairItemSchema: z.ZodObject<{
    pair: z.ZodString;
    displayName: z.ZodString;
    price: z.ZodNullable<z.ZodNumber>;
    changePercent: z.ZodNullable<z.ZodNumber>;
    freshness: z.ZodNullable<z.ZodString>;
    source: z.ZodString;
    directionalBias: z.ZodNullable<z.ZodEnum<{
        neutral: "neutral";
        bullish: "bullish";
        bearish: "bearish";
    }>>;
}, z.core.$strip>;
export declare const fxOverviewSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    lastUpdated: z.ZodNullable<z.ZodString>;
    freshnessSummary: z.ZodString;
    metrics: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodString;
        detail: z.ZodString;
        status: z.ZodEnum<{
            nominal: "nominal";
            attention: "attention";
            degraded: "degraded";
        }>;
    }, z.core.$strip>>;
    trackedPairs: z.ZodArray<z.ZodObject<{
        pair: z.ZodString;
        displayName: z.ZodString;
        price: z.ZodNullable<z.ZodNumber>;
        changePercent: z.ZodNullable<z.ZodNumber>;
        freshness: z.ZodNullable<z.ZodString>;
        source: z.ZodString;
        directionalBias: z.ZodNullable<z.ZodEnum<{
            neutral: "neutral";
            bullish: "bullish";
            bearish: "bearish";
        }>>;
    }, z.core.$strip>>;
    strongestPairs: z.ZodArray<z.ZodObject<{
        pair: z.ZodString;
        displayName: z.ZodString;
        price: z.ZodNullable<z.ZodNumber>;
        changePercent: z.ZodNullable<z.ZodNumber>;
        freshness: z.ZodNullable<z.ZodString>;
        source: z.ZodString;
        directionalBias: z.ZodNullable<z.ZodEnum<{
            neutral: "neutral";
            bullish: "bullish";
            bearish: "bearish";
        }>>;
    }, z.core.$strip>>;
    insights: z.ZodArray<z.ZodString>;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const fxDetailPreviewSchema: z.ZodObject<{
    pair: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    lastUpdated: z.ZodNullable<z.ZodString>;
    price: z.ZodNullable<z.ZodNumber>;
    changePercent: z.ZodNullable<z.ZodNumber>;
    source: z.ZodNullable<z.ZodString>;
    historyStatus: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    historySummary: z.ZodString;
    historyWindowLabel: z.ZodString;
    history: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        timestamp: z.ZodString;
        open: z.ZodNumber;
        high: z.ZodNumber;
        low: z.ZodNumber;
        close: z.ZodNumber;
        volume: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    historyEmptyMessage: z.ZodNullable<z.ZodString>;
    notes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type FxOverview = z.infer<typeof fxOverviewSchema>;
export type FxDetailPreview = z.infer<typeof fxDetailPreviewSchema>;
//# sourceMappingURL=fx.d.ts.map