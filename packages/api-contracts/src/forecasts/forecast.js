import { z } from 'zod';
export const forecastSchema = z.object({
    assetId: z.string(),
    horizon: z.enum(['short', 'medium', 'long']),
    directionalBias: z.enum(['bullish', 'bearish', 'neutral']),
    confidenceScore: z.number().min(0).max(1),
    scenarioSummary: z.string(),
    scenarioWeights: z.object({
        bullish: z.number().min(0).max(1),
        base: z.number().min(0).max(1),
        bearish: z.number().min(0).max(1),
    }),
    keyDrivers: z.array(z.string()),
    riskFactors: z.array(z.string()),
    producedAt: z.string(),
});
