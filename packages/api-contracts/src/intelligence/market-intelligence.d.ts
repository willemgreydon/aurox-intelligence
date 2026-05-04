import { z } from 'zod';
export declare const insightFactorSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    value: z.ZodString;
    impact: z.ZodEnum<{
        positive: "positive";
        negative: "negative";
        neutral: "neutral";
    }>;
    confidence: z.ZodNumber;
}, z.core.$strip>;
export declare const riskFlagSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    severity: z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>;
    detail: z.ZodString;
}, z.core.$strip>;
export declare const insightProvenanceSchema: z.ZodObject<{
    generatedAt: z.ZodString;
    modelMode: z.ZodEnum<{
        heuristic: "heuristic";
        llm: "llm";
    }>;
    sourceSummary: z.ZodString;
    freshnessState: z.ZodEnum<{
        unavailable: "unavailable";
        stale: "stale";
        live: "live";
        delayed: "delayed";
        partial: "partial";
    }>;
    supportingSources: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const marketInsightSummarySchema: z.ZodObject<{
    assetId: z.ZodString;
    symbol: z.ZodString;
    headline: z.ZodString;
    summary: z.ZodString;
    stance: z.ZodEnum<{
        positive: "positive";
        negative: "negative";
        neutral: "neutral";
    }>;
    confidence: z.ZodNumber;
    whatChanged: z.ZodString;
    factors: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        value: z.ZodString;
        impact: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
            neutral: "neutral";
        }>;
        confidence: z.ZodNumber;
    }, z.core.$strip>>;
    riskFlags: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        severity: z.ZodEnum<{
            high: "high";
            low: "low";
            medium: "medium";
        }>;
        detail: z.ZodString;
    }, z.core.$strip>>;
    provenance: z.ZodObject<{
        generatedAt: z.ZodString;
        modelMode: z.ZodEnum<{
            heuristic: "heuristic";
            llm: "llm";
        }>;
        sourceSummary: z.ZodString;
        freshnessState: z.ZodEnum<{
            unavailable: "unavailable";
            stale: "stale";
            live: "live";
            delayed: "delayed";
            partial: "partial";
        }>;
        supportingSources: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const marketIntelligenceDigestSchema: z.ZodObject<{
    title: z.ZodString;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    freshnessState: z.ZodEnum<{
        unavailable: "unavailable";
        stale: "stale";
        live: "live";
        delayed: "delayed";
        partial: "partial";
    }>;
    generatedAt: z.ZodNullable<z.ZodString>;
    summary: z.ZodString;
    marketPulse: z.ZodString;
    assetInsights: z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        symbol: z.ZodString;
        headline: z.ZodString;
        summary: z.ZodString;
        stance: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
            neutral: "neutral";
        }>;
        confidence: z.ZodNumber;
        whatChanged: z.ZodString;
        factors: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            value: z.ZodString;
            impact: z.ZodEnum<{
                positive: "positive";
                negative: "negative";
                neutral: "neutral";
            }>;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
        riskFlags: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            severity: z.ZodEnum<{
                high: "high";
                low: "low";
                medium: "medium";
            }>;
            detail: z.ZodString;
        }, z.core.$strip>>;
        provenance: z.ZodObject<{
            generatedAt: z.ZodString;
            modelMode: z.ZodEnum<{
                heuristic: "heuristic";
                llm: "llm";
            }>;
            sourceSummary: z.ZodString;
            freshnessState: z.ZodEnum<{
                unavailable: "unavailable";
                stale: "stale";
                live: "live";
                delayed: "delayed";
                partial: "partial";
            }>;
            supportingSources: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type InsightFactor = z.infer<typeof insightFactorSchema>;
export type RiskFlag = z.infer<typeof riskFlagSchema>;
export type InsightProvenance = z.infer<typeof insightProvenanceSchema>;
export type MarketInsightSummary = z.infer<typeof marketInsightSummarySchema>;
export type MarketIntelligenceDigest = z.infer<typeof marketIntelligenceDigestSchema>;
//# sourceMappingURL=market-intelligence.d.ts.map