import { z } from 'zod';
import { freshnessStateSchema, routeStatusSchema, sentimentStateSchema } from '../market/market';
export const actionAvailabilitySchema = z.enum(['available', 'simulated', 'planned', 'unavailable']);
export const recommendationActionSchema = z.enum(['accumulate', 'hold', 'watch', 'trim', 'avoid']);
export const bankConnectionStatusSchema = z.enum(['available', 'credentials-required', 'sandbox', 'unsupported', 'connected']);
export const investableAssetSummarySchema = z.object({
    assetId: z.string(),
    symbol: z.string(),
    name: z.string(),
    assetClass: z.enum(['stock', 'etf', 'crypto']),
    category: z.string(),
    geography: z.string().nullable(),
    sector: z.string().nullable(),
    thesis: z.string(),
    price: z.number().nullable(),
    changePercent: z.number().nullable(),
    freshnessState: freshnessStateSchema,
    lastUpdatedAt: z.string().nullable(),
    actionAvailability: actionAvailabilitySchema,
    isSimulated: z.boolean(),
    riskSummary: z.string(),
    insightStance: sentimentStateSchema,
});
export const investmentRecommendationSchema = z.object({
    assetId: z.string(),
    symbol: z.string(),
    action: recommendationActionSchema,
    confidence: z.number().min(0).max(1),
    suitability: z.enum(['high', 'medium', 'low']),
    summary: z.string(),
    reasons: z.array(z.string()),
    riskNotice: z.string(),
    isPersonalized: z.boolean(),
});
export const connectedInvestmentAccountSchema = z.object({
    providerKey: z.string(),
    providerLabel: z.string(),
    accountLabel: z.string(),
    ibanMasked: z.string(),
    connectionStatus: bankConnectionStatusSchema,
    lastSyncedAt: z.string().nullable(),
    sourceSummary: z.string(),
});
export const bankConnectionCapabilitySchema = z.object({
    providerKey: z.string(),
    providerLabel: z.string(),
    connectionStatus: bankConnectionStatusSchema,
    accessModel: z.enum(['psd2-xs2a', 'partner-api']),
    supportedScopes: z.array(z.enum(['balances', 'transactions', 'payments', 'multibanking'])),
    isConsentRequired: z.boolean(),
    requiresRegulatedPartner: z.boolean(),
    disclosure: z.string(),
    setupHint: z.string(),
});
export const investmentCapabilitySchema = z.object({
    assetClass: z.enum(['stock', 'etf', 'crypto']),
    title: z.string(),
    description: z.string(),
    actionAvailability: actionAvailabilitySchema,
    isSimulated: z.boolean(),
    supportedActions: z.array(z.string()),
    disclosure: z.string(),
});
export const investOverviewSchema = z.object({
    title: z.string(),
    description: z.string(),
    status: routeStatusSchema,
    freshnessState: freshnessStateSchema,
    lastUpdatedAt: z.string().nullable(),
    actionSummary: z.string(),
    capabilities: z.array(investmentCapabilitySchema),
    recommendations: z.array(investmentRecommendationSchema),
    bankConnections: z.array(bankConnectionCapabilitySchema),
    linkedAccounts: z.array(connectedInvestmentAccountSchema),
    featuredAssets: z.array(investableAssetSummarySchema),
    groupedAssets: z.array(z.object({
        assetClass: z.enum(['stock', 'etf', 'crypto']),
        label: z.string(),
        items: z.array(investableAssetSummarySchema),
    })),
    emptyStateMessage: z.string().nullable(),
});
