# Aurox UI Boundary Rules

## Purpose
The UI layer is for presentation, interaction, and state display only. All financial logic, risk computation, provider calls, and execution decisions happen server-side. Components receive read models and render them.

## Applies To
- `apps/web/app/**`
- `apps/web/components/**`

## Rule
UI may:
- Render read models and view models
- Show interaction states (loading, submitting, error)
- Submit server actions
- Show risk warnings and mode indicators
- Show degraded or stale data states

UI must not:
- Call providers
- Query the database
- Calculate PnL or unrealized gain/loss
- Calculate risk scores
- Calculate signal scores
- Mutate portfolios directly
- Decide execution eligibility
- Format raw financial numbers that require business rules

## Forbidden
- `import { getQuote } from "@repo/providers"` in any component
- `import { db } from "@repo/db"` in any component
- `const pnl = (price - avgCost) * quantity` in a React component
- `const riskScore = position.value / portfolioTotal` in a component
- Execution mode determined inside a component
- `fetch()` to external market data APIs from client components

## Required Pattern
```tsx
// Component receives pre-computed read model
export function PositionRow({ position }: { position: PositionViewModel }) {
  return (
    <tr>
      <td>{position.symbol}</td>
      <td className={position.isGain ? "text-green" : "text-red"}>
        {position.unrealizedPnlDisplay}   {/* pre-formatted by mapper */}
      </td>
      {position.hasLowSignalConfidence && <LowConfidenceIndicator />}
    </tr>
  )
}
```

## Required UX
Financial UI must show:
- Simulation vs live execution context (always visible)
- Data freshness indicator when data is stale
- Loading states for every async section
- Empty states for empty lists and tables
- Degraded states when data is partial or unavailable
- Clear risk language — no guaranteed return language
- Confidence indicators for signals and recommendations

## Validation
```bash
grep -r "from '@repo/providers'\|from '@repo/db'" apps/web/components --include="*.tsx"
grep -r "avgCost\|avg_cost\|\.toFixed\|Math\." apps/web/components --include="*.tsx" | grep -v "view-model\|format"
pnpm build:web
```

## Good Example
```tsx
<span className={vm.isPositive ? "text-green" : "text-red"}>{vm.changeDisplay}</span>
// ✓ Pre-formatted value, pre-derived color flag — no computation in component
```

## Bad Example
```tsx
const change = ((quote.price - quote.prevClose) / quote.prevClose * 100)
const color = change >= 0 ? "text-green" : "text-red"
// ✗ Financial calculation inside React component — belongs in mapper
```

## Safety Notes
Financial calculations in React components are invisible to the audit trail, use different precision than server-side Postgres arithmetic, and produce inconsistent values across different rendering paths. They must live in mappers and repositories.
