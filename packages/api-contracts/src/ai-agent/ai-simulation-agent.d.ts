import { z } from 'zod';
export declare const aiSimulationAgentActionSchema: z.ZodEnum<{
    HOLD: "HOLD";
    PROPOSE_BUY: "PROPOSE_BUY";
    PROPOSE_SELL: "PROPOSE_SELL";
    SIMULATED_BUY_REQUEST: "SIMULATED_BUY_REQUEST";
    SIMULATED_SELL_REQUEST: "SIMULATED_SELL_REQUEST";
}>;
export declare const aiSimulationAutonomyModeSchema: z.ZodEnum<{
    suggest_only: "suggest_only";
    human_confirmed: "human_confirmed";
    autonomous_simulation: "autonomous_simulation";
}>;
export declare const aiSimulationProposedOrderSchema: z.ZodObject<{
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
    notional: z.ZodNumber;
    modeId: z.ZodString;
}, z.core.$strip>;
export declare const aiSimulationAgentDecisionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        HOLD: "HOLD";
        PROPOSE_BUY: "PROPOSE_BUY";
        PROPOSE_SELL: "PROPOSE_SELL";
        SIMULATED_BUY_REQUEST: "SIMULATED_BUY_REQUEST";
        SIMULATED_SELL_REQUEST: "SIMULATED_SELL_REQUEST";
    }>;
    symbol: z.ZodNullable<z.ZodString>;
    assetClass: z.ZodNullable<z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>>;
    notional: z.ZodNullable<z.ZodNumber>;
    confidence: z.ZodNumber;
    reasoning: z.ZodString;
    riskNotes: z.ZodString;
    simulationOnly: z.ZodLiteral<true>;
    requiresHumanConfirmation: z.ZodBoolean;
    rejectedReason: z.ZodNullable<z.ZodString>;
    proposedOrder: z.ZodNullable<z.ZodObject<{
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
        notional: z.ZodNumber;
        modeId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const aiSimulationPortfolioSummarySchema: z.ZodObject<{
    cashBalance: z.ZodNumber;
    equityValue: z.ZodNumber;
    availableCash: z.ZodNumber;
    openPositionCount: z.ZodNumber;
    unrealizedPnl: z.ZodNumber;
    realizedPnl: z.ZodNumber;
}, z.core.$strip>;
export declare const aiSimulationPositionContextSchema: z.ZodObject<{
    symbol: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    quantity: z.ZodNumber;
    averageCost: z.ZodNumber;
    marketValue: z.ZodNumber;
    unrealizedPnl: z.ZodNumber;
}, z.core.$strip>;
export declare const aiSimulationRankedAssetContextSchema: z.ZodObject<{
    symbol: z.ZodString;
    assetKind: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    score: z.ZodNumber;
    confidence: z.ZodNumber;
    recommendation: z.ZodString;
    explanation: z.ZodString;
    signalSummary: z.ZodString;
    riskSummary: z.ZodString;
}, z.core.$strip>;
export declare const aiSimulationCapSettingsSchema: z.ZodObject<{
    maxNotionalPerTrade: z.ZodNumber;
    maxDailyNotional: z.ZodNumber;
    maxOpenExposure: z.ZodNumber;
}, z.core.$strip>;
export declare const aiSimulationAgentRequestSchema: z.ZodObject<{
    autonomyMode: z.ZodEnum<{
        suggest_only: "suggest_only";
        human_confirmed: "human_confirmed";
        autonomous_simulation: "autonomous_simulation";
    }>;
    modeId: z.ZodString;
    capSettings: z.ZodObject<{
        maxNotionalPerTrade: z.ZodNumber;
        maxDailyNotional: z.ZodNumber;
        maxOpenExposure: z.ZodNumber;
    }, z.core.$strip>;
    portfolioSummary: z.ZodObject<{
        cashBalance: z.ZodNumber;
        equityValue: z.ZodNumber;
        availableCash: z.ZodNumber;
        openPositionCount: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
        realizedPnl: z.ZodNumber;
    }, z.core.$strip>;
    openPositions: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        assetClass: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        quantity: z.ZodNumber;
        averageCost: z.ZodNumber;
        marketValue: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
    }, z.core.$strip>>;
    rankedAssets: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        assetKind: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        score: z.ZodNumber;
        confidence: z.ZodNumber;
        recommendation: z.ZodString;
        explanation: z.ZodString;
        signalSummary: z.ZodString;
        riskSummary: z.ZodString;
    }, z.core.$strip>>;
    marketFreshnessNote: z.ZodString;
    generatedAt: z.ZodString;
}, z.core.$strip>;
export declare const aiSimulationAgentResultSchema: z.ZodObject<{
    decision: z.ZodObject<{
        action: z.ZodEnum<{
            HOLD: "HOLD";
            PROPOSE_BUY: "PROPOSE_BUY";
            PROPOSE_SELL: "PROPOSE_SELL";
            SIMULATED_BUY_REQUEST: "SIMULATED_BUY_REQUEST";
            SIMULATED_SELL_REQUEST: "SIMULATED_SELL_REQUEST";
        }>;
        symbol: z.ZodNullable<z.ZodString>;
        assetClass: z.ZodNullable<z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>>;
        notional: z.ZodNullable<z.ZodNumber>;
        confidence: z.ZodNumber;
        reasoning: z.ZodString;
        riskNotes: z.ZodString;
        simulationOnly: z.ZodLiteral<true>;
        requiresHumanConfirmation: z.ZodBoolean;
        rejectedReason: z.ZodNullable<z.ZodString>;
        proposedOrder: z.ZodNullable<z.ZodObject<{
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
            notional: z.ZodNumber;
            modeId: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    requestedAt: z.ZodString;
    processedAt: z.ZodString;
    agentVersion: z.ZodLiteral<"v1">;
    decisionAuditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    autonomyMode: z.ZodEnum<{
        suggest_only: "suggest_only";
        human_confirmed: "human_confirmed";
        autonomous_simulation: "autonomous_simulation";
    }>;
    capSettings: z.ZodObject<{
        maxNotionalPerTrade: z.ZodNumber;
        maxDailyNotional: z.ZodNumber;
        maxOpenExposure: z.ZodNumber;
    }, z.core.$strip>;
    tradeSubmitted: z.ZodBoolean;
    tradeError: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type AiSimulationAgentAction = z.infer<typeof aiSimulationAgentActionSchema>;
export type AiSimulationAutonomyMode = z.infer<typeof aiSimulationAutonomyModeSchema>;
export type AiSimulationProposedOrder = z.infer<typeof aiSimulationProposedOrderSchema>;
export type AiSimulationAgentDecision = z.infer<typeof aiSimulationAgentDecisionSchema>;
export type AiSimulationPortfolioSummary = z.infer<typeof aiSimulationPortfolioSummarySchema>;
export type AiSimulationPositionContext = z.infer<typeof aiSimulationPositionContextSchema>;
export type AiSimulationRankedAssetContext = z.infer<typeof aiSimulationRankedAssetContextSchema>;
export type AiSimulationCapSettings = z.infer<typeof aiSimulationCapSettingsSchema>;
export type AiSimulationAgentRequest = z.infer<typeof aiSimulationAgentRequestSchema>;
export type AiSimulationAgentResult = z.infer<typeof aiSimulationAgentResultSchema>;
//# sourceMappingURL=ai-simulation-agent.d.ts.map