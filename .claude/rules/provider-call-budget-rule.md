# Provider Call Budget Rule

## Purpose
Provider API calls have hard limits (free tier quotas, paid plan budgets). Every page render must not exceed a sensible per-request provider call budget. Unbounded provider usage causes quota exhaustion and silent data gaps.

## Applies To
- `apps/web/server/queries/`
- `apps/worker/`
- `packages/providers/`

## Rule
Maximum provider calls per page render:

| Page | Max Provider Calls | Strategy |
|---|---|---|
| Market overview | 1 (batch) | Batch fetch all visible symbols |
| Portfolio page | 1 (batch) | Batch fetch all position symbols |
| Asset detail | 2 (quote + history) | Sequential is acceptable |
| Rankings / screener | 1 (batch) | Pre-fetched rankings, batch quotes |
| Trade ticket | 1 (current quote) | Only latest price needed |

Worker (background ingestion):
- Max 1 provider call per symbol per minute
- Max 10 concurrent ingestion tasks per provider
- Must respect `PROVIDER_CALL_BUDGET_PER_MIN` config

Batch fetch pattern:
```ts
// One call for many symbols — not one call per symbol
const quotes = await getBatchQuotes(["AAPL", "MSFT", "GOOGL", "AMZN"])
```

If a provider does not support batch fetch, use deduplication + request coalescing.

## Forbidden
- N provider calls for N symbols on a single page render
- Loading a list of 50 stocks and fetching a quote for each
- Worker that calls provider with no throttling between requests
- No budget monitoring — calls should be counted and logged

## Required Pattern
```ts
// apps/web/server/queries/portfolio-query.ts
export async function getPortfolioQuotes(positions: SimulationPosition[]): Promise<Map<string, Quote>> {
  const symbols = [...new Set(positions.map(p => p.symbol))]
  if (symbols.length === 0) return new Map()
  // ONE provider call for ALL symbols
  const quotes = await getBatchQuotes(symbols)
  return new Map(quotes.map(q => [q.symbol, q]))
}
```

## Validation
```bash
grep -r "getQuote\|fetchQuote\|getSnapshot" apps/web/server/queries --include="*.ts" | grep -v "Batch\|batch"
grep -r "for.*getQuote\|forEach.*getQuote\|map.*getQuote" apps/web/server --include="*.ts"
grep -r "getBatchQuotes\|batchFetch" packages/providers/src --include="*.ts"
```

## Good Example
```ts
const allQuotes = await getBatchQuotes(positions.map(p => p.symbol))
// ✓ 1 API call for 20 positions
```

## Bad Example
```ts
const quotes = await Promise.all(positions.map(p => getQuote(p.symbol)))
// ✗ 20 simultaneous API calls — 20x quota consumption, likely to hit rate limit
```

## Safety Notes
A portfolio page with 20 positions making 20 individual quote calls will exhaust a free-tier Polygon quota within minutes of normal usage. Once the quota is exhausted, all quotes return errors — the portfolio page goes blank without explanation. Batch calls are a reliability requirement.
