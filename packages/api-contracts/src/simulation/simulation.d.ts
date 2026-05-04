import { z } from 'zod';
export declare const simulationAssetClassSchema: z.ZodEnum<{
    stock: "stock";
    etf: "etf";
    crypto: "crypto";
}>;
export declare const simulationOrderSideSchema: z.ZodEnum<{
    buy: "buy";
    sell: "sell";
}>;
export declare const simulationOrderStatusSchema: z.ZodEnum<{
    rejected: "rejected";
    cancelled: "cancelled";
    filled: "filled";
}>;
export declare const simulationTransactionTypeSchema: z.ZodEnum<{
    buy: "buy";
    sell: "sell";
    initial_funding: "initial_funding";
    reset: "reset";
}>;
export declare const simulationLaneIdSchema: z.ZodEnum<{
    manual_stock_lane: "manual_stock_lane";
    manual_multi_asset_lane: "manual_multi_asset_lane";
    ai_copilot_lane: "ai_copilot_lane";
    signal_follow_lane: "signal_follow_lane";
    agent_sandbox_lane: "agent_sandbox_lane";
}>;
export declare const simulationLaneModeSchema: z.ZodEnum<{
    manual: "manual";
    "ai-assisted": "ai-assisted";
    strategy: "strategy";
}>;
export declare const simulationSessionStatusSchema: z.ZodEnum<{
    completed: "completed";
    running: "running";
    failed: "failed";
    draft: "draft";
    starting: "starting";
    paused: "paused";
    stopping: "stopping";
    stopped: "stopped";
}>;
export declare const simulationObservationStatusSchema: z.ZodEnum<{
    error: "error";
    degraded: "degraded";
    idle: "idle";
    warming: "warming";
    watching: "watching";
}>;
export declare const simulationAssetScopeSchema: z.ZodEnum<{
    stock: "stock";
    etf: "etf";
    crypto: "crypto";
    "multi-asset": "multi-asset";
}>;
export declare const simulationExecutionModelSchema: z.ZodObject<{
    feeBps: z.ZodDefault<z.ZodNumber>;
    slippageBps: z.ZodDefault<z.ZodNumber>;
    latencyMs: z.ZodDefault<z.ZodNumber>;
    venue: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const simulationExecutionRecordSchema: z.ZodObject<{
    executionId: z.ZodString;
    requestedPrice: z.ZodNumber;
    executionPrice: z.ZodNumber;
    slippageAmount: z.ZodNumber;
    slippageBps: z.ZodNumber;
    feeAmount: z.ZodNumber;
    notionalAmount: z.ZodNumber;
    latencyMs: z.ZodNumber;
    validationHash: z.ZodString;
    venue: z.ZodString;
    model: z.ZodObject<{
        feeBps: z.ZodDefault<z.ZodNumber>;
        slippageBps: z.ZodDefault<z.ZodNumber>;
        latencyMs: z.ZodDefault<z.ZodNumber>;
        venue: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    recordedAt: z.ZodString;
}, z.core.$strip>;
export declare const simulationExecutionInputSchema: z.ZodObject<{
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
    quantity: z.ZodNumber;
    executionPrice: z.ZodNumber;
    requestedPrice: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    executionModel: z.ZodOptional<z.ZodObject<{
        feeBps: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        slippageBps: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        latencyMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        venue: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const simulationAccountSummarySchema: z.ZodObject<{
    accountId: z.ZodString;
    portfolioId: z.ZodString;
    currency: z.ZodLiteral<"USD">;
    initialCashBalance: z.ZodNumber;
    cashBalance: z.ZodNumber;
    reservedCash: z.ZodNumber;
    availableCash: z.ZodNumber;
    investedCapital: z.ZodNumber;
    portfolioValue: z.ZodNumber;
    equityValue: z.ZodNumber;
    unrealizedPnl: z.ZodNumber;
    realizedPnl: z.ZodNumber;
    buyingPower: z.ZodNumber;
    activeInvestmentCount: z.ZodNumber;
    closedInvestmentCount: z.ZodNumber;
    positionCount: z.ZodNumber;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const simulationPositionSchema: z.ZodObject<{
    id: z.ZodString;
    assetId: z.ZodString;
    symbol: z.ZodString;
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
    openedAt: z.ZodNullable<z.ZodString>;
    closedAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const simulationOrderSchema: z.ZodObject<{
    id: z.ZodString;
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
    status: z.ZodEnum<{
        rejected: "rejected";
        cancelled: "cancelled";
        filled: "filled";
    }>;
    quantity: z.ZodNumber;
    requestedPrice: z.ZodNumber;
    executedPrice: z.ZodNumber;
    grossAmount: z.ZodNumber;
    cashEffect: z.ZodNumber;
    realizedPnl: z.ZodNumber;
    notes: z.ZodNullable<z.ZodString>;
    executionRecord: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        executionId: z.ZodString;
        requestedPrice: z.ZodNumber;
        executionPrice: z.ZodNumber;
        slippageAmount: z.ZodNumber;
        slippageBps: z.ZodNumber;
        feeAmount: z.ZodNumber;
        notionalAmount: z.ZodNumber;
        latencyMs: z.ZodNumber;
        validationHash: z.ZodString;
        venue: z.ZodString;
        model: z.ZodObject<{
            feeBps: z.ZodDefault<z.ZodNumber>;
            slippageBps: z.ZodDefault<z.ZodNumber>;
            latencyMs: z.ZodDefault<z.ZodNumber>;
            venue: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>;
        recordedAt: z.ZodString;
    }, z.core.$strip>>>;
    createdAt: z.ZodString;
    executedAt: z.ZodString;
}, z.core.$strip>;
export declare const simulationTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    orderId: z.ZodNullable<z.ZodString>;
    positionId: z.ZodNullable<z.ZodString>;
    transactionType: z.ZodEnum<{
        buy: "buy";
        sell: "sell";
        initial_funding: "initial_funding";
        reset: "reset";
    }>;
    assetId: z.ZodNullable<z.ZodString>;
    symbol: z.ZodNullable<z.ZodString>;
    assetClass: z.ZodNullable<z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>>;
    quantity: z.ZodNullable<z.ZodNumber>;
    price: z.ZodNullable<z.ZodNumber>;
    grossAmount: z.ZodNumber;
    feeAmount: z.ZodNumber;
    cashDelta: z.ZodNumber;
    realizedPnl: z.ZodNumber;
    description: z.ZodString;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const simulationSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    cashBalance: z.ZodNumber;
    marketValue: z.ZodNumber;
    equityValue: z.ZodNumber;
    unrealizedPnl: z.ZodNumber;
    realizedPnl: z.ZodNumber;
    positionCount: z.ZodNumber;
    takenAt: z.ZodString;
}, z.core.$strip>;
export declare const simulationWorkspaceSchema: z.ZodObject<{
    summary: z.ZodObject<{
        accountId: z.ZodString;
        portfolioId: z.ZodString;
        currency: z.ZodLiteral<"USD">;
        initialCashBalance: z.ZodNumber;
        cashBalance: z.ZodNumber;
        reservedCash: z.ZodNumber;
        availableCash: z.ZodNumber;
        investedCapital: z.ZodNumber;
        portfolioValue: z.ZodNumber;
        equityValue: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        buyingPower: z.ZodNumber;
        activeInvestmentCount: z.ZodNumber;
        closedInvestmentCount: z.ZodNumber;
        positionCount: z.ZodNumber;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    positions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        assetId: z.ZodString;
        symbol: z.ZodString;
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
        openedAt: z.ZodNullable<z.ZodString>;
        closedAt: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    closedPositions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        assetId: z.ZodString;
        symbol: z.ZodString;
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
        openedAt: z.ZodNullable<z.ZodString>;
        closedAt: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    orders: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
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
        status: z.ZodEnum<{
            rejected: "rejected";
            cancelled: "cancelled";
            filled: "filled";
        }>;
        quantity: z.ZodNumber;
        requestedPrice: z.ZodNumber;
        executedPrice: z.ZodNumber;
        grossAmount: z.ZodNumber;
        cashEffect: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        notes: z.ZodNullable<z.ZodString>;
        executionRecord: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            executionId: z.ZodString;
            requestedPrice: z.ZodNumber;
            executionPrice: z.ZodNumber;
            slippageAmount: z.ZodNumber;
            slippageBps: z.ZodNumber;
            feeAmount: z.ZodNumber;
            notionalAmount: z.ZodNumber;
            latencyMs: z.ZodNumber;
            validationHash: z.ZodString;
            venue: z.ZodString;
            model: z.ZodObject<{
                feeBps: z.ZodDefault<z.ZodNumber>;
                slippageBps: z.ZodDefault<z.ZodNumber>;
                latencyMs: z.ZodDefault<z.ZodNumber>;
                venue: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>;
            recordedAt: z.ZodString;
        }, z.core.$strip>>>;
        createdAt: z.ZodString;
        executedAt: z.ZodString;
    }, z.core.$strip>>;
    transactions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        orderId: z.ZodNullable<z.ZodString>;
        positionId: z.ZodNullable<z.ZodString>;
        transactionType: z.ZodEnum<{
            buy: "buy";
            sell: "sell";
            initial_funding: "initial_funding";
            reset: "reset";
        }>;
        assetId: z.ZodNullable<z.ZodString>;
        symbol: z.ZodNullable<z.ZodString>;
        assetClass: z.ZodNullable<z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>>;
        quantity: z.ZodNullable<z.ZodNumber>;
        price: z.ZodNullable<z.ZodNumber>;
        grossAmount: z.ZodNumber;
        feeAmount: z.ZodNumber;
        cashDelta: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        description: z.ZodString;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
    snapshots: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        cashBalance: z.ZodNumber;
        marketValue: z.ZodNumber;
        equityValue: z.ZodNumber;
        unrealizedPnl: z.ZodNumber;
        realizedPnl: z.ZodNumber;
        positionCount: z.ZodNumber;
        takenAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const simulationSessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    laneId: z.ZodEnum<{
        manual_stock_lane: "manual_stock_lane";
        manual_multi_asset_lane: "manual_multi_asset_lane";
        ai_copilot_lane: "ai_copilot_lane";
        signal_follow_lane: "signal_follow_lane";
        agent_sandbox_lane: "agent_sandbox_lane";
    }>;
    laneMode: z.ZodEnum<{
        manual: "manual";
        "ai-assisted": "ai-assisted";
        strategy: "strategy";
    }>;
    status: z.ZodEnum<{
        completed: "completed";
        running: "running";
        failed: "failed";
        draft: "draft";
        starting: "starting";
        paused: "paused";
        stopping: "stopping";
        stopped: "stopped";
    }>;
    observationStatus: z.ZodEnum<{
        error: "error";
        degraded: "degraded";
        idle: "idle";
        warming: "warming";
        watching: "watching";
    }>;
    observationMessage: z.ZodNullable<z.ZodString>;
    assetScope: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
        "multi-asset": "multi-asset";
    }>;
    maxCapitalUsd: z.ZodNumber;
    microAllocationPercent: z.ZodNumber;
    decisionSource: z.ZodEnum<{
        manual_ui: "manual_ui";
        ai_assisted: "ai_assisted";
        automation: "automation";
    }>;
    lastHeartbeatAt: z.ZodNullable<z.ZodString>;
    startedAt: z.ZodNullable<z.ZodString>;
    pausedAt: z.ZodNullable<z.ZodString>;
    stoppedAt: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodNullable<z.ZodString>;
    failedAt: z.ZodNullable<z.ZodString>;
    lastError: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastOpenedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const simulationOrderErrorCodeSchema: z.ZodEnum<{
    INSUFFICIENT_CASH: "INSUFFICIENT_CASH";
    INSUFFICIENT_POSITION: "INSUFFICIENT_POSITION";
    NO_POSITION_TO_SELL: "NO_POSITION_TO_SELL";
    ZERO_QUANTITY: "ZERO_QUANTITY";
    MARKET_DATA_UNAVAILABLE: "MARKET_DATA_UNAVAILABLE";
    NO_ACTIVE_SESSION: "NO_ACTIVE_SESSION";
    POSITION_STATE_CHANGED: "POSITION_STATE_CHANGED";
    LANE_MISMATCH: "LANE_MISMATCH";
    UNSUPPORTED_ASSET_CLASS: "UNSUPPORTED_ASSET_CLASS";
    SCOPE_MISMATCH: "SCOPE_MISMATCH";
    VALIDATION_ERROR: "VALIDATION_ERROR";
    INTERNAL_ERROR: "INTERNAL_ERROR";
}>;
export type SimulationOrderErrorCode = z.infer<typeof simulationOrderErrorCodeSchema>;
export type SimulationAssetClass = z.infer<typeof simulationAssetClassSchema>;
export type SimulationOrderSide = z.infer<typeof simulationOrderSideSchema>;
export type SimulationOrderStatus = z.infer<typeof simulationOrderStatusSchema>;
export type SimulationTransactionType = z.infer<typeof simulationTransactionTypeSchema>;
export type SimulationLaneId = z.infer<typeof simulationLaneIdSchema>;
export type SimulationLaneMode = z.infer<typeof simulationLaneModeSchema>;
export type SimulationSessionStatus = z.infer<typeof simulationSessionStatusSchema>;
export type SimulationObservationStatus = z.infer<typeof simulationObservationStatusSchema>;
export type SimulationAssetScope = z.infer<typeof simulationAssetScopeSchema>;
export type SimulationExecutionModel = z.infer<typeof simulationExecutionModelSchema>;
export type SimulationExecutionRecord = z.infer<typeof simulationExecutionRecordSchema>;
export type SimulationExecutionInput = z.infer<typeof simulationExecutionInputSchema>;
export type SimulationAccountSummary = z.infer<typeof simulationAccountSummarySchema>;
export type SimulationPosition = z.infer<typeof simulationPositionSchema>;
export type SimulationOrder = z.infer<typeof simulationOrderSchema>;
export type SimulationTransaction = z.infer<typeof simulationTransactionSchema>;
export type SimulationSnapshot = z.infer<typeof simulationSnapshotSchema>;
export type SimulationWorkspace = z.infer<typeof simulationWorkspaceSchema>;
export type SimulationSession = z.infer<typeof simulationSessionSchema>;
//# sourceMappingURL=simulation.d.ts.map