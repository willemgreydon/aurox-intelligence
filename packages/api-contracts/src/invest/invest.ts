import { z } from 'zod';
import { freshnessStateSchema, routeStatusSchema, sentimentStateSchema } from '../market/market';
import { simulationLaneIdSchema } from '../simulation/simulation';
import { assetRankingSchema } from '../ranking/ranking';

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

export const brokerExecutionCapabilitySchema = z.object({
  executionTarget: z.enum(['simulation', 'live']),
  supportedAssetClasses: z.array(z.enum(['stock', 'etf', 'crypto'])),
  requiresReadinessChecks: z.boolean(),
  supportsDryRun: z.boolean(),
  notes: z.string(),
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
  groupedAssets: z.array(
    z.object({
      assetClass: z.enum(['stock', 'etf', 'crypto']),
      label: z.string(),
      items: z.array(investableAssetSummarySchema),
    }),
  ),
  rankedAssets: z.array(assetRankingSchema),
  emptyStateMessage: z.string().nullable(),
});

export const portfolioFilterStateSchema = z.object({
  view: z.enum(['grid', 'list']),
  lane: z.enum(['all', 'current']),
  assetClass: z.enum(['all', 'stock', 'etf', 'crypto']),
  positionState: z.enum(['all', 'open', 'closed']),
});

export const portfolioPositionItemSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  name: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto']),
  quantity: z.number(),
  averageCost: z.number(),
  marketPrice: z.number().nullable(),
  marketValue: z.number(),
  costBasis: z.number(),
  unrealizedPnl: z.number(),
  realizedPnl: z.number(),
  allocationPercent: z.number(),
  openedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  lastUpdatedAt: z.string(),
  sparkline: z.array(z.number()),
  isWatched: z.boolean(),
});

export const portfolioRecentTradeSchema = z.object({
  orderId: z.string(),
  side: z.enum(['buy', 'sell']),
  symbol: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto']),
  quantity: z.number(),
  executedPrice: z.number(),
  grossAmount: z.number(),
  cashEffect: z.number(),
  realizedPnl: z.number(),
  executedAt: z.string(),
  source: z.enum(['manual', 'ai_suggested', 'ai_autonomous', 'unknown']),
});

export const portfolioAllocationItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  percent: z.number(),
});

export const portfolioRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical', 'unavailable']);

export const portfolioRiskProfileSchema = z.object({
  level: portfolioRiskLevelSchema,
  drawdownPercent: z.number().nonnegative(),
  topConcentrationSymbol: z.string().nullable(),
  topConcentrationPercent: z.number().nonnegative(),
  explanation: z.string(),
});

export const investPortfolioViewModelSchema = z.object({
  status: routeStatusSchema,
  statusReason: z.string(),
  sessionId: z.string().nullable(),
  laneId: simulationLaneIdSchema.nullable(),
  filters: portfolioFilterStateSchema,
  summary: z.object({
    equityValue: z.number(),
    portfolioValue: z.number(),
    cashBalance: z.number(),
    availableCash: z.number(),
    buyingPower: z.number(),
    unrealizedPnl: z.number(),
    realizedPnl: z.number(),
    openPositionCount: z.number().int().nonnegative(),
    closedPositionCount: z.number().int().nonnegative(),
  }).nullable(),
  openPositions: z.array(portfolioPositionItemSchema),
  closedPositions: z.array(portfolioPositionItemSchema),
  recentTrades: z.array(portfolioRecentTradeSchema),
  allocationByAssetClass: z.array(portfolioAllocationItemSchema),
  allocationByAsset: z.array(portfolioAllocationItemSchema),
  watchlistCount: z.number().int().nonnegative(),
  emptyStateMessage: z.string().nullable(),
  riskProfile: portfolioRiskProfileSchema.nullable(),
  asOf: z.string(),
});

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
