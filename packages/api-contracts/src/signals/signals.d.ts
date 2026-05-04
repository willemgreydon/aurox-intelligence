import { z } from 'zod';
export declare const signalSummarySchema: z.ZodObject<{
    assetId: z.ZodString;
    assetName: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        fx: "fx";
    }>;
    status: z.ZodEnum<{
        nominal: "nominal";
        attention: "attention";
        degraded: "degraded";
    }>;
    interpretation: z.ZodEnum<{
        neutral: "neutral";
        bullish: "bullish";
        bearish: "bearish";
    }>;
    score: z.ZodNumber;
    confidenceScore: z.ZodNumber;
    scoreBreakdown: z.ZodObject<{
        movingAverageContrib: z.ZodNumber;
        momentumContrib: z.ZodNumber;
        trendContrib: z.ZodNumber;
    }, z.core.$strip>;
    latestPrice: z.ZodNullable<z.ZodNumber>;
    shortMovingAverage: z.ZodNullable<z.ZodNumber>;
    longMovingAverage: z.ZodNullable<z.ZodNumber>;
    momentumValue: z.ZodNullable<z.ZodNumber>;
    volatilityValue: z.ZodNumber;
    trendStrengthValue: z.ZodNumber;
    producedAt: z.ZodString;
    notes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type SignalSummary = z.infer<typeof signalSummarySchema>;
//# sourceMappingURL=signals.d.ts.map