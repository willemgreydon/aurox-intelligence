# Insufficient Data Rule

## Purpose
When signal, forecasting, or indicator functions receive insufficient data, they must return a safe typed response with `confidence: 0` — never proceed, never throw silently, never return NaN. The caller must handle the insufficient-data case explicitly.

## Applies To
- `packages/signals/`
- `packages/forecasting/`
- `packages/ai-market-intelligence/`

## Rule
Insufficient data must be handled at every computation boundary:

1. **Check before compute** — check bar count / data validity before running any indicator
2. **Return typed zero** — return `{ score: 0, confidence: 0, explanation: "insufficient data: ..." }`
3. **Never propagate NaN** — if any input is NaN, refuse computation and return zero confidence
4. **Log the gap** — log which symbol and timeframe had insufficient data, at warn level
5. **Propagate to UI** — the UI must receive a `hasInsufficientData: boolean` flag and show appropriate state

Insufficient data conditions:
- Fewer bars than the indicator's declared minimum
- Input contains NaN or Infinity values
- OHLCV series has gap ratio > 10%
- Quote is older than the maximum staleness threshold
- Provider returned empty response

## Forbidden
- `computeRSI(prices)` without a prior length check
- Signal that returns `score: 0, confidence: 0.8` when data is missing
- Catching `InsufficientDataError` and re-throwing as a generic Error
- Silently filtering NaN values from the series without logging
- Proceeding with fewer bars by "approximately" computing the indicator

## Required Pattern
```ts
// In signal functions:
if (ohlcv.length < MIN_BARS) {
  log.warn("insufficient_data", { symbol: ohlcv[0]?.symbol, required: MIN_BARS, available: ohlcv.length })
  return { score: 0, confidence: 0, explanation: `need ${MIN_BARS} bars, have ${ohlcv.length}` }
}

if (ohlcv.some(bar => isNaN(bar.close) || !isFinite(bar.close))) {
  log.warn("invalid_data", { symbol: ohlcv[0]?.symbol, reason: "NaN or Infinity in close prices" })
  return { score: 0, confidence: 0, explanation: "invalid price data in series" }
}
```

```tsx
// In UI:
{signal.confidence === 0 && (
  <span className="text-muted">Insufficient data — signal unavailable</span>
)}
```

## Validation
```bash
pnpm --filter @repo/signals test
grep -r "isNaN\|isFinite\|insufficient" packages/signals/src --include="*.ts"
grep -r "confidence.*0[^.]\|confidence: 0\b" packages/signals/src --include="*.ts"
```

## Good Example
```ts
if (prices.length < MIN_BARS) {
  return { score: 0, confidence: 0, explanation: "insufficient data" }
}
const result = computeRSI(prices)
// ✓ Guard prevents NaN propagation; caller gets typed zero
```

## Bad Example
```ts
const rsi = computeRSI(prices)      // may throw or return NaN if prices too short
const score = (rsi - 50) / 50       // NaN propagates silently
return { score, confidence: 0.7 }   // ✗ NaN score with non-zero confidence enters pipeline
```

## Safety Notes
NaN scores that enter the execution pipeline are not caught by range checks (`NaN > 0.3` is false in JavaScript). This can cause a bad signal to be silently treated as neutral rather than flagged as invalid. Missing data is not a neutral signal — it is an absence of information that must be explicitly communicated.
