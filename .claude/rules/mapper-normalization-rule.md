# Mapper Normalization Rule

## Purpose
Mappers are the only place where raw domain data is transformed into view models. They must be pure transformation functions: no I/O, no side effects, deterministic.

## Applies To
- `apps/web/server/mappers/`

## Rule
A mapper takes raw query output (DB rows, provider responses, signal outputs) and returns a typed view model. Mappers must be:

- Pure functions (same input → same output)
- Free of async calls
- Free of provider calls
- Free of DB calls
- Tested with unit tests using fixture data

Mapper naming convention:
```text
map<Entity>To<ViewModelName>(input: RawType): ViewModelType
mapPositionToPortfolioRow(position: SimulationPosition, quote: Quote): PortfolioRowViewModel
mapSignalOutputToSignalDisplay(signal: SignalOutput): SignalDisplayViewModel
```

## Forbidden
- `async` mappers
- `fetch()` inside mappers
- DB imports inside mappers
- Throwing errors for missing optional fields (return display fallback)
- Passing mapper output directly as DB insert input (mappers shape for display, not persistence)
- Formatters that encode business rules (e.g., computing `unrealizedPnl` using a different formula than the repository)

## Required Pattern
```ts
// apps/web/server/mappers/signal-mapper.ts
import type { SignalOutput } from "@repo/api-contracts"
import type { SignalDisplayViewModel } from "../view-models/signal"

export function mapSignalToDisplay(signal: SignalOutput): SignalDisplayViewModel {
  return {
    label: signal.score > 0.3 ? "Bullish" : signal.score < -0.3 ? "Bearish" : "Neutral",
    scoreDisplay: `${(signal.score * 100).toFixed(0)}%`,
    confidenceDisplay: `${(signal.confidence * 100).toFixed(0)}%`,
    explanation: signal.explanation,
    hasLowConfidence: signal.confidence < 0.4
  }
}
```

## Validation
```bash
grep -r "async function map\|await " apps/web/server/mappers --include="*.ts"
pnpm --filter @repo/signals test
pnpm build:web
```

## Good Example
```ts
export function mapQuoteToAssetCard(quote: Quote): AssetCardViewModel {
  return {
    symbol: quote.symbol,
    priceDisplay: formatCurrency(quote.price),
    changeDisplay: formatPercent(quote.changePercent),
    isPositive: quote.changePercent >= 0,
    isFresh: Date.now() - quote.timestamp < 60_000
  }
}
// ✓ Pure, typed, deterministic, no I/O
```

## Bad Example
```ts
export async function mapQuoteToAssetCard(symbol: string): AssetCardViewModel {
  const quote = await fetchQuote(symbol)  // ✗ mapper performs I/O
  return { symbol, priceDisplay: quote.price.toFixed(2) }
}
```

## Safety Notes
Async mappers hide provider latency inside what appears to be a presentation transform. If the provider call fails, the mapper throws and the entire page fails. Mappers must be synchronous so failure modes stay in the query/service layer where they can be handled.
