# Market Provider Rules

## Purpose
Market data providers are the source of all external price, volume, and fundamental data. Provider access must be normalized, fallback-chained, health-checked, and key-safe.

## Applies To
- `packages/providers/`
- `packages/providers/src/market/routing.ts`

## Rule
The supported provider list for Aurox:
- `polygon` (default primary for stocks/ETFs)
- `twelve-data`
- `tiingo`
- `coingecko` (primary for crypto)
- `finnhub`
- `eodhd`

Each provider adapter must implement:
```ts
interface MarketProviderAdapter {
  name: string
  supportsAssetKind(kind: AssetKind): boolean
  getQuote(symbol: string): Promise<Quote>
  getOHLCV(symbol: string, interval: string, limit: number): Promise<OHLCV[]>
  healthCheck(): Promise<ProviderHealthResult>
}
```

Provider routing lives at:
```text
packages/providers/src/market/routing.ts
```

Provider selection order must be configured (not hardcoded in each usage site).

All provider responses must be normalized to canonical types before leaving `packages/providers`.

## Forbidden
- Calling provider APIs directly from outside `packages/providers`
- Provider API keys in `apps/web` code
- Using raw provider response shapes in `packages/signals` or UI
- Adding a new provider without implementing `healthCheck()`
- Adding a new provider without normalizing to canonical `Quote` / `OHLCV` shapes
- Skipping error handling on provider calls

## Required Pattern
```ts
// packages/providers/src/market/polygon-adapter.ts
export const polygonAdapter: MarketProviderAdapter = {
  name: "polygon",
  supportsAssetKind: (kind) => kind === "stock" || kind === "etf",
  getQuote: async (symbol) => {
    const raw = await callPolygonApi(symbol)
    return normalizePolygonQuote(raw)   // ← always normalize before returning
  },
  healthCheck: async () => {
    try {
      await callPolygonApi("AAPL")
      return { healthy: true, provider: "polygon" }
    } catch {
      return { healthy: false, provider: "polygon" }
    }
  }
}
```

## Validation
```bash
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/providers test
grep -r "healthCheck" packages/providers/src --include="*.ts"
grep -r "normaliz" packages/providers/src --include="*.ts"
```

## Good Example
```ts
// packages/providers/src/market/routing.ts
const result = await getQuoteWithFallback(symbol)
// result.quote is canonical Quote type, provider-agnostic
// ✓ Normalized, fallback-chained, caller doesn't know which provider fired
```

## Bad Example
```ts
// apps/web/server/services/market-service.ts
const raw = await fetch(`https://api.polygon.io/v2/...?apiKey=${process.env.POLYGON_KEY}`)
const data = await raw.json()
// ✗ Direct provider call from service, no normalization, key exposure risk
```

## Safety Notes
Non-normalized provider responses cause type errors downstream when provider B returns different field names than provider A. A missing healthCheck means the fallback chain cannot skip a degraded provider and may stall on retries.
