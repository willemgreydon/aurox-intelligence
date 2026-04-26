# History Data Rule

## Purpose
Historical OHLCV data is the foundation for all signal and forecasting computations. It must be complete, gap-free within the requested range, and stored at canonical precision. Missing bars must be explicitly represented — never silently omitted.

## Applies To
- `packages/providers/`
- `packages/ingestion/`
- `packages/signals/`
- `packages/db/src/repositories/`

## Rule
OHLCV data rules:
1. **No silent gaps** — if bars are missing in a range, return them as `null` entries or surface a `hasGaps: true` flag
2. **Canonical precision** — price values stored as `NUMERIC(18,8)` in Postgres; never rounded in transport
3. **Consistent interval** — each OHLCV series must have a declared `interval` field (e.g., `"1d"`, `"1h"`, `"15m"`)
4. **Sorted ascending** — always returned oldest-first
5. **Minimum bars check** — signal computations must declare a minimum bar requirement and return `{ confidence: 0 }` if unmet
6. **Provider-source tracking** — each series must record which provider supplied it

Canonical OHLCV shape:
```ts
type OHLCV = {
  timestamp: number    // Unix ms
  open: number
  high: number
  low: number
  close: number
  volume: number
  symbol: string
  assetKind: AssetKind
  interval: string
  provider: string
}
```

## Forbidden
- Interpolating missing bars with averages of neighbors
- Returning OHLCV arrays with varying intervals in the same series
- Storing prices as JavaScript `number` floats in the DB (use `NUMERIC`)
- Signal computations that proceed with fewer than their declared minimum bars
- Returning OHLCV sorted descending (newest-first) — breaks all window computations

## Required Pattern
```ts
// packages/signals/src/trend.ts
const MIN_BARS = 20

export function deriveTrendSignal(ohlcv: OHLCV[]): SignalOutput {
  if (ohlcv.length < MIN_BARS) {
    return { score: 0, confidence: 0, explanation: `insufficient_data: need ${MIN_BARS} bars, have ${ohlcv.length}` }
  }
  // proceed with computation
}
```

```ts
// packages/providers/src/market/polygon-adapter.ts
export async function getOHLCV(symbol: string, interval: string, limit: number): Promise<OHLCVResult> {
  const raw = await fetchPolygonBars(symbol, interval, limit)
  return {
    bars: normalizePolygonBars(raw, symbol, interval),
    hasGaps: detectGaps(raw, interval),
    provider: "polygon"
  }
}
```

## Validation
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
grep -r "MIN_BARS\|minBars\|insufficient_data" packages/signals/src --include="*.ts"
grep -r "hasGaps\|detectGaps" packages/providers/src --include="*.ts"
```

## Good Example
```ts
if (ohlcv.length < MIN_BARS) {
  return { score: 0, confidence: 0, explanation: "insufficient data" }
}
// ✓ Guard returns zero confidence rather than proceeding on sparse data
```

## Bad Example
```ts
const rsi = computeRSI(ohlcv.slice(-14))
// ✗ No check for whether ohlcv has at least 14 bars — computeRSI silently returns NaN
return { score: rsiToScore(rsi), confidence: 0.8, explanation: "RSI-14" }
// ✗ NaN score with high confidence enters the signal pipeline
```

## Safety Notes
A signal computed on NaN inputs produces a NaN score. A NaN score compared against a risk threshold (`NaN > 0.3`) returns `false` in JavaScript — which can mean a buy signal is silently rejected as neutral rather than flagged as invalid. This masks data quality problems.
