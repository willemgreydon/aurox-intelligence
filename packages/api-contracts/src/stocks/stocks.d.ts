import { z } from 'zod';
export declare const stocksOverviewMetricSchema: z.ZodObject<{
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
export declare const stockWatchlistItemSchema: z.ZodObject<{
    symbol: z.ZodString;
    name: z.ZodString;
    price: z.ZodNullable<z.ZodNumber>;
    change: z.ZodNullable<z.ZodNumber>;
    changePercent: z.ZodNullable<z.ZodNumber>;
    freshness: z.ZodNullable<z.ZodString>;
    source: z.ZodString;
    forecastBias: z.ZodNullable<z.ZodEnum<{
        neutral: "neutral";
        bullish: "bullish";
        bearish: "bearish";
    }>>;
}, z.core.$strip>;
export declare const stocksOverviewSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
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
    lastUpdated: z.ZodNullable<z.ZodString>;
    freshnessSummary: z.ZodString;
    sourceSummary: z.ZodString;
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
    marketSnapshot: z.ZodObject<{
        advancers: z.ZodNumber;
        decliners: z.ZodNumber;
        unchanged: z.ZodNumber;
        averageMovePercent: z.ZodNullable<z.ZodNumber>;
        strongestSymbol: z.ZodNullable<z.ZodString>;
        weakestSymbol: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    trackedStocks: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        name: z.ZodString;
        price: z.ZodNullable<z.ZodNumber>;
        change: z.ZodNullable<z.ZodNumber>;
        changePercent: z.ZodNullable<z.ZodNumber>;
        freshness: z.ZodNullable<z.ZodString>;
        source: z.ZodString;
        forecastBias: z.ZodNullable<z.ZodEnum<{
            neutral: "neutral";
            bullish: "bullish";
            bearish: "bearish";
        }>>;
    }, z.core.$strip>>;
    topMovers: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        name: z.ZodString;
        price: z.ZodNullable<z.ZodNumber>;
        change: z.ZodNullable<z.ZodNumber>;
        changePercent: z.ZodNullable<z.ZodNumber>;
        freshness: z.ZodNullable<z.ZodString>;
        source: z.ZodString;
        forecastBias: z.ZodNullable<z.ZodEnum<{
            neutral: "neutral";
            bullish: "bullish";
            bearish: "bearish";
        }>>;
    }, z.core.$strip>>;
    sectorViews: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodNullable<z.ZodNumber>;
        symbols: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    forecastPreview: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        directionalBias: z.ZodEnum<{
            neutral: "neutral";
            bullish: "bullish";
            bearish: "bearish";
        }>;
        confidence: z.ZodNumber;
        summary: z.ZodString;
    }, z.core.$strip>>;
    latestInsight: z.ZodNullable<z.ZodObject<{
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
    insights: z.ZodArray<z.ZodString>;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const stockDetailPreviewSchema: z.ZodObject<{
    symbol: z.ZodString;
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
export type StocksOverview = z.infer<typeof stocksOverviewSchema>;
export type StockDetailPreview = z.infer<typeof stockDetailPreviewSchema>;
//# sourceMappingURL=stocks.d.ts.map