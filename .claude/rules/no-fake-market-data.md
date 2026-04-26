# No Fake Market Data Rule

## Purpose
The system must never fabricate, interpolate, or silently substitute market data. Missing or stale data must be surfaced as low confidence or degraded state — never replaced with invented values.

## Applies To
- `packages/providers/`
- `packages/signals/`
- `packages/forecasting/`
- `apps/web/server/queries/`
- `apps/web/components/`

## Rule
When a provider cannot return real data, the system must:
1. Attempt all configured fallback providers (as defined in `packages/providers/src/market/routing.ts`)
2. If all fallbacks fail: return `null` or a typed `DataUnavailable` state
3. Surface the degraded state to the UI
4. Lower signal confidence to 0 when input data is unavailable
5. Block execution decisions when required data is missing

Permitted fallback behaviors:
- Returning last known good price with a `staleAt` timestamp and `isStale: true` flag
- Returning `confidence: 0` in signal output when input data is stale beyond threshold
- Displaying "—" or "Data unavailable" in UI

Not permitted fallback behaviors:
- Using a hardcoded price (even `0`) as a substitute for a missing quote
- Using a random or interpolated price as a substitute
- Silently returning previous data without marking it stale
- Computing signals on stale data without reducing confidence

## Forbidden
- `const price = quote?.price ?? 100` (hardcoded fallback price)
- `const price = lastKnownPrice * (1 + (Math.random() - 0.5) * 0.01)` (simulated jitter)
- Returning cached data older than the acceptable staleness threshold without `isStale: true`
- Logging a provider failure silently without propagating it to the caller
- Allowing signal scores to remain at prior values when the underlying data has become unavailable

## Required Pattern
```ts
// packages/providers/src/market/routing.ts
export async function getQuoteWithFallback(symbol: string): Promise<QuoteResult> {
  for (const provider of PROVIDER_CHAIN) {
    try {
      const quote = await provider.getQuote(symbol)
      return { quote, provider: provider.name, isStale: false }
    } catch (err) {
      log.warn(`Provider ${provider.name} failed for ${symbol}`, { err })
    }
  }
  return { quote: null, provider: null, isStale: true, error: "all_providers_failed" }
}
```

## Validation
```bash
grep -r "?? [0-9]\|?? '0'\|\|\| 0\b" packages/providers packages/signals --include="*.ts"
grep -r "Math\.random" packages/providers packages/signals packages/forecasting --include="*.ts"
pnpm --filter @repo/providers typecheck
```

## Good Example
```ts
const result = await getQuoteWithFallback("AAPL")
if (!result.quote) {
  return { score: 0, confidence: 0, explanation: "market data unavailable" }
}
// ✓ Missing data yields zero confidence signal, not fabricated score
```

## Bad Example
```ts
const quote = await getQuote("AAPL").catch(() => ({ price: lastPrice ?? 100 }))
// ✗ Hardcoded fallback price silently feeds a fake value into the signal engine
```

## Safety Notes
A fabricated price entering the signal engine produces a signal score that looks real. If that signal score reaches the execution system, it can trigger a trade based on invented data. This is a critical defect in any market-connected system.
