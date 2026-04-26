# Quote Snapshot Rule

## Purpose
Real-time and recent quote snapshots must carry freshness metadata. Stale quotes must be identified before they reach signal computation or order pricing. A quote snapshot without a timestamp is never acceptable.

## Applies To
- `packages/providers/`
- `packages/signals/`
- `apps/web/server/queries/`
- `apps/web/components/`

## Rule
Every `Quote` object must include:
```ts
type Quote = {
  symbol: string
  price: number
  bid?: number
  ask?: number
  volume?: number
  timestamp: number    // Unix ms — REQUIRED
  provider: string
  isStale: boolean     // derived from timestamp + staleness threshold
  assetKind: AssetKind
}
```

Staleness thresholds (configurable, these are defaults):
- Stocks/ETFs during market hours: 60 seconds
- Stocks/ETFs after hours: 5 minutes
- Crypto: 30 seconds
- Any quote older than 15 minutes: always stale

If `isStale: true`:
- Signal computations must reduce confidence
- UI must display a staleness indicator
- Execution decisions must reject or require explicit confirmation

## Forbidden
- Storing `Quote` without `timestamp` field
- Passing `Quote` to signals without staleness check
- Computing a signal score with full confidence on a stale quote
- Displaying price to user without indicating staleness when `isStale: true`
- Using `Date.now()` as a `timestamp` substitute when the actual quote time is unknown

## Required Pattern
```ts
// packages/providers/src/util/staleness.ts
export function isQuoteStale(quote: Quote, assetKind: AssetKind): boolean {
  const thresholds: Record<AssetKind, number> = {
    stock: 60_000,
    etf: 60_000,
    crypto: 30_000,
    forex: 120_000,
    commodity: 300_000
  }
  return Date.now() - quote.timestamp > (thresholds[assetKind] ?? 60_000)
}
```

```ts
// packages/signals/src/trend.ts
export function deriveTrendSignal(quote: Quote, ohlcv: OHLCV[]): SignalOutput {
  const confidencePenalty = quote.isStale ? 0.5 : 1.0
  const rawScore = computeScore(ohlcv)
  return {
    score: rawScore,
    confidence: deriveConfidence(ohlcv) * confidencePenalty,
    explanation: quote.isStale ? "stale quote: confidence reduced" : "live quote"
  }
}
```

## Validation
```bash
grep -r "timestamp\b" packages/providers/src --include="*.ts" | grep "Quote\|quote"
grep -r "isStale\|staleness" packages/providers/src packages/signals/src --include="*.ts"
grep -r "isStale" apps/web/components --include="*.tsx"
pnpm --filter @repo/providers typecheck
```

## Good Example
```ts
const { quote, isStale } = await getQuoteWithFallback("AAPL")
if (!quote) return { score: 0, confidence: 0, explanation: "no quote available" }
const signal = deriveTrendSignal({ ...quote, isStale }, ohlcvData)
// ✓ Staleness flag propagated into confidence calculation
```

## Bad Example
```ts
const quote = await getQuote("AAPL")
const signal = deriveTrendSignal(quote, ohlcvData)
// ✗ No staleness check — signal may be derived from a 20-minute-old price
```

## Safety Notes
An order priced from a 20-minute-old snapshot during a volatile market can fill at a significantly different price than displayed. In simulation this creates wrong PnL records. In live trading it causes unexpected slippage or outright wrong fills.
