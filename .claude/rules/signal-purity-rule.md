# Signal Purity Rule

## Purpose
Signal functions in `packages/signals` must be pure and deterministic. The same input always produces the same output. No I/O, no side effects, no randomness. This is required for reproducibility, auditability, and unit testability.

## Applies To
- `packages/signals/`

## Rule
Every exported function in `packages/signals` must satisfy:

1. **Pure**: same inputs → same outputs, always
2. **No I/O**: no `fetch`, no DB, no filesystem, no process.env reads at call time
3. **No side effects**: does not mutate inputs, does not write to global state
4. **No randomness**: no `Math.random()`, no `Date.now()` without it being a parameter
5. **Typed contracts**: returns `SignalOutput` or a type from `packages/api-contracts`
6. **Confidence 0 on insufficient data**: never proceed with NaN or sparse data silently

Signal output contract:
```ts
type SignalOutput = {
  score: number        // must be in range [-1, +1]
  confidence: number   // must be in range [0, 1]
  explanation: string  // required, human-readable
}
```

Signal aggregation: `FinalScore = Σ(weight_i × score_i) / Σ(weight_i)` where inputs are validated `SignalOutput` objects.

## Forbidden
- `async` signal functions
- `import` of `@repo/db`, `@repo/providers`, `@repo/agents` in signals
- `Math.random()` in any signal or indicator computation
- Returning `score: NaN` or `confidence: undefined`
- Signal functions that use global mutable state
- Signal that reads configuration from `process.env` at call time (config must be passed as parameter)
- Claiming `confidence: 0.8` when fewer than minimum bars are available

## Required Pattern
```ts
// packages/signals/src/momentum.ts
import type { SignalOutput, OHLCV } from "@repo/api-contracts"

const MIN_BARS = 14

export function computeMomentumSignal(ohlcv: OHLCV[]): SignalOutput {
  if (ohlcv.length < MIN_BARS) {
    return { score: 0, confidence: 0, explanation: `need ${MIN_BARS} bars, have ${ohlcv.length}` }
  }
  const rsi = computeRSI(ohlcv.map(c => c.close).slice(-MIN_BARS))
  const score = rsiToScore(rsi)
  return {
    score: clamp(score, -1, 1),
    confidence: 0.6,
    explanation: `RSI(14)=${rsi.toFixed(1)}: ${score > 0 ? "overbought signal" : "oversold signal"}`
  }
}
```

## Validation
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
grep -r "async function\|await \|fetch(\|Math\.random" packages/signals/src --include="*.ts"
grep -r "import.*@repo/db\|import.*@repo/providers" packages/signals/src --include="*.ts"
```

## Good Example
```ts
export function computeTrendSignal(ohlcv: OHLCV[]): SignalOutput {
  const score = computeEMAScore(ohlcv)
  return { score: clamp(score, -1, 1), confidence: 0.7, explanation: "EMA crossover" }
}
// ✓ Pure, synchronous, typed, deterministic
```

## Bad Example
```ts
export async function computeTrendSignal(symbol: string): Promise<SignalOutput> {
  const data = await db.query(`SELECT * FROM ohlcv WHERE symbol = $1`, [symbol])
  return { score: Math.random() * 2 - 1, confidence: 0.8, explanation: "trend" }
  //             ✗ I/O in signal package    ✗ randomness in score
}
```

## Safety Notes
A non-deterministic signal score cannot be traced back to its inputs. An execution decision triggered by a signal that changes on each call cannot be audited. In a risk system, auditability is not a nice-to-have — it is a hard requirement.
