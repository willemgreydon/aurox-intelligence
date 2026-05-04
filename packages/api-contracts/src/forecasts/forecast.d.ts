import { z } from 'zod';
export declare const forecastSchema: z.ZodObject<{
    assetId: z.ZodString;
    horizon: z.ZodEnum<{
        short: "short";
        medium: "medium";
        long: "long";
    }>;
    directionalBias: z.ZodEnum<{
        neutral: "neutral";
        bullish: "bullish";
        bearish: "bearish";
    }>;
    confidenceScore: z.ZodNumber;
    scenarioSummary: z.ZodString;
    scenarioWeights: z.ZodObject<{
        bullish: z.ZodNumber;
        base: z.ZodNumber;
        bearish: z.ZodNumber;
    }, z.core.$strip>;
    keyDrivers: z.ZodArray<z.ZodString>;
    riskFactors: z.ZodArray<z.ZodString>;
    producedAt: z.ZodString;
}, z.core.$strip>;
export type Forecast = z.infer<typeof forecastSchema>;
//# sourceMappingURL=forecast.d.ts.map