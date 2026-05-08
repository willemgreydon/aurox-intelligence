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

export type NewsItem = z.infer<typeof newsItemSchema>;
export type NewsProviderHealth = z.infer<typeof newsProviderHealthSchema>;
export type NewsProviderStatus = z.infer<typeof newsProviderStatusSchema>;
export type NewsStreamResponse = z.infer<typeof newsStreamResponseSchema>;
export type NewsRiskFlag = z.infer<typeof newsRiskFlagSchema>;
export type NewsImpactExplanation = z.infer<typeof newsImpactExplanationSchema>;
export type NewsImpactTrace = z.infer<typeof newsImpactTraceSchema>;
