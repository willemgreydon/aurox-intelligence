# Indicator Derivation Rule

## Purpose
Technical indicators (RSI, EMA, MACD, Bollinger Bands, etc.) must be implemented as pure functions in `packages/signals`. They must validate their inputs, declare their minimum bar requirements, and return typed, bounded outputs.

## Applies To
- `packages/signals/src/indicators/`
- `packages/signals/src/`

## Rule
Every indicator must:
1. Accept typed inputs (canonical `OHLCV[]` or `number[]`)
2. Declare a named constant for its minimum required bars (e.g., `RSI_MIN_BARS = 14`)
3. Return a value in a defined, documented range
4. Handle NaN/Infinity inputs gracefully (never propagate NaN)
5. Be tested with at least: normal input, minimum bars, below-minimum bars, flat price series

Indicator implementation location:
```text
packages/signals/src/indicators/rsi.ts
packages/signals/src/indicators/ema.ts
packages/signals/src/indicators/macd.ts
packages/signals/src/indicators/bollinger.ts
```

Indicator output ranges:
| Indicator | Output Range |
|---|---|
| RSI | 0–100 |
| EMA | Same scale as price |
| MACD line | Unbounded, but sign indicates direction |
| Bollinger %B | 0–1 (0 = at lower band, 1 = at upper band) |
| Score conversion | Always map to [-1, +1] using `clamp(score, -1, 1)` |

## Forbidden
- Indicator that returns `NaN` without throwing a typed error
- Indicator that uses `Math.random()` in any calculation
- Using more bars than available without returning `confidence: 0`
- Importing from `@repo/db` or `@repo/providers` inside indicator files
- Computing indicators inside React components or mappers

## Required Pattern
```ts
// packages/signals/src/indicators/rsi.ts
export const RSI_MIN_BARS = 14

export function computeRSI(closes: number[]): number {
  if (closes.length < RSI_MIN_BARS) {
    throw new InsufficientDataError(`RSI requires ${RSI_MIN_BARS} bars, got ${closes.length}`)
  }
  if (closes.some(c => isNaN(c) || !isFinite(c))) {
    throw new InvalidDataError("RSI input contains NaN or Infinity")
  }
  // Wilder's smoothing RSI implementation
  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    gains.push(Math.max(0, change))
    losses.push(Math.max(0, -change))
  }
  const avgGain = gains.slice(0, RSI_MIN_BARS - 1).reduce((a, b) => a + b, 0) / (RSI_MIN_BARS - 1)
  const avgLoss = losses.slice(0, RSI_MIN_BARS - 1).reduce((a, b) => a + b, 0) / (RSI_MIN_BARS - 1)
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}
```

## Validation
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
grep -r "MIN_BARS\|minBars" packages/signals/src --include="*.ts"
grep -r "isNaN\|isFinite" packages/signals/src/indicators --include="*.ts"
```

## Good Example
```ts
if (closes.length < RSI_MIN_BARS) {
  throw new InsufficientDataError(`need ${RSI_MIN_BARS} bars`)
}
// ✓ Caller handles InsufficientDataError and returns { confidence: 0 }
```

## Bad Example
```ts
export function computeRSI(closes: number[]): number {
  const rs = closes[closes.length - 1] / closes[0]
  return 100 - (100 / (1 + rs))  // ✗ No minimum bar check, wrong formula, can return NaN
}
```

## Safety Notes
An RSI that returns NaN silently converts to 0 when compared with a threshold — which looks like a neutral signal. This masks data quality issues. In the execution path, a phantom neutral signal can suppress a correct sell signal, keeping a losing position open.
