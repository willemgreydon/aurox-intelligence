import { z } from 'zod';
export declare const rankingRecommendationSchema: z.ZodEnum<{
    strong_buy: "strong_buy";
    buy: "buy";
    hold: "hold";
    sell: "sell";
    strong_sell: "strong_sell";
}>;
export declare const assetRankingSchema: z.ZodObject<{
    symbol: z.ZodString;
    assetId: z.ZodString;
    assetKind: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
    }>;
    rank: z.ZodNumber;
    score: z.ZodNumber;
    confidence: z.ZodNumber;
    recommendation: z.ZodEnum<{
        strong_buy: "strong_buy";
        buy: "buy";
        hold: "hold";
        sell: "sell";
        strong_sell: "strong_sell";
    }>;
    horizon: z.ZodEnum<{
        short: "short";
    }>;
    signalSummary: z.ZodString;
    factorSummary: z.ZodString;
    regimeSummary: z.ZodString;
    riskSummary: z.ZodString;
    explanation: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const rankedAssetListSchema: z.ZodObject<{
    generatedAt: z.ZodString;
    assetCount: z.ZodNumber;
    items: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        assetId: z.ZodString;
        assetKind: z.ZodEnum<{
            stock: "stock";
            etf: "etf";
            crypto: "crypto";
        }>;
        rank: z.ZodNumber;
        score: z.ZodNumber;
        confidence: z.ZodNumber;
        recommendation: z.ZodEnum<{
            strong_buy: "strong_buy";
            buy: "buy";
            hold: "hold";
            sell: "sell";
            strong_sell: "strong_sell";
        }>;
        horizon: z.ZodEnum<{
            short: "short";
        }>;
        signalSummary: z.ZodString;
        factorSummary: z.ZodString;
        regimeSummary: z.ZodString;
        riskSummary: z.ZodString;
        explanation: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RankingRecommendation = z.infer<typeof rankingRecommendationSchema>;
export type AssetRanking = z.infer<typeof assetRankingSchema>;
export type RankedAssetList = z.infer<typeof rankedAssetListSchema>;
//# sourceMappingURL=ranking.d.ts.map