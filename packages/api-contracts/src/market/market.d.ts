import { z } from 'zod';
export declare const routeStatusSchema: z.ZodEnum<{
    nominal: "nominal";
    attention: "attention";
    degraded: "degraded";
}>;
export declare const freshnessStateSchema: z.ZodEnum<{
    unavailable: "unavailable";
    stale: "stale";
    live: "live";
    delayed: "delayed";
    partial: "partial";
}>;
export declare const trendDirectionSchema: z.ZodEnum<{
    flat: "flat";
    up: "up";
    down: "down";
}>;
export declare const sentimentStateSchema: z.ZodEnum<{
    positive: "positive";
    negative: "negative";
    neutral: "neutral";
}>;
export declare const tickerItemSchema: z.ZodObject<{
    symbol: z.ZodString;
    label: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
        fx: "fx";
        index: "index";
    }>;
    price: z.ZodNullable<z.ZodNumber>;
    change: z.ZodNullable<z.ZodNumber>;
    changePercent: z.ZodNullable<z.ZodNumber>;
    direction: z.ZodEnum<{
        flat: "flat";
        up: "up";
        down: "down";
    }>;
    freshnessState: z.ZodEnum<{
        unavailable: "unavailable";
        stale: "stale";
        live: "live";
        delayed: "delayed";
        partial: "partial";
    }>;
    lastUpdatedAt: z.ZodNullable<z.ZodString>;
    source: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const marketTickerSchema: z.ZodObject<{
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
    lastUpdatedAt: z.ZodNullable<z.ZodString>;
    sourceSummary: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        label: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
            fx: "fx";
            index: "index";
        }>;
        price: z.ZodNullable<z.ZodNumber>;
        change: z.ZodNullable<z.ZodNumber>;
        changePercent: z.ZodNullable<z.ZodNumber>;
        direction: z.ZodEnum<{
            flat: "flat";
            up: "up";
            down: "down";
        }>;
        freshnessState: z.ZodEnum<{
            unavailable: "unavailable";
            stale: "stale";
            live: "live";
            delayed: "delayed";
            partial: "partial";
        }>;
        lastUpdatedAt: z.ZodNullable<z.ZodString>;
        source: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type TickerItem = z.infer<typeof tickerItemSchema>;
export type MarketTicker = z.infer<typeof marketTickerSchema>;
export type FreshnessState = z.infer<typeof freshnessStateSchema>;
export type RouteStatus = z.infer<typeof routeStatusSchema>;
export type TrendDirection = z.infer<typeof trendDirectionSchema>;
export type SentimentState = z.infer<typeof sentimentStateSchema>;
//# sourceMappingURL=market.d.ts.map