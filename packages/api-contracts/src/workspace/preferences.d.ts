import { z } from 'zod';
export declare const localeSchema: z.ZodEnum<{
    en: "en";
    de: "de";
    fr: "fr";
    es: "es";
    it: "it";
    pt: "pt";
    nl: "nl";
    zh: "zh";
    ja: "ja";
    ko: "ko";
    ar: "ar";
    hi: "hi";
}>;
export declare const chartTypeSchema: z.ZodEnum<{
    stock: "stock";
    bar: "bar";
    donut: "donut";
    comparison: "comparison";
    trend: "trend";
}>;
export declare const timePeriodSchema: z.ZodEnum<{
    "1s": "1s";
    "3s": "3s";
    "5s": "5s";
    "10s": "10s";
    "1m": "1m";
    "1h": "1h";
    "1d": "1d";
    "1w": "1w";
    "1mo": "1mo";
    "1y": "1y";
    "2y": "2y";
    "5y": "5y";
}>;
export declare const dashboardModuleIdSchema: z.ZodEnum<{
    "market-overview": "market-overview";
    "broker-tools": "broker-tools";
    "system-observation": "system-observation";
    watchlist: "watchlist";
    "forecast-analysis": "forecast-analysis";
}>;
export declare const brokerModeSchema: z.ZodEnum<{
    manual_stock_lane: "manual_stock_lane";
    manual_multi_asset_lane: "manual_multi_asset_lane";
    ai_copilot_lane: "ai_copilot_lane";
    signal_follow_lane: "signal_follow_lane";
    agent_sandbox_lane: "agent_sandbox_lane";
}>;
export declare const brokerAssetScopeSchema: z.ZodEnum<{
    stock: "stock";
    etf: "etf";
    crypto: "crypto";
    "multi-asset": "multi-asset";
}>;
export declare const chartControlsSchema: z.ZodObject<{
    chartType: z.ZodEnum<{
        stock: "stock";
        bar: "bar";
        donut: "donut";
        comparison: "comparison";
        trend: "trend";
    }>;
    timePeriod: z.ZodEnum<{
        "1s": "1s";
        "3s": "3s";
        "5s": "5s";
        "10s": "10s";
        "1m": "1m";
        "1h": "1h";
        "1d": "1d";
        "1w": "1w";
        "1mo": "1mo";
        "1y": "1y";
        "2y": "2y";
        "5y": "5y";
    }>;
    availableChartTypes: z.ZodArray<z.ZodEnum<{
        stock: "stock";
        bar: "bar";
        donut: "donut";
        comparison: "comparison";
        trend: "trend";
    }>>;
    availableTimePeriods: z.ZodArray<z.ZodEnum<{
        "1s": "1s";
        "3s": "3s";
        "5s": "5s";
        "10s": "10s";
        "1m": "1m";
        "1h": "1h";
        "1d": "1d";
        "1w": "1w";
        "1mo": "1mo";
        "1y": "1y";
        "2y": "2y";
        "5y": "5y";
    }>>;
}, z.core.$strip>;
export declare const normalizedChartPointSchema: z.ZodObject<{
    label: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    value: z.ZodNumber;
    secondaryValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tertiaryValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lowerBound: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    upperBound: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tone: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        positive: "positive";
        negative: "negative";
        neutral: "neutral";
        warning: "warning";
    }>>>;
}, z.core.$strip>;
export declare const normalizedChartSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    summary: z.ZodString;
    chartType: z.ZodEnum<{
        stock: "stock";
        bar: "bar";
        donut: "donut";
        comparison: "comparison";
        trend: "trend";
    }>;
    timePeriod: z.ZodEnum<{
        "1s": "1s";
        "3s": "3s";
        "5s": "5s";
        "10s": "10s";
        "1m": "1m";
        "1h": "1h";
        "1d": "1d";
        "1w": "1w";
        "1mo": "1mo";
        "1y": "1y";
        "2y": "2y";
        "5y": "5y";
    }>;
    points: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        value: z.ZodNumber;
        secondaryValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        tertiaryValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lowerBound: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        upperBound: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        tone: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
            positive: "positive";
            negative: "negative";
            neutral: "neutral";
            warning: "warning";
        }>>>;
    }, z.core.$strip>>;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const dashboardPresetSchema: z.ZodObject<{
    locale: z.ZodEnum<{
        en: "en";
        de: "de";
        fr: "fr";
        es: "es";
        it: "it";
        pt: "pt";
        nl: "nl";
        zh: "zh";
        ja: "ja";
        ko: "ko";
        ar: "ar";
        hi: "hi";
    }>;
    defaultChartType: z.ZodEnum<{
        stock: "stock";
        bar: "bar";
        donut: "donut";
        comparison: "comparison";
        trend: "trend";
    }>;
    defaultTimePeriod: z.ZodEnum<{
        "1s": "1s";
        "3s": "3s";
        "5s": "5s";
        "10s": "10s";
        "1m": "1m";
        "1h": "1h";
        "1d": "1d";
        "1w": "1w";
        "1mo": "1mo";
        "1y": "1y";
        "2y": "2y";
        "5y": "5y";
    }>;
    trackedSymbols: z.ZodArray<z.ZodString>;
    visibleModules: z.ZodArray<z.ZodEnum<{
        "market-overview": "market-overview";
        "broker-tools": "broker-tools";
        "system-observation": "system-observation";
        watchlist: "watchlist";
        "forecast-analysis": "forecast-analysis";
    }>>;
    simulationPreferences: z.ZodObject<{
        preferredBrokerMode: z.ZodEnum<{
            manual_stock_lane: "manual_stock_lane";
            manual_multi_asset_lane: "manual_multi_asset_lane";
            ai_copilot_lane: "ai_copilot_lane";
            signal_follow_lane: "signal_follow_lane";
            agent_sandbox_lane: "agent_sandbox_lane";
        }>;
        brokerModeCapitalLimitUsd: z.ZodNumber;
        microTradeAllocationPercent: z.ZodNumber;
        defaultAssetScope: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
            "multi-asset": "multi-asset";
        }>;
    }, z.core.$strip>;
    activityPreferences: z.ZodObject<{
        orderActivityDigest: z.ZodBoolean;
        laneStatusAlerts: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const watchlistItemSchema: z.ZodObject<{
    assetId: z.ZodString;
    symbol: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
        fx: "fx";
    }>;
    addedAt: z.ZodString;
}, z.core.$strip>;
export declare const paymentProviderSchema: z.ZodEnum<{
    stripe: "stripe";
    paypal: "paypal";
    "bank-balance": "bank-balance";
}>;
export declare const checkoutSessionStatusSchema: z.ZodEnum<{
    pending: "pending";
    ready: "ready";
    completed: "completed";
    cancelled: "cancelled";
}>;
export declare const checkoutSessionStateSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    provider: z.ZodEnum<{
        stripe: "stripe";
        paypal: "paypal";
        "bank-balance": "bank-balance";
    }>;
    purpose: z.ZodEnum<{
        "portfolio-funding": "portfolio-funding";
        subscription: "subscription";
        "trade-simulation": "trade-simulation";
    }>;
    assetSymbol: z.ZodNullable<z.ZodString>;
    amountLabel: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        ready: "ready";
        completed: "completed";
        cancelled: "cancelled";
    }>;
    disclosure: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const simulatedOrderSideSchema: z.ZodEnum<{
    buy: "buy";
    sell: "sell";
}>;
export declare const simulatedOrderStatusSchema: z.ZodEnum<{
    pending: "pending";
    cancelled: "cancelled";
    submitted: "submitted";
    filled: "filled";
}>;
export declare const simulatedOrderIntentSchema: z.ZodObject<{
    userId: z.ZodString;
    assetId: z.ZodString;
    symbol: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    side: z.ZodEnum<{
        buy: "buy";
        sell: "sell";
    }>;
    quantity: z.ZodString;
    fundingSource: z.ZodEnum<{
        stripe: "stripe";
        paypal: "paypal";
        "bank-balance": "bank-balance";
    }>;
    connectionState: z.ZodEnum<{
        sandbox: "sandbox";
        linked: "linked";
        manual: "manual";
    }>;
}, z.core.$strip>;
export declare const simulatedOrderSchema: z.ZodObject<{
    userId: z.ZodString;
    assetId: z.ZodString;
    symbol: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    side: z.ZodEnum<{
        buy: "buy";
        sell: "sell";
    }>;
    quantity: z.ZodString;
    fundingSource: z.ZodEnum<{
        stripe: "stripe";
        paypal: "paypal";
        "bank-balance": "bank-balance";
    }>;
    connectionState: z.ZodEnum<{
        sandbox: "sandbox";
        linked: "linked";
        manual: "manual";
    }>;
    id: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        cancelled: "cancelled";
        submitted: "submitted";
        filled: "filled";
    }>;
    disclosure: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type Locale = z.infer<typeof localeSchema>;
export type ChartType = z.infer<typeof chartTypeSchema>;
export type TimePeriod = z.infer<typeof timePeriodSchema>;
export type DashboardModuleId = z.infer<typeof dashboardModuleIdSchema>;
export type BrokerMode = z.infer<typeof brokerModeSchema>;
export type BrokerAssetScope = z.infer<typeof brokerAssetScopeSchema>;
export type ChartControls = z.infer<typeof chartControlsSchema>;
export type NormalizedChartPoint = z.infer<typeof normalizedChartPointSchema>;
export type NormalizedChart = z.infer<typeof normalizedChartSchema>;
export type DashboardPreset = z.infer<typeof dashboardPresetSchema>;
export type WatchlistItem = z.infer<typeof watchlistItemSchema>;
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type CheckoutSessionState = z.infer<typeof checkoutSessionStateSchema>;
export type SimulatedOrderIntent = z.infer<typeof simulatedOrderIntentSchema>;
export type SimulatedOrder = z.infer<typeof simulatedOrderSchema>;
//# sourceMappingURL=preferences.d.ts.map