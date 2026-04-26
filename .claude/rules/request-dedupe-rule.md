# Request Deduplication Rule

## Purpose
Multiple parallel requests for the same symbol's data must be deduplicated at the provider layer to avoid redundant provider calls, rate limit consumption, and inconsistent data between concurrent renders.

## Applies To
- `packages/providers/`
- `apps/web/server/queries/`
- `apps/worker/`

## Rule
Within a single request lifecycle (Next.js server render), identical provider calls for the same symbol must be deduplicated.

Next.js automatically deduplicates `fetch()` calls with the same URL and options within a single render pass. For non-fetch providers, explicit deduplication is required.

Deduplication requirements:
1. **Symbol-level deduplication**: If two components on the same page request AAPL quote, only one provider call is made
2. **Request-scoped deduplication**: Deduplication is per-request, not across requests (avoid cross-user data leaks)
3. **Cache key includes asset kind**: `AAPL-stock` must not deduplicate with `AAPL-crypto` (different assets)
4. **Worker deduplication**: Ingestion workers must not process the same symbol concurrently

## Forbidden
- Module-level `Map` caches that persist across requests (cross-user cache contamination)
- Deduplication that uses only `symbol` as key without `assetKind`
- Deduplication that silently returns stale data from a previous failed fetch
- No deduplication at all when multiple queries on the same page fetch the same symbol

## Required Pattern
```ts
// packages/providers/src/util/request-dedup.ts
// React cache() deduplicated within a single Next.js render
import { cache } from "react"

export const getQuoteCached = cache(async (symbol: string, assetKind: AssetKind): Promise<QuoteResult> => {
  return getQuoteWithFallback(symbol, assetKind)
})
// React cache() is per-request — no cross-request contamination
```

```ts
// apps/web/server/queries/market-query.ts
import { getQuoteCached } from "@repo/providers"

// Both of these calls within the same render dedup to one provider call:
const quoteForCard = await getQuoteCached("AAPL", "stock")
const quoteForChart = await getQuoteCached("AAPL", "stock")
```

## Validation
```bash
grep -r "cache from 'react'\|from \"react\"\|React\.cache" apps/web/server packages/providers/src --include="*.ts"
grep -r "Map\(\)\|new Map" packages/providers/src --include="*.ts" | grep -v "test\|spec"
pnpm build:web
```

## Good Example
```ts
export const getQuoteCached = cache(async (symbol: string, assetKind: AssetKind) => {
  return getQuoteWithFallback(symbol, assetKind)
})
// ✓ React cache() is request-scoped, deduplicated, no cross-user risk
```

## Bad Example
```ts
// Module-level cache — persists across requests
const quoteCache = new Map<string, Quote>()
export async function getQuote(symbol: string) {
  if (quoteCache.has(symbol)) return quoteCache.get(symbol)!
  // ✗ Cross-request contamination — user A sees user B's data
  const quote = await fetchQuote(symbol)
  quoteCache.set(symbol, quote)
  return quote
}
```

## Safety Notes
A module-level cache shared across requests means user A's request can populate a cache entry that user B's request then reads — serving a different user's data. In a financial system this is a data privacy violation and a correctness defect.
