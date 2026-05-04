import { z } from 'zod';
export declare const actionAvailabilitySchema: z.ZodEnum<{
    unavailable: "unavailable";
    available: "available";
    simulated: "simulated";
    planned: "planned";
}>;
export declare const recommendationActionSchema: z.ZodEnum<{
    hold: "hold";
    accumulate: "accumulate";
    watch: "watch";
    trim: "trim";
    avoid: "avoid";
}>;
export declare const bankConnectionStatusSchema: z.ZodEnum<{
    available: "available";
    "credentials-required": "credentials-required";
    sandbox: "sandbox";
    unsupported: "unsupported";
    connected: "connected";
}>;
export declare const investableAssetSummarySchema: z.ZodObject<{
    assetId: z.ZodString;
    symbol: z.ZodString;
    name: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    category: z.ZodString;
    geography: z.ZodNullable<z.ZodString>;
    sector: z.ZodNullable<z.ZodString>;
    thesis: z.ZodString;
    price: z.ZodNullable<z.ZodNumber>;
    changePercent: z.ZodNullable<z.ZodNumber>;
    freshnessState: z.ZodEnum<{
        unavailable: "unavailable";
        stale: "stale";
        live: "live";
        delayed: "delayed";
        partial: "partial";
    }>;
    lastUpdatedAt: z.ZodNullable<z.ZodString>;
    actionAvailability: z.ZodEnum<{
        unavailable: "unavailable";
        available: "available";
        simulated: "simulated";
        planned: "planned";
    }>;
    isSimulated: z.ZodBoolean;
    riskSummary: z.ZodString;
    insightStance: z.ZodEnum<{
        positive: "positive";
        negative: "negative";
        neutral: "neutral";
    }>;
}, z.core.$strip>;
export declare const investmentRecommendationSchema: z.ZodObject<{
    assetId: z.ZodString;
    symbol: z.ZodString;
    action: z.ZodEnum<{
        hold: "hold";
        accumulate: "accumulate";
        watch: "watch";
        trim: "trim";
        avoid: "avoid";
    }>;
    confidence: z.ZodNumber;
    suitability: z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>;
    summary: z.ZodString;
    reasons: z.ZodArray<z.ZodString>;
    riskNotice: z.ZodString;
    isPersonalized: z.ZodBoolean;
    newsImpactScore: z.ZodDefault<z.ZodNumber>;
    newsRiskFlag: z.ZodDefault<z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    executionReviewRequired: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const connectedInvestmentAccountSchema: z.ZodObject<{
    providerKey: z.ZodString;
    providerLabel: z.ZodString;
    accountLabel: z.ZodString;
    ibanMasked: z.ZodString;
    connectionStatus: z.ZodEnum<{
        available: "available";
        "credentials-required": "credentials-required";
        sandbox: "sandbox";
        unsupported: "unsupported";
        connected: "connected";
    }>;
    lastSyncedAt: z.ZodNullable<z.ZodString>;
    sourceSummary: z.ZodString;
}, z.core.$strip>;
export declare const bankConnectionCapabilitySchema: z.ZodObject<{
    providerKey: z.ZodString;
    providerLabel: z.ZodString;
    connectionStatus: z.ZodEnum<{
        available: "available";
        "credentials-required": "credentials-required";
        sandbox: "sandbox";
        unsupported: "unsupported";
        connected: "connected";
    }>;
    accessModel: z.ZodEnum<{
        "psd2-xs2a": "psd2-xs2a";
        "partner-api": "partner-api";
    }>;
    supportedScopes: z.ZodArray<z.ZodEnum<{
        balances: "balances";
        transactions: "transactions";
        payments: "payments";
        multibanking: "multibanking";
    }>>;
    isConsentRequired: z.ZodBoolean;
    requiresRegulatedPartner: z.ZodBoolean;
    disclosure: z.ZodString;
    setupHint: z.ZodString;
}, z.core.$strip>;
export declare const investmentCapabilitySchema: z.ZodObject<{
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    title: z.ZodString;
    description: z.ZodString;
    actionAvailability: z.ZodEnum<{
        unavailable: "unavailable";
        available: "available";
        simulated: "simulated";
        planned: "planned";
    }>;
    isSimulated: z.ZodBoolean;
    supportedActions: z.ZodArray<z.ZodString>;
    disclosure: z.ZodString;
}, z.core.$strip>;
export declare const brokerExecutionCapabilitySchema: z.ZodObject<{
    executionTarget: z.ZodEnum<{
        simulation: "simulation";
        live: "live";
    }>;
    supportedAssetClasses: z.ZodArray<z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>>;
    requiresReadinessChecks: z.ZodBoolean;
    supportsDryRun: z.ZodBoolean;
    notes: z.ZodString;
}, z.core.$strip>;
export declare const investOverviewSchema: z.ZodObject<{
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
    lastUpdatedAt: z.ZodNullable<z.ZodString>;
    actionSummary: z.ZodString;
    capabilities: z.ZodArray<z.ZodObject<{
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        title: z.ZodString;
        description: z.ZodString;
        actionAvailability: z.ZodEnum<{
            unavailable: "unavailable";
            available: "available";
            simulated: "simulated";
            planned: "planned";
        }>;
        isSimulated: z.ZodBoolean;
        supportedActions: z.ZodArray<z.ZodString>;
        disclosure: z.ZodString;
    }, z.core.$strip>>;
    recommendations: z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        symbol: z.ZodString;
        action: z.ZodEnum<{
            hold: "hold";
            accumulate: "accumulate";
            watch: "watch";
            trim: "trim";
            avoid: "avoid";
        }>;
        confidence: z.ZodNumber;
        suitability: z.ZodEnum<{
            high: "high";
            low: "low";
            medium: "medium";
        }>;
        summary: z.ZodString;
        reasons: z.ZodArray<z.ZodString>;
        riskNotice: z.ZodString;
        isPersonalized: z.ZodBoolean;
        newsImpactScore: z.ZodDefault<z.ZodNumber>;
        newsRiskFlag: z.ZodDefault<z.ZodEnum<{
            LOW: "LOW";
            MEDIUM: "MEDIUM";
            HIGH: "HIGH";
            CRITICAL: "CRITICAL";
        }>>;
        executionReviewRequired: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    bankConnections: z.ZodArray<z.ZodObject<{
        providerKey: z.ZodString;
        providerLabel: z.ZodString;
        connectionStatus: z.ZodEnum<{
            available: "available";
            "credentials-required": "credentials-required";
            sandbox: "sandbox";
            unsupported: "unsupported";
            connected: "connected";
        }>;
        accessModel: z.ZodEnum<{
            "psd2-xs2a": "psd2-xs2a";
            "partner-api": "partner-api";
        }>;
        supportedScopes: z.ZodArray<z.ZodEnum<{
            balances: "balances";
            transactions: "transactions";
            payments: "payments";
            multibanking: "multibanking";
        }>>;
        isConsentRequired: z.ZodBoolean;
        requiresRegulatedPartner: z.ZodBoolean;
        disclosure: z.ZodString;
        setupHint: z.ZodString;
    }, z.core.$strip>>;
    linkedAccounts: z.ZodArray<z.ZodObject<{
        providerKey: z.ZodString;
        providerLabel: z.ZodString;
        accountLabel: z.ZodString;
        ibanMasked: z.ZodString;
        connectionStatus: z.ZodEnum<{
            available: "available";
            "credentials-required": "credentials-required";
            sandbox: "sandbox";
            unsupported: "unsupported";
            connected: "connected";
        }>;
        lastSyncedAt: z.ZodNullable<z.ZodString>;
        sourceSummary: z.ZodString;
    }, z.core.$strip>>;
    featuredAssets: z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        symbol: z.ZodString;
        name: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        category: z.ZodString;
        geography: z.ZodNullable<z.ZodString>;
        sector: z.ZodNullable<z.ZodString>;
        thesis: z.ZodString;
        price: z.ZodNullable<z.ZodNumber>;
        changePercent: z.ZodNullable<z.ZodNumber>;
        freshnessState: z.ZodEnum<{
            unavailable: "unavailable";
            stale: "stale";
            live: "live";
            delayed: "delayed";
            partial: "partial";
        }>;
        lastUpdatedAt: z.ZodNullable<z.ZodString>;
        actionAvailability: z.ZodEnum<{
            unavailable: "unavailable";
            available: "available";
            simulated: "simulated";
            planned: "planned";
        }>;
        isSimulated: z.ZodBoolean;
        riskSummary: z.ZodString;
        insightStance: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
            neutral: "neutral";
        }>;
    }, z.core.$strip>>;
    groupedAssets: z.ZodArray<z.ZodObject<{
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        label: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            assetId: z.ZodString;
            symbol: z.ZodString;
            name: z.ZodString;
            assetClass: z.ZodEnum<{
                stock: "stock";
                etf: "etf";
                crypto: "crypto";
            }>;
            category: z.ZodString;
            geography: z.ZodNullable<z.ZodString>;
            sector: z.ZodNullable<z.ZodString>;
            thesis: z.ZodString;
            price: z.ZodNullable<z.ZodNumber>;
            changePercent: z.ZodNullable<z.ZodNumber>;
            freshnessState: z.ZodEnum<{
                unavailable: "unavailable";
                stale: "stale";
                live: "live";
                delayed: "delayed";
                partial: "partial";
            }>;
            lastUpdatedAt: z.ZodNullable<z.ZodString>;
            actionAvailability: z.ZodEnum<{
                unavailable: "unavailable";
                available: "available";
                simulated: "simulated";
                planned: "planned";
            }>;
            isSimulated: z.ZodBoolean;
            riskSummary: z.ZodString;
            insightStance: z.ZodEnum<{
                positive: "positive";
                negative: "negative";
                neutral: "neutral";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    rankedAssets: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        assetId: z.ZodString;
        assetKind: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        rank: z.ZodNumber;
        score: z.ZodNumber;
        confidence: z.ZodNumber;
        recommendation: z.ZodEnum<{
            strong_buy: "strong_buy";
            buy: "buy";
            hold: "hold";
            sell: "sell";
            strong_sell: "strong_sell";
        }>;
        horizon: z.ZodEnum<{
            short: "short";
        }>;
        signalSummary: z.ZodString;
        factorSummary: z.ZodString;
        regimeSummary: z.ZodString;
        riskSummary: z.ZodString;
        explanation: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const portfolioFilterStateSchema: z.ZodObject<{
    view: z.ZodEnum<{
        grid: "grid";
        list: "list";
    }>;
    lane: z.ZodEnum<{
        all: "all";
        current: "current";
    }>;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
        all: "all";
    }>;
    positionState: z.ZodEnum<{
        open: "open";
        all: "all";
        closed: "closed";
    }>;
}, z.core.$strip>;
export declare const portfolioPositionItemSchema: z.ZodObject<{
    id: z.ZodString;
    assetId: z.ZodString;
    symbol: z.ZodString;
    name: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    quantity: z.ZodNumber;
    averageCost: z.ZodNumber;
    marketPrice: z.ZodNullable<z.ZodNumber>;
    marketValue: z.ZodNumber;
    costBasis: z.ZodNumber;
    unrealizedPnl: z.ZodNumber;
    realizedPnl: z.ZodNumber;
    allocationPercent: z.ZodNumber;
    openedAt: z.ZodNullable<z.ZodString>;
    closedAt: z.ZodNullable<z.ZodString>;
    lastUpdatedAt: z.ZodString;
    sparkline: z.ZodArray<z.ZodNumber>;
    isWatched: z.ZodBoolean;
}, z.core.$strip>;
export declare const portfolioRecentTradeSchema: z.ZodObject<{
    orderId: z.ZodString;
    side: z.ZodEnum<{
        buy: "buy";
        sell: "sell";
    }>;
    symbol: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    quantity: z.ZodNumber;
    executedPrice: z.ZodNumber;
    grossAmount: z.ZodNumber;
    cashEffect: z.ZodNumber;
    realizedPnl: z.ZodNumber;
    executedAt: z.ZodString;
    source: z.ZodEnum<{
        unknown: "unknown";
        manual: "manual";
        ai_suggested: "ai_suggested";
        ai_autonomous: "ai_autonomous";
    }>;
}, z.core.$strip>;
export declare const portfolioAllocationItemSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    value: z.ZodNumber;
    percent: z.ZodNumber;
}, z.core.$strip>;
export declare const portfolioRiskLevelSchema: z.ZodEnum<{
    unavailable: "unavailable";
    high: "high";
    low: "low";
    medium: "medium";
    critical: "critical";
}>;
export declare const portfolioRiskProfileSchema: z.ZodObject<{
    level: z.ZodEnum<{
        unavailable: "unavailable";
        high: "high";
        low: "low";
        medium: "medium";
        critical: "critical";
    }>;
    drawdownPercent: z.ZodNumber;
    topConcentrationSymbol: z.ZodNullable<z.ZodString>;
    topConcentrationPercent: z.ZodNumber;
    explanation: z.ZodString;
}, z.core.$strip>;
export declare const investPortfolioViewModelSchema: z.ZodObject<{
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    statusReason: z.ZodString;
    sessionId: z.ZodNullable<z.ZodString>;
    laneId: z.ZodNullable<z.ZodEnum<{
        manual_stock_lane: "manual_stock_lane";
        manual_multi_asset_lane: "manual_multi_asset_lane";
        ai_copilot_lane: "ai_copilot_lane";
        signal_follow_lane: "signal_follow_lane";
        agent_sandbox_lane: "agent_sandbox_lane";
    }>>;
    filters: z.ZodObject<{
        view: z.ZodEnum<{
            grid: "grid";
            list: "list";
        }>;
        lane: z.ZodEnum<{
            all: "all";
            current: "current";
        }>;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
            all: "all";
        }>;
        positionState: z.ZodEnum<{
            open: "open";
            all: "all";
            closed: "closed";
        }>;
    }, z.core.$strip>;
    summary: z.ZodNullable<z.ZodObject<{
        equityValue: z.ZodNumber;
        portfolioValue: z.ZodNumber;
        cashBalance: z.ZodNumber;
        availableCash: z.ZodNumber;
        buyingPower: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        openPositionCount: z.ZodNumber;
        closedPositionCount: z.ZodNumber;
    }, z.core.$strip>>;
    openPositions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        assetId: z.ZodString;
        symbol: z.ZodString;
        name: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        quantity: z.ZodNumber;
        averageCost: z.ZodNumber;
        marketPrice: z.ZodNullable<z.ZodNumber>;
        marketValue: z.ZodNumber;
        costBasis: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        allocationPercent: z.ZodNumber;
        openedAt: z.ZodNullable<z.ZodString>;
        closedAt: z.ZodNullable<z.ZodString>;
        lastUpdatedAt: z.ZodString;
        sparkline: z.ZodArray<z.ZodNumber>;
        isWatched: z.ZodBoolean;
    }, z.core.$strip>>;
    closedPositions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        assetId: z.ZodString;
        symbol: z.ZodString;
        name: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        quantity: z.ZodNumber;
        averageCost: z.ZodNumber;
        marketPrice: z.ZodNullable<z.ZodNumber>;
        marketValue: z.ZodNumber;
        costBasis: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        allocationPercent: z.ZodNumber;
        openedAt: z.ZodNullable<z.ZodString>;
        closedAt: z.ZodNullable<z.ZodString>;
        lastUpdatedAt: z.ZodString;
        sparkline: z.ZodArray<z.ZodNumber>;
        isWatched: z.ZodBoolean;
    }, z.core.$strip>>;
    recentTrades: z.ZodArray<z.ZodObject<{
        orderId: z.ZodString;
        side: z.ZodEnum<{
            buy: "buy";
            sell: "sell";
        }>;
        symbol: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        quantity: z.ZodNumber;
        executedPrice: z.ZodNumber;
        grossAmount: z.ZodNumber;
        cashEffect: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        executedAt: z.ZodString;
        source: z.ZodEnum<{
            unknown: "unknown";
            manual: "manual";
            ai_suggested: "ai_suggested";
            ai_autonomous: "ai_autonomous";
        }>;
    }, z.core.$strip>>;
    allocationByAssetClass: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        value: z.ZodNumber;
        percent: z.ZodNumber;
    }, z.core.$strip>>;
    allocationByAsset: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        value: z.ZodNumber;
        percent: z.ZodNumber;
    }, z.core.$strip>>;
    watchlistCount: z.ZodNumber;
    emptyStateMessage: z.ZodNullable<z.ZodString>;
    riskProfile: z.ZodNullable<z.ZodObject<{
        level: z.ZodEnum<{
            unavailable: "unavailable";
            high: "high";
            low: "low";
            medium: "medium";
            critical: "critical";
        }>;
        drawdownPercent: z.ZodNumber;
        topConcentrationSymbol: z.ZodNullable<z.ZodString>;
        topConcentrationPercent: z.ZodNumber;
        explanation: z.ZodString;
    }, z.core.$strip>>;
    asOf: z.ZodString;
}, z.core.$strip>;
export type PortfolioRiskLevel = z.infer<typeof portfolioRiskLevelSchema>;
export type PortfolioRiskProfile = z.infer<typeof portfolioRiskProfileSchema>;
export type ActionAvailability = z.infer<typeof actionAvailabilitySchema>;
export type RecommendationAction = z.infer<typeof recommendationActionSchema>;
export type BankConnectionStatus = z.infer<typeof bankConnectionStatusSchema>;
export type InvestableAssetSummary = z.infer<typeof investableAssetSummarySchema>;
export type InvestmentRecommendation = z.infer<typeof investmentRecommendationSchema>;
export type ConnectedInvestmentAccount = z.infer<typeof connectedInvestmentAccountSchema>;
export type BankConnectionCapability = z.infer<typeof bankConnectionCapabilitySchema>;
export type InvestmentCapability = z.infer<typeof investmentCapabilitySchema>;
export type BrokerExecutionCapability = z.infer<typeof brokerExecutionCapabilitySchema>;
export type InvestOverview = z.infer<typeof investOverviewSchema>;
export type PortfolioFilterState = z.infer<typeof portfolioFilterStateSchema>;
export type PortfolioPositionItem = z.infer<typeof portfolioPositionItemSchema>;
export type PortfolioRecentTrade = z.infer<typeof portfolioRecentTradeSchema>;
export type PortfolioAllocationItem = z.infer<typeof portfolioAllocationItemSchema>;
export type InvestPortfolioViewModel = z.infer<typeof investPortfolioViewModelSchema>;
//# sourceMappingURL=invest.d.ts.map