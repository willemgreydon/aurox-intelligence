# Cache Safety Rule

## Purpose
Cached data must never be used for execution decisions without freshness verification. Financial display data must declare its cache TTL. User-specific data must never be served from a shared cache.

## Applies To
- `apps/web/app/`
- `apps/web/server/services/`
- `apps/web/server/queries/`

## Rule
Cache categories and their safety requirements:

| Data Type | Max Cache TTL | User-Specific | Staleness Flag Required |
|---|---|---|---|
| Market quote (display only) | 60s | No | Yes (`isStale: true` if >60s) |
| OHLCV history (display) | 5m | No | No (historical is stable) |
| Portfolio/positions | No cache | Yes | N/A — must be fresh |
| Signal scores | 5m | No | Yes if >5m |
| Simulation account balance | No cache | Yes | N/A |
| Market rankings | 5m | No | No |
| News/fundamentals | 30m | No | No |

Execution decisions must **never** use cached data. They must read current state from DB and current quotes from the live provider.

Next.js cache behavior must be declared explicitly on every server fetch:
```ts
// Static / long-lived (market metadata)
fetch(url, { cache: "force-cache", next: { revalidate: 3600 } })

// Time-sensitive display data
fetch(url, { next: { revalidate: 60 } })

// Dynamic user-specific data
fetch(url, { cache: "no-store" })
```

## Forbidden
- `cache: "force-cache"` on portfolio or account balance fetches
- Portfolio or simulation balance served from edge cache
- Execution decisions made with data from Next.js fetch cache
- Cache TTL set to 0 for all data (destroys provider request budgets)
- Not declaring cache behavior (relying on Next.js defaults)

## Required Pattern
```ts
// apps/web/server/queries/market-query.ts
// Market quote — short cache, staleness-aware
const quoteRes = await fetch(quoteUrl, { next: { revalidate: 60 } })
const quote = await quoteRes.json()
const isStale = Date.now() - quote.timestamp > 60_000

// Portfolio — no cache, user-specific
const portfolioRes = await fetch(portfolioUrl, { cache: "no-store" })
```

## Validation
```bash
grep -r "cache.*force-cache\|revalidate" apps/web/server/queries apps/web/server/services --include="*.ts"
grep -r "no-store" apps/web/server/queries --include="*.ts" | grep -i "portfolio\|account\|balance"
pnpm build:web
```

## Good Example
```ts
// User portfolio — never cached
const data = await fetch(url, { cache: "no-store" })
// ✓ Each request reads fresh state
```

## Bad Example
```ts
// Portfolio accidentally cached
const data = await fetch(url)  // ✗ Next.js default may cache this
// User sees stale balance that doesn't reflect recent trade
```

## Safety Notes
A cached portfolio balance shown after a trade fill gives the user a false sense of their position. If an execution decision reads a cached price, it can submit an order based on a 5-minute-old price that has since moved significantly. Cache staleness in a financial system is a correctness problem, not just a UX problem.
