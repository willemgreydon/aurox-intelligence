import { z } from 'zod';
const routeStatusSchema = z.enum(['nominal', 'attention', 'degraded']);
export const signalSummarySchema = z.object({
    assetId: z.string(),
    assetName: z.string(),
    assetClass: z.enum(['stock', 'fx']),
    status: routeStatusSchema,
    interpretation: z.enum(['bullish', 'bearish', 'neutral']),
    score: z.number(),
    confidenceScore: z.number().min(0).max(1),
    scoreBreakdown: z.object({
        movingAverageContrib: z.number(),
        momentumContrib: z.number(),
        trendContrib: z.number(),
    }),
    latestPrice: z.number().nullable(),
    shortMovingAverage: z.number().nullable(),
    longMovingAverage: z.number().nullable(),
    momentumValue: z.number().nullable(),
    volatilityValue: z.number(),
    trendStrengthValue: z.number(),
    producedAt: z.string(),
    notes: z.array(z.string()),
});
