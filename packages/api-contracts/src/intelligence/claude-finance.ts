import { z } from 'zod';

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
