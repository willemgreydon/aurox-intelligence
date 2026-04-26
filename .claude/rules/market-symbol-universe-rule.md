# Market Symbol Universe Rule

## Purpose
All symbols in the system must be canonical. Normalization happens once, at the provider boundary, via `packages/ingestion` or `packages/providers`. Downstream packages consume canonical symbols only.

## Applies To
- `packages/providers/`
- `packages/ingestion/`
- `packages/signals/`
- `packages/db/src/repositories/`
- `apps/web/server/queries/`

## Rule
Canonical symbol format:
- Stocks and ETFs: uppercase ticker with exchange suffix when required (e.g., `AAPL`, `SPY`, `BRK.B`)
- Crypto: uppercase base/quote pair in standard form (e.g., `BTC-USD`, `ETH-USDT`)
- Asset kind must always accompany symbol: `{ symbol: string, assetKind: AssetKind }`

Normalization is performed by:
- `packages/ingestion` for batch canonicalization
- `packages/providers` for real-time quote normalization

`AssetKind` values:
```ts
type AssetKind = "stock" | "etf" | "crypto" | "forex" | "commodity"
```

Symbols from user input must be:
1. Validated against the known symbol universe
2. Normalized to canonical form before any provider call
3. Rejected with a typed error if not in the universe

## Forbidden
- Using raw user-typed symbols directly in provider calls without validation
- Different symbol formats in different packages (`BTC/USD` vs `BTC-USD` vs `BTCUSD`)
- Symbols without `assetKind` in signal or execution contexts
- Storing non-canonical symbols in the database
- Normalizing the same symbol differently in `packages/providers` and `packages/signals`

## Required Pattern
```ts
// packages/ingestion/src/canonicalize.ts
export function canonicalizeSymbol(raw: string, assetKind: AssetKind): CanonicalSymbol {
  const upper = raw.toUpperCase().trim()
  if (assetKind === "crypto") {
    return normalizeCryptoPair(upper)  // e.g. "btc/usd" → "BTC-USD"
  }
  return { symbol: upper, assetKind }
}
```

```ts
// packages/signals/src/trend.ts
export function deriveTrendSignal(canonical: CanonicalSymbol, ohlcv: OHLCV[]): SignalOutput {
  // canonical.symbol is guaranteed normalized — no further normalization needed
}
```

## Validation
```bash
grep -r "symbol\." packages/signals/src --include="*.ts" | grep "toUpperCase\|toLowerCase\|replace"
grep -r "assetKind" packages/signals/src packages/forecasting/src --include="*.ts"
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/signals typecheck
```

## Good Example
```ts
const canonical = canonicalizeSymbol(userInput, "crypto")
// canonical.symbol === "BTC-USD" regardless of what user typed
const signal = deriveTrendSignal(canonical, ohlcvData)
// ✓ One normalization point, all downstream receives canonical form
```

## Bad Example
```ts
// packages/signals/src/trend.ts
const symbol = rawSymbol.replace("/", "-").toUpperCase()
// ✗ Signal package doing its own normalization — duplicated logic, drift risk
```

## Safety Notes
Symbol format inconsistency between packages causes data join mismatches. A signal computed for `BTC/USD` that doesn't match an order for `BTC-USD` in the execution system means the risk check loads no signal data — and the system proceeds with zero confidence score undetected.
