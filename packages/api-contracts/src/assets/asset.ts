import { z } from 'zod';

export const assetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'fx', 'index']),
  name: z.string(),
});

export const canonicalAssetMetadataSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  displaySymbol: z.string(),
  name: z.string(),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'fx', 'index']),
  tags: z.array(z.string()),
  searchAliases: z.array(z.string()),
  tradability: z.object({
    simulation: z.boolean(),
    plannedLive: z.boolean(),
  }),
  providerSymbolMap: z.record(z.string(), z.string()),
  brokerIdentifierMap: z.record(z.string(), z.string()),
});

export type Asset = z.infer<typeof assetSchema>;
export type CanonicalAssetMetadata = z.infer<typeof canonicalAssetMetadataSchema>;
