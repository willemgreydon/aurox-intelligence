import { z } from 'zod';

export const newsProviderHealthSchema = z.enum(['healthy', 'degraded', 'unavailable', 'disabled']);
export const newsRiskFlagSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const newsItemSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  assetId: z.string().optional(),
  assetIds: z.array(z.string()).default([]),
  symbols: z.array(z.string()).default([]),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'macro']).optional(),
  companyName: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  url: z.string().url(),
  source: z.string(),
  publishedAt: z.string(),
  provider: z.string(),
  language: z.string(),
  sentimentScore: z.number().min(-1).max(1).optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  impactScore: z.number().min(0).max(1).optional(),
  categories: z.array(z.string()),
  tickers: z.array(z.string()),
  riskTags: z.array(z.string()).default([]),
  extractedEntities: z.array(z.string()).default([]),
  stale: z.boolean().optional(),
  raw: z.unknown().optional(),
});

export const newsProviderStatusSchema = z.object({
  provider: z.string(),
  health: newsProviderHealthSchema,
  detail: z.string(),
  latencyMs: z.number().nonnegative().nullable(),
  lastCheckedAt: z.string().nullable(),
});

export const newsStreamResponseSchema = z.object({
  items: z.array(newsItemSchema),
  providerHealth: z.array(newsProviderStatusSchema),
  updatedAt: z.string(),
  degraded: z.boolean(),
  message: z.string().optional(),
});

export const newsImpactExplanationSchema = z.object({
  symbol: z.string(),
  score: z.number().min(0).max(1),
  riskFlag: newsRiskFlagSchema,
  keyDrivers: z.array(z.string()),
  positiveSignals: z.array(z.string()),
  negativeSignals: z.array(z.string()),
  uncertaintyNotes: z.array(z.string()),
  sourceCount: z.number().int().nonnegative(),
  latestPublishedAt: z.string().nullable(),
});

export const newsImpactTraceSchema = z.object({
  symbol: z.string(),
  assetId: z.string().optional(),
  sentimentAdjustment: z.number().min(-1).max(1),
  confidenceAdjustment: z.number().min(-1).max(1),
  riskAdjustment: z.number().min(-1).max(1),
  explanation: z.array(z.string()),
  influencedByNewsIds: z.array(z.string()),
  computedAt: z.string(),
});

export const newsIntelligenceEventTypeSchema = z.enum([
  'earnings',
  'guidance',
  'revenue',
  'profit',
  'margin',
  'layoffs',
  'product_launch',
  'regulatory',
  'lawsuit',
  'analyst_rating',
  'merger_acquisition',
  'macro_event',
  'inflation_rates',
  'etf_flow',
  'crypto_exchange_event',
  'on_chain_event',
  'security_breach',
  'liquidity_event',
  'bankruptcy_default_risk',
  'supply_chain',
  'management_change',
]);

export const marketImpactHorizonSchema = z.enum([
  'intraday',
  'short_term',
  'medium_term',
  'long_term',
  'unknown',
]);

export const newsArticleNormalizedSchema = z.object({
  id: z.string(),
  provider: z.string(),
  providerArticleId: z.string().nullable(),
  title: z.string(),
  url: z.string().url(),
  sourceName: z.string(),
  publishedAt: z.string(),
  fetchedAt: z.string(),
  symbols: z.array(z.string()),
  assetIds: z.array(z.string()),
  assetClasses: z.array(z.enum(['stock', 'etf', 'crypto', 'macro', 'other'])),
  language: z.string().nullable(),
  summary: z.string().nullable(),
  contentHash: z.string(),
  rawMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const newsIntelligenceSnapshotSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  provider: z.string(),
  contentHash: z.string(),
  symbols: z.array(z.string()),
  assetIds: z.array(z.string()),
  assetClasses: z.array(z.enum(['stock', 'etf', 'crypto', 'macro', 'other'])),
  entities: z.array(z.string()),
  topics: z.array(z.string()),
  eventTypes: z.array(newsIntelligenceEventTypeSchema),
  sentimentScore: z.number().min(-1).max(1),
  sentimentLabel: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  relevanceScore: z.number().min(0).max(1),
  urgencyScore: z.number().min(0).max(1),
  noveltyScore: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(100),
  opportunityScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  marketImpactHorizon: marketImpactHorizonSchema,
  affectedSignals: z.array(z.string()),
  affectedRiskFactors: z.array(z.string()),
  extractedIndicators: z.record(z.string(), z.unknown()),
  decisionHints: z.array(z.string()),
  explanation: z.array(z.string()),
  sourceUrl: z.string().url(),
  sourceTitle: z.string(),
  sourceName: z.string(),
  publishedAt: z.string(),
  createdAt: z.string(),
});

export type NewsItem = z.infer<typeof newsItemSchema>;
export type NewsProviderHealth = z.infer<typeof newsProviderHealthSchema>;
export type NewsProviderStatus = z.infer<typeof newsProviderStatusSchema>;
export type NewsStreamResponse = z.infer<typeof newsStreamResponseSchema>;
export type NewsRiskFlag = z.infer<typeof newsRiskFlagSchema>;
export type NewsImpactExplanation = z.infer<typeof newsImpactExplanationSchema>;
export type NewsImpactTrace = z.infer<typeof newsImpactTraceSchema>;
export type NewsArticleNormalized = z.infer<typeof newsArticleNormalizedSchema>;
export type NewsIntelligenceSnapshot = z.infer<typeof newsIntelligenceSnapshotSchema>;
export type NewsIntelligenceEventType = z.infer<typeof newsIntelligenceEventTypeSchema>;
export type MarketImpactHorizon = z.infer<typeof marketImpactHorizonSchema>;
