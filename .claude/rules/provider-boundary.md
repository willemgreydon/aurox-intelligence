# Provider Boundary Rule

## Purpose
All external market, macro, news, and banking data access must go through `packages/providers`. This ensures normalization, fallback routing, API key safety, and rate limit control are centralized.

## Applies To
- `packages/providers/`
- `apps/web/server/queries/`
- `apps/web/server/services/`
- `apps/worker/`
- Any code that touches external market data APIs

## Rule
The only permitted place for external provider calls is `packages/providers`.

Provider routing lives at:
```text
packages/providers/src/market/routing.ts
```

All calls to polygon, twelve-data, tiingo, coingecko, finnhub, eodhd, or any other external data source must go through this routing layer.

## Forbidden
- `fetch()` calls to provider APIs from `apps/web/app/**`
- `fetch()` calls to provider APIs from `apps/web/components/**`
- `fetch()` calls to provider APIs from `apps/web/server/services/**`
- Provider API keys in any file outside `packages/providers` config modules
- Hardcoded provider URLs in routes or components
- Creating a second provider routing system in `apps/web`
- Bypassing fallback routing to call a specific provider directly from services

## Required Pattern
```text
apps/web server service
  → calls packages/providers routing function
  → routing selects provider with fallback chain
  → provider normalizes response to canonical shape
  → service receives canonical MarketSnapshot / OHLCV / Quote
```

## Validation
```bash
grep -r "polygon\|twelve-data\|tiingo\|coingecko\|finnhub\|eodhd" apps/web --include="*.ts" --include="*.tsx"
grep -r "POLYGON_API_KEY\|TIINGO_API_KEY\|COINGECKO_API" apps/web --include="*.ts" --include="*.tsx"
pnpm --filter @repo/providers typecheck
```

## Good Example
```ts
// apps/web/server/queries/market-query.ts
import { getQuoteSnapshot } from "@repo/providers"
const quote = await getQuoteSnapshot({ symbol: "AAPL", assetKind: "stock" })
// ✓ Query layer uses provider abstraction
```

## Bad Example
```ts
// apps/web/app/invest/page.tsx
const res = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}?apiKey=${process.env.POLYGON_KEY}`)
// ✗ Route calling provider directly — boundary violation, key exposure risk
```

## Safety Notes
Provider API keys exposed in `apps/web` routes can leak to client bundles via server component serialization. Bypassing the fallback routing causes silent data gaps when a provider is down — which can produce zero-price signals entering the execution system.
