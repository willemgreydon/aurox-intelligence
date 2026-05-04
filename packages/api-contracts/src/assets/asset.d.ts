import { z } from 'zod';
export declare const assetSchema: z.ZodObject<{
    id: z.ZodString;
    symbol: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
        fx: "fx";
        index: "index";
    }>;
    name: z.ZodString;
}, z.core.$strip>;
export declare const canonicalAssetMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    symbol: z.ZodString;
    displaySymbol: z.ZodString;
    name: z.ZodString;
    assetClass: z.ZodEnum<{
        stock: "stock";
        etf: "etf";
        crypto: "crypto";
        fx: "fx";
        index: "index";
    }>;
    tags: z.ZodArray<z.ZodString>;
    searchAliases: z.ZodArray<z.ZodString>;
    tradability: z.ZodObject<{
        simulation: z.ZodBoolean;
        plannedLive: z.ZodBoolean;
    }, z.core.$strip>;
    providerSymbolMap: z.ZodRecord<z.ZodString, z.ZodString>;
    brokerIdentifierMap: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip>;
export type Asset = z.infer<typeof assetSchema>;
export type CanonicalAssetMetadata = z.infer<typeof canonicalAssetMetadataSchema>;
//# sourceMappingURL=asset.d.ts.map