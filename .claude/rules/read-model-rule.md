# Read Model Rule

## Purpose
UI components must receive pre-shaped read models. They must not receive raw domain objects, raw DB rows, or raw provider responses. Read models are computed server-side and contain only display-ready data.

## Applies To
- `apps/web/server/mappers/`
- `apps/web/server/services/`
- `apps/web/components/`
- `apps/web/app/*/page.tsx`

## Rule
A read model is a typed, display-ready object that a component can render directly without further computation.

Read model properties:
- Strings are already formatted (e.g., `"$1,234.56"` not `1234.5678`)
- Nulls are replaced with display fallbacks (e.g., `"—"` or `0`)
- Financial values are rounded to display precision
- Risk labels are derived server-side
- Signal scores are pre-interpreted (e.g., `"Bullish"` not `0.72`)
- Mode badges are pre-set (`"SIMULATION"` or `"LIVE"`)

Shared read model contracts live in `packages/api-contracts`.
Route-specific view models live in `apps/web/server/mappers/`.

## Forbidden
- Passing raw `SimulationOrder` rows directly to components
- Components calling `.toFixed()`, `Intl.NumberFormat`, or `Math.abs()` on financial values that require business rules
- Components receiving `undefined` prices and computing fallbacks inline
- Components deriving risk labels from raw score numbers
- Passing provider response shapes directly to UI props

## Required Pattern
```ts
// apps/web/server/mappers/portfolio-mapper.ts
export function mapPositionToViewModel(position: SimulationPosition, quote: Quote): PositionViewModel {
  return {
    symbol: position.symbol,
    quantity: position.quantity,
    avgCost: formatCurrency(position.avg_cost),
    currentPrice: formatCurrency(quote.price),
    unrealizedPnl: formatCurrency((quote.price - position.avg_cost) * position.quantity),
    unrealizedPnlPct: formatPercent((quote.price - position.avg_cost) / position.avg_cost),
    signalLabel: deriveSignalLabel(position.latestSignalScore),
    mode: "SIMULATION"
  }
}
```

## Validation
```bash
grep -r "\.toFixed\|Intl\.NumberFormat\|Math\.abs" apps/web/components --include="*.tsx"
grep -r "avg_cost\|cash_balance\|simulation_orders" apps/web/components --include="*.tsx"
pnpm build:web
```

## Good Example
```tsx
// apps/web/components/portfolio/PositionRow.tsx
export function PositionRow({ position }: { position: PositionViewModel }) {
  return <tr><td>{position.symbol}</td><td>{position.unrealizedPnl}</td></tr>
}
// ✓ Component renders pre-shaped read model, no computation
```

## Bad Example
```tsx
// apps/web/components/portfolio/PositionRow.tsx
export function PositionRow({ position }: { position: SimulationPosition; quote: Quote }) {
  const pnl = ((quote.price - position.avg_cost) * position.quantity).toFixed(2)
  // ✗ Financial accounting math inside component — untestable, risk-invisible
  return <tr><td>{position.symbol}</td><td>${pnl}</td></tr>
}
```

## Safety Notes
When components compute financial values, those computations are outside the audit trail. A rounding error or wrong formula in a component produces wrong display values that erode user trust. More critically, if the same formula is used elsewhere for actual execution logic, it introduces inconsistency.
