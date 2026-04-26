# Forecasting Purity Rule

## Purpose
`packages/forecasting` must remain a pure computation package. No I/O, no side effects, no network calls. Forecasting models must be deterministic given a fixed seed and input. Their outputs must include confidence intervals and explainability.

## Applies To
- `packages/forecasting/`

## Rule
All forecasting functions must be:
- Pure (no I/O)
- Deterministic given the same inputs and seed
- Typed with canonical output contracts
- Accompanied by an `explanation` and a `confidence` value
- Tested with known-input / known-output assertions

Forecasting output contract:
```ts
type ForecastOutput = {
  symbol: string
  interval: string
  horizon: number             // number of future bars
  predictions: ForecastBar[]
  confidence: number          // 0 to 1, aggregate confidence
  explanation: string
  modelName: string
  generatedAt: number         // Unix ms — must be passed in, not Date.now()
}

type ForecastBar = {
  timestamp: number
  predictedClose: number
  upperBound: number          // confidence interval upper
  lowerBound: number          // confidence interval lower
}
```

If the model is stochastic, it must accept a `seed` parameter and produce the same output for the same seed.

## Forbidden
- `async` forecasting functions that call I/O
- Models that use `Date.now()` or `Math.random()` without them being passed as parameters
- Forecasting that returns predictions without confidence intervals
- Forecasting that returns no `explanation`
- Importing from `@repo/db`, `@repo/providers`, `@repo/agents` in forecasting package
- Returning predictions beyond the model's validated horizon

## Required Pattern
```ts
// packages/forecasting/src/models/linear-regression.ts
import type { ForecastOutput, OHLCV } from "@repo/api-contracts"

export function forecastLinearRegression(
  ohlcv: OHLCV[],
  horizon: number,
  generatedAt: number  // passed in — not Date.now() internally
): ForecastOutput {
  if (ohlcv.length < 30) {
    return {
      symbol: ohlcv[0]?.symbol ?? "unknown",
      interval: ohlcv[0]?.interval ?? "1d",
      horizon,
      predictions: [],
      confidence: 0,
      explanation: "insufficient data for forecast",
      modelName: "linear-regression",
      generatedAt
    }
  }
  const preds = computeLinearForecast(ohlcv, horizon)
  return { ...preds, modelName: "linear-regression", generatedAt, explanation: buildExplanation(preds) }
}
```

## Validation
```bash
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/forecasting test
grep -r "async function\|await \|fetch(\|Date\.now\(\)\|Math\.random" packages/forecasting/src --include="*.ts"
grep -r "import.*@repo/db\|import.*@repo/providers" packages/forecasting/src --include="*.ts"
```

## Good Example
```ts
export function forecast(ohlcv: OHLCV[], horizon: number, generatedAt: number): ForecastOutput {
  const predictions = computeRollingForecast(ohlcv, horizon)
  return { predictions, confidence: 0.6, explanation: "rolling mean reversion model", generatedAt }
}
// ✓ Pure, deterministic, typed, includes explanation
```

## Bad Example
```ts
export async function forecast(symbol: string): ForecastOutput {
  const data = await fetchOHLCV(symbol)     // ✗ I/O in pure package
  return { ...computeForecast(data), generatedAt: Date.now() }  // ✗ non-deterministic timestamp
}
```

## Safety Notes
A forecast function that calls I/O is impossible to test in isolation. Without confidence intervals, the UI cannot warn users about uncertain predictions. Without determinism, the system cannot reproduce the exact forecast that led to an execution decision — making post-mortem audits impossible.
