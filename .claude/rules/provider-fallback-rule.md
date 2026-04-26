# Provider Fallback Rule

## Purpose
When the primary market data provider fails, the system must transparently fall back to the next available provider. Fallback must be explicit, observable, and never produce silent data gaps.

## Applies To
- `packages/providers/src/market/routing.ts`
- All provider adapter implementations

## Rule
Fallback chain requirements:
1. Providers are tried in configured priority order
2. Each provider attempt is logged with outcome
3. If a provider fails, the next in chain is tried immediately
4. If all providers fail: return typed failure — never return fabricated data
5. The caller must always know whether the result came from primary or fallback
6. A degraded/fallback state must be propagated to the UI (lower confidence, `isFallback: true`)

Return shape from routing:
```ts
type QuoteResult = {
  quote: Quote | null
  provider: string | null
  isFallback: boolean
  isStale: boolean
  error?: "all_providers_failed" | "timeout" | "rate_limited"
}
```

Fallback chain is configured in:
```text
packages/providers/src/market/routing.ts
```

## Forbidden
- Silent fallback (fallback fires but caller is not told)
- Fallback chain with only one provider (defeats the purpose)
- Returning the last successful quote without marking `isStale: true`
- Retrying the same provider more than once in the same fallback chain pass
- Fallback that catches all errors including programming errors (only catch network/API failures)
- Provider adapters that have no timeout

## Required Pattern
```ts
const STOCK_PROVIDER_CHAIN = ["polygon", "tiingo", "twelve-data", "finnhub"]

export async function getQuoteWithFallback(symbol: string): Promise<QuoteResult> {
  for (const providerName of STOCK_PROVIDER_CHAIN) {
    const adapter = getProviderAdapter(providerName)
    if (!adapter.supportsAssetKind(resolveAssetKind(symbol))) continue
    try {
      const quote = await withTimeout(adapter.getQuote(symbol), 5000)
      return { quote, provider: providerName, isFallback: providerName !== STOCK_PROVIDER_CHAIN[0], isStale: false }
    } catch (err) {
      log.warn(`Provider ${providerName} failed`, { symbol, err: String(err) })
    }
  }
  return { quote: null, provider: null, isFallback: true, isStale: true, error: "all_providers_failed" }
}
```

## Validation
```bash
grep -r "PROVIDER_CHAIN\|providerChain\|fallback" packages/providers/src/market --include="*.ts"
grep -r "isFallback\|isStale" packages/providers/src --include="*.ts"
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/providers test
```

## Good Example
```ts
const result = await getQuoteWithFallback("AAPL")
if (result.isFallback) {
  // signal receives reduced confidence because primary provider was unavailable
  return { ...signal, confidence: signal.confidence * 0.7 }
}
// ✓ Fallback state propagated to confidence score
```

## Bad Example
```ts
const quote = await polygonAdapter.getQuote("AAPL")
  .catch(() => tiingoAdapter.getQuote("AAPL"))
  .catch(() => null)
// ✗ Fallback fires silently, caller gets null with no context, logging absent
```

## Safety Notes
Silent fallback means a degraded signal enters the execution system with the same confidence as a healthy signal. An order placed on a stale tiingo quote that should have been flagged low-confidence can trigger at a significantly wrong price.
