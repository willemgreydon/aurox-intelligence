# Pure Domain Packages Rule

## Purpose
`packages/signals` and `packages/forecasting` must remain pure: no I/O, no DB access, no provider calls, no network calls, no hidden state. This makes them independently testable, deterministic, and safe to run in any context.

## Applies To
- `packages/signals/`
- `packages/forecasting/`

## Rule
All functions in `packages/signals` and `packages/forecasting` must be pure functions.

A pure function:
- Takes typed inputs
- Returns a typed output
- Produces the same output for the same inputs always
- Has no side effects (no DB, no network, no filesystem, no console in prod)
- Does not import from `packages/db`, `packages/providers`, or `apps/web`

Signal output contract:
```ts
type SignalOutput = {
  score: number        // -1 to +1
  confidence: number   // 0 to 1
  explanation: string
}
```

## Forbidden
In `packages/signals`:
- `import { getRepository } from "@repo/db"`
- `import { fetchQuote } from "@repo/providers"`
- `fetch()` calls of any kind
- `Math.random()` in scoring logic
- Mutating input arrays or objects
- Global mutable state (module-level caches, counters)
- Returning `undefined` or `null` as a valid score (use confidence: 0 instead)

In `packages/forecasting`:
- Same I/O prohibitions as signals
- Forecasting models must produce deterministic outputs given the same seed/inputs
- Do not format output for UI display (that belongs in the mapper)

## Required Pattern
```ts
// packages/signals/src/trend.ts
export function deriveTrendSignal(prices: number[]): SignalOutput {
  if (prices.length < 20) {
    return { score: 0, confidence: 0, explanation: "insufficient data" }
  }
  const score = computeEMAScore(prices)
  return {
    score: clamp(score, -1, 1),
    confidence: deriveConfidence(prices),
    explanation: `EMA crossover: ${score > 0 ? "bullish" : "bearish"}`
  }
}
```

## Validation
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/forecasting test
grep -r "import.*@repo/db\|import.*@repo/providers\|fetch(" packages/signals packages/forecasting --include="*.ts"
```

## Good Example
```ts
export function computeMomentumSignal(ohlcv: OHLCV[]): SignalOutput {
  const rsi = computeRSI(ohlcv.map(c => c.close))
  return { score: rsiToScore(rsi), confidence: 0.7, explanation: `RSI: ${rsi.toFixed(1)}` }
}
// ✓ Pure function, no I/O, deterministic
```

## Bad Example
```ts
export async function computeMomentumSignal(symbol: string): SignalOutput {
  const data = await fetchOHLCV(symbol)  // ✗ I/O inside pure package
  const rsi = computeRSI(data)
  return { score: rsiToScore(rsi), confidence: Math.random(), explanation: "rsi" }
  //                                              ✗ randomness in confidence
}
```

## Safety Notes
Non-pure signal functions are impossible to unit test with fixed inputs. A signal that calls the provider directly can return different results each time it runs — making it untraceable when a bad signal triggers an execution decision.
