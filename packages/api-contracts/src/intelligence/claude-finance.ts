import { z } from 'zod';
import type { ActionAvailability } from '../invest/invest';

export const claudeFinanceAnalysisSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'macro']),
  summary: z.string().min(1),
  bullishFactors: z.array(z.string()),
  bearishFactors: z.array(z.string()),
  riskFlags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoningTrace: z.array(z.string()),
  timestamp: z.string(),
  degraded: z.boolean().default(false),
  degradedReason: z.string().optional(),
});

export type ClaudeFinanceAnalysis = z.infer<typeof claudeFinanceAnalysisSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Claude Finance cockpit — simulation-only, preview-only contracts
//
// These contracts back the /finance cockpit. They describe a PREVIEW of a
// simulated broker activity. They never authorize execution: every activity
// carries simulationOnly: true and liveAllowed: false, and is a mapped view of
// the deterministic broker decision engine (packages/agents broker-intelligence).
// ──────────────────────────────────────────────────────────────────────────

export const claudeFinanceActivityModeSchema = z.enum([
  'micro-trading',
  'portfolio-rebalance',
  'watchlist-analysis',
]);
export type ClaudeFinanceActivityMode = z.infer<typeof claudeFinanceActivityModeSchema>;

export const claudeFinanceActivityActionSchema = z.enum(['buy', 'sell', 'hold', 'watch']);
export type ClaudeFinanceActivityAction = z.infer<typeof claudeFinanceActivityActionSchema>;

export const claudeFinanceRiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type ClaudeFinanceRiskLevel = z.infer<typeof claudeFinanceRiskLevelSchema>;

/**
 * Input for generating a simulated broker activity preview.
 * Crypto/stock/etf only — matches the simulation engine's tradable universe.
 */
export const claudeFinanceActivityInputSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1).max(32),
  assetClass: z.enum(['stock', 'etf', 'crypto']),
  side: z.enum(['buy', 'sell']),
  quantity: z.coerce.number().positive().max(1_000_000),
  mode: claudeFinanceActivityModeSchema.default('watchlist-analysis'),
});
export type ClaudeFinanceActivityInput = z.infer<typeof claudeFinanceActivityInputSchema>;

export const claudeFinanceQuoteSnapshotSchema = z.object({
  price: z.number().nullable(),
  changePercent: z.number().nullable(),
  source: z.string().nullable(),
  observedAt: z.string().nullable(),
  freshnessLabel: z.string(),
});
export type ClaudeFinanceQuoteSnapshot = z.infer<typeof claudeFinanceQuoteSnapshotSchema>;

/**
 * A deterministic, simulation-only preview of a broker activity.
 * This is a presentation view of a BrokerDecision — never an order.
 */
export const simulatedBrokerActivitySchema = z.object({
  id: z.string(),
  mode: claudeFinanceActivityModeSchema,
  symbol: z.string(),
  assetId: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto']),
  action: claudeFinanceActivityActionSchema,
  simulatedQuantity: z.number().nullable(),
  simulatedNotional: z.number().nullable(),
  simulatedNotionalLabel: z.string(),
  confidence: z.number().min(0).max(1),
  confidenceLabel: z.string(),
  riskLevel: claudeFinanceRiskLevelSchema,
  executable: z.boolean(),
  quoteSnapshot: claudeFinanceQuoteSnapshotSchema,
  estimatedFillLabel: z.string(),
  estimatedFeesLabel: z.string(),
  nextBestAction: z.string(),
  decisionSummary: z.string(),
  explanation: z.string(),
  warnings: z.array(z.string()),
  blockingReasons: z.array(z.string()),
  createdAt: z.string(),
  // Hard safety invariants — never authorize execution from this surface.
  simulationOnly: z.literal(true),
  liveAllowed: z.literal(false),
});
export type SimulatedBrokerActivity = z.infer<typeof simulatedBrokerActivitySchema>;

/** A starred (watched) market lane card rendered in the cockpit. */
export type ClaudeFinanceLaneCard = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  category: string;
  thesis: string;
  riskSummary: string;
  actionAvailability: ActionAvailability;
  priceLabel: string;
  changeLabel: string;
  changeStance: 'positive' | 'negative' | 'neutral';
  freshnessLabel: string;
  isWatched: boolean;
  isOwned: boolean;
  canGenerateActivity: boolean;
};

/** A previously saved Claude Finance decision, surfaced as recent history. */
export type ClaudeFinanceRecentDecision = {
  id: string;
  symbol: string | null;
  action: string;
  confidenceLabel: string;
  notionalLabel: string;
  summary: string;
  createdAt: string;
};

/** Cockpit page read model — fully display-ready, no domain math in UI. */
export type ClaudeFinanceCockpitViewModel = {
  status: 'nominal' | 'degraded' | 'empty';
  statusReason: string;
  simulationOnlyNotice: string;
  hero: {
    portfolioValueLabel: string;
    cashLabel: string;
    investedLabel: string;
    openPositionsLabel: string;
    freshnessLabel: string;
    portfolioState: string;
  };
  intelligence: {
    healthLabel: string;
    averageConfidenceLabel: string;
    averageRiskLabel: string;
    regimeLabel: string;
    topOpportunities: Array<{ symbol: string; action: string; reason: string }>;
    assetsToWatch: Array<{ symbol: string; action: string; reason: string }>;
    explanation: string;
  };
  starredLanes: ClaudeFinanceLaneCard[];
  starredEmptyMessage: string | null;
  recentDecisions: ClaudeFinanceRecentDecision[];
  microTradingEnabled: boolean;
};
