import { z } from 'zod';
export const assetSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    assetClass: z.enum(['stock', 'etf', 'crypto', 'fx', 'index']),
    name: z.string(),
});
