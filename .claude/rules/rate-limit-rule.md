# Rate Limit Rule

## Purpose
All external provider calls must respect rate limits. Rate limit violations cause API key suspension, silent data gaps, and cascading failures. The system must handle 429 responses gracefully and not retry blindly.

## Applies To
- `packages/providers/`
- `apps/worker/`

## Rule
Rate limit handling requirements:

1. **Backoff on 429**: Exponential backoff with jitter, not immediate retry
2. **Per-provider budgets**: Each provider has a known request budget (requests/minute or requests/day)
3. **Health check gate**: If a provider returns 429, mark it as rate-limited in health state; skip in fallback chain until cooldown
4. **Budget tracking**: Track approximate call count per provider per minute
5. **Worker rate control**: Background ingestion workers must respect per-symbol and per-provider limits
6. **No burst on startup**: Do not fire all pending provider calls immediately on server start

Per-provider limits (approximate defaults):
| Provider | Free tier limit |
|---|---|
| Polygon | 5 requests/min (free) |
| Tiingo | 500 requests/day (free) |
| CoinGecko | 10-30 requests/min (free) |
| Twelve Data | 8 requests/min (free) |
| Finnhub | 60 requests/min (free) |

## Forbidden
- Retrying a 429 response immediately without backoff
- No rate limit handling at all (let errors propagate)
- Logging 429 as an error and continuing to hammer the provider
- Ignoring rate limit headers (`Retry-After`, `X-RateLimit-Remaining`)
- Running more than one concurrent provider call per symbol per provider

## Required Pattern
```ts
// packages/providers/src/util/with-retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number }
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (isRateLimitError(err) && attempt < options.maxRetries) {
        const delay = options.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100
        log.warn(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}`)
        await sleep(delay)
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}
```

## Validation
```bash
grep -r "429\|RateLimit\|rate_limit\|withRetry\|backoff" packages/providers/src --include="*.ts"
grep -r "Retry-After\|X-RateLimit" packages/providers/src --include="*.ts"
pnpm --filter @repo/providers typecheck
```

## Good Example
```ts
const result = await withRetry(() => polygonAdapter.getQuote(symbol), {
  maxRetries: 3,
  baseDelayMs: 500
})
// ✓ Exponential backoff on failure, logs each attempt
```

## Bad Example
```ts
const result = await polygonAdapter.getQuote(symbol).catch(async (err) => {
  if (err.status === 429) return polygonAdapter.getQuote(symbol)  // ✗ Immediate retry on 429
  throw err
})
```

## Safety Notes
Hammering a rate-limited provider escalates to permanent API key suspension. Once a key is suspended, all market data for that provider is lost until a new key is provisioned — potentially for hours. Rate limit handling is a reliability requirement, not optional polish.
