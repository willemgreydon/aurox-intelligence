import { z } from 'zod';
export const aiSimulationAgentActionSchema = z.enum([
    'HOLD',
    'PROPOSE_BUY',
    'PROPOSE_SELL',
    'SIMULATED_BUY_REQUEST',
    'SIMULATED_SELL_REQUEST',
]);
export const aiSimulationAutonomyModeSchema = z.enum([
    'suggest_only',
    'human_confirmed',
    'autonomous_simulation',
]);
export const aiSimulationProposedOrderSchema = z.object({
    symbol: z.string().min(1),
    assetClass: z.enum(['stock', 'etf', 'crypto']),
    side: z.enum(['buy', 'sell']),
    notional: z.number().positive(),
    modeId: z.string().min(1),
});
export const aiSimulationAgentDecisionSchema = z.object({
    action: aiSimulationAgentActionSchema,
    symbol: z.string().nullable(),
    assetClass: z.enum(['stock', 'etf', 'crypto']).nullable(),
    notional: z.number().positive().nullable(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    riskNotes: z.string(),
    simulationOnly: z.literal(true),
    requiresHumanConfirmation: z.boolean(),
    rejectedReason: z.string().nullable(),
    proposedOrder: aiSimulationProposedOrderSchema.nullable(),
});
export const aiSimulationPortfolioSummarySchema = z.object({
    cashBalance: z.number(),
    equityValue: z.number(),
    availableCash: z.number(),
    openPositionCount: z.number().int().nonnegative(),
    unrealizedPnl: z.number(),
    realizedPnl: z.number(),
});
export const aiSimulationPositionContextSchema = z.object({
    symbol: z.string(),
    assetClass: z.enum(['stock', 'etf', 'crypto']),
    quantity: z.number(),
    averageCost: z.number(),
    marketValue: z.number(),
    unrealizedPnl: z.number(),
});
export const aiSimulationRankedAssetContextSchema = z.object({
    symbol: z.string(),
    assetKind: z.enum(['stock', 'etf', 'crypto']),
    score: z.number().min(-1).max(1),
    confidence: z.number().min(0).max(1),
    recommendation: z.string(),
    explanation: z.string(),
    signalSummary: z.string(),
    riskSummary: z.string(),
});
export const aiSimulationCapSettingsSchema = z.object({
    maxNotionalPerTrade: z.number().positive(),
    maxDailyNotional: z.number().positive(),
    maxOpenExposure: z.number().positive(),
});
export const aiSimulationAgentRequestSchema = z.object({
    autonomyMode: aiSimulationAutonomyModeSchema,
    modeId: z.string().min(1),
    capSettings: aiSimulationCapSettingsSchema,
    portfolioSummary: aiSimulationPortfolioSummarySchema,
    openPositions: z.array(aiSimulationPositionContextSchema),
    rankedAssets: z.array(aiSimulationRankedAssetContextSchema),
    marketFreshnessNote: z.string(),
    generatedAt: z.string(),
});
export const aiSimulationAgentResultSchema = z.object({
    decision: aiSimulationAgentDecisionSchema,
    requestedAt: z.string(),
    processedAt: z.string(),
    agentVersion: z.literal('v1'),
    decisionAuditId: z.string().nullable().optional(),
    autonomyMode: aiSimulationAutonomyModeSchema,
    capSettings: aiSimulationCapSettingsSchema,
    tradeSubmitted: z.boolean(),
    tradeError: z.string().nullable(),
});
