import { z } from 'zod';

export const rankingRecommendationSchema = z.enum([
  'strong_buy',
  'buy',
  'hold',
  'sell',
  'strong_sell',
]);

export const assetRankingSchema = z.object({
  symbol: z.string(),
  assetId: z.string(),
  assetKind: z.enum(['stock', 'etf', 'crypto']),
  rank: z.number().int().positive(),
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  recommendation: rankingRecommendationSchema,
  horizon: z.enum(['short']),
  signalSummary: z.string(),
  factorSummary: z.string(),
  regimeSummary: z.string(),
  riskSummary: z.string(),
  explanation: z.string(),
  updatedAt: z.string(),
});

export const rankedAssetListSchema = z.object({
  generatedAt: z.string(),
  assetCount: z.number().int().nonnegative(),
  items: z.array(assetRankingSchema),
});

export type RankingRecommendation = z.infer<typeof rankingRecommendationSchema>;
export type AssetRanking = z.infer<typeof assetRankingSchema>;
export type RankedAssetList = z.infer<typeof rankedAssetListSchema>;
