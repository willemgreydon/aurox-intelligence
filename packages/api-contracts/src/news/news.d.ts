import { z } from 'zod';
export declare const newsProviderHealthSchema: z.ZodEnum<{
    unavailable: "unavailable";
    degraded: "degraded";
    healthy: "healthy";
    disabled: "disabled";
}>;
export declare const newsRiskFlagSchema: z.ZodEnum<{
    LOW: "LOW";
    MEDIUM: "MEDIUM";
    HIGH: "HIGH";
    CRITICAL: "CRITICAL";
}>;
export declare const newsItemSchema: z.ZodObject<{
    id: z.ZodString;
    symbol: z.ZodString;
    assetId: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    summary: z.ZodString;
    url: z.ZodString;
    source: z.ZodString;
    publishedAt: z.ZodString;
    provider: z.ZodString;
    language: z.ZodString;
    sentimentScore: z.ZodOptional<z.ZodNumber>;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
    impactScore: z.ZodOptional<z.ZodNumber>;
    categories: z.ZodArray<z.ZodString>;
    tickers: z.ZodArray<z.ZodString>;
    raw: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const newsProviderStatusSchema: z.ZodObject<{
    provider: z.ZodString;
    health: z.ZodEnum<{
        unavailable: "unavailable";
        degraded: "degraded";
        healthy: "healthy";
        disabled: "disabled";
    }>;
    detail: z.ZodString;
    latencyMs: z.ZodNullable<z.ZodNumber>;
    lastCheckedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const newsStreamResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        symbol: z.ZodString;
        assetId: z.ZodOptional<z.ZodString>;
        companyName: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        summary: z.ZodString;
        url: z.ZodString;
        source: z.ZodString;
        publishedAt: z.ZodString;
        provider: z.ZodString;
        language: z.ZodString;
        sentimentScore: z.ZodOptional<z.ZodNumber>;
        relevanceScore: z.ZodOptional<z.ZodNumber>;
        impactScore: z.ZodOptional<z.ZodNumber>;
        categories: z.ZodArray<z.ZodString>;
        tickers: z.ZodArray<z.ZodString>;
        raw: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>>;
    providerHealth: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        health: z.ZodEnum<{
            unavailable: "unavailable";
            degraded: "degraded";
            healthy: "healthy";
            disabled: "disabled";
        }>;
        detail: z.ZodString;
        latencyMs: z.ZodNullable<z.ZodNumber>;
        lastCheckedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    updatedAt: z.ZodString;
    degraded: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const newsImpactExplanationSchema: z.ZodObject<{
    symbol: z.ZodString;
    score: z.ZodNumber;
    riskFlag: z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>;
    keyDrivers: z.ZodArray<z.ZodString>;
    positiveSignals: z.ZodArray<z.ZodString>;
    negativeSignals: z.ZodArray<z.ZodString>;
    uncertaintyNotes: z.ZodArray<z.ZodString>;
    sourceCount: z.ZodNumber;
    latestPublishedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type NewsProviderHealth = z.infer<typeof newsProviderHealthSchema>;
export type NewsProviderStatus = z.infer<typeof newsProviderStatusSchema>;
export type NewsStreamResponse = z.infer<typeof newsStreamResponseSchema>;
export type NewsRiskFlag = z.infer<typeof newsRiskFlagSchema>;
export type NewsImpactExplanation = z.infer<typeof newsImpactExplanationSchema>;
//# sourceMappingURL=news.d.ts.map