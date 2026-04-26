# Slow Route Performance Rule

## Purpose
Route handlers and server components must not make sequential provider or DB calls that can be parallelized. A slow page in a financial workstation degrades the user's ability to act on time-sensitive information.

## Applies To
- `apps/web/server/queries/`
- `apps/web/server/services/`
- `apps/web/app/`

## Rule
Performance targets for Aurox workstation routes:

| Route | Target Load Time | Max Provider Calls |
|---|---|---|
| Market overview | <1s | 1 (batch fetch) |
| Portfolio / invest | <800ms | 1 batch position price fetch |
| Asset detail | <1.2s | 2 (quote + history) |
| Trade ticket | <500ms | 1 (quote for pricing) |
| Rankings / screener | <2s | 1 batch |

Rules:
1. **Parallelize independent fetches** — use `Promise.all` for fetches with no dependency order
2. **Batch symbol fetches** — fetch all symbols in one call rather than N calls for N symbols
3. **No sequential DB + provider chains when parallel is possible**
4. **Stream heavy pages** — use Next.js `Suspense` boundaries for independent slow sections
5. **No N+1 fetches** — loading N positions and then fetching a quote per position separately

## Forbidden
- `for (const symbol of symbols) { const quote = await getQuote(symbol) }` — sequential N calls
- Multiple `await` in sequence when they have no dependency
- Route that calls 5 providers before returning anything to the user
- DB query that loads all positions + a separate query per position for quotes

## Required Pattern
```ts
// apps/web/server/queries/portfolio-query.ts
export async function getPortfolioQueryData(accountId: string) {
  // All independent fetches in parallel
  const [positions, account, marketStatus] = await Promise.all([
    getSimulationPositions(accountId),
    getSimulationAccount(accountId),
    getMarketStatus()
  ])

  // Batch quote fetch for all symbols at once
  const symbols = positions.map(p => p.symbol)
  const quotes = await getBatchQuotes(symbols)

  return { positions, account, marketStatus, quotes }
}
```

## Validation
```bash
grep -rn "await.*\n.*await\|await.*; await" apps/web/server/queries apps/web/server/services --include="*.ts"
grep -r "for.*await\|forEach.*await" apps/web/server/queries apps/web/server/services --include="*.ts"
grep -r "Promise\.all" apps/web/server/queries --include="*.ts"
pnpm build:web
```

## Good Example
```ts
const [quote, history, fundamentals] = await Promise.all([
  getQuote(symbol),
  getOHLCVHistory(symbol, "1d", 90),
  getFundamentals(symbol)
])
// ✓ Three independent calls run in parallel — ~1x latency instead of 3x
```

## Bad Example
```ts
const quote = await getQuote(symbol)         // sequential: waits 300ms
const history = await getOHLCV(symbol)       // sequential: waits 400ms
const fundamentals = await getFundamentals(symbol)  // sequential: waits 200ms
// ✗ Total: 900ms — could be 400ms with Promise.all
```

## Safety Notes
A trade ticket that takes 2 seconds to load means a user is acting on a price from 2 seconds ago. In volatile markets, that's the difference between a good fill and a bad one. Slow routes in execution-adjacent screens are a financial accuracy concern, not just a UX concern.
