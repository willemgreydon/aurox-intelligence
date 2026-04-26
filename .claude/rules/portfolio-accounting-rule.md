# Portfolio Accounting Rule

## Purpose
Portfolio accounting (cash balance, position value, realized PnL, unrealized PnL, cost basis) must be computed by the repository layer and returned as pre-calculated values. No component or service may re-derive these values using different formulas.

## Applies To
- `packages/db/src/repositories/`
- `apps/web/server/mappers/`
- `apps/web/components/`

## Rule
Canonical accounting formulas (implemented once, in `packages/db` repositories):

| Metric | Formula |
|---|---|
| Unrealized PnL | `(current_price - avg_cost) × quantity` |
| Realized PnL | Sum of all closed transaction profits |
| Cost basis | `avg_cost × quantity` |
| Position value | `current_price × quantity` |
| Portfolio total value | `cash_balance + Σ(position_value_i)` |
| Return % | `(total_value - initial_balance) / initial_balance × 100` |

`avg_cost` must use FIFO or VWAP method (configured, consistent).

These values must be:
1. Computed in the repository using Postgres arithmetic (not in application layer)
2. Stored in `simulation_snapshots` periodically for auditability
3. Exposed via read model — not recomputed by services or components

## Forbidden
- Components computing `(quote.price - position.avgCost) * position.quantity`
- Services computing PnL from raw position fields
- Using floating-point `*` and `-` in JavaScript for financial values (use Postgres `NUMERIC` arithmetic)
- Different PnL formulas in different places (must be one source)
- `avg_cost` computed differently for buy vs sell operations

## Required Pattern
```sql
-- packages/db/src/repositories/portfolio-read-model.sql
SELECT
  p.symbol,
  p.quantity,
  p.avg_cost,
  q.price AS current_price,
  (q.price - p.avg_cost) * p.quantity AS unrealized_pnl,
  p.avg_cost * p.quantity AS cost_basis,
  q.price * p.quantity AS position_value
FROM app.simulation_positions p
JOIN app.market_quotes q ON q.symbol = p.symbol
WHERE p.account_id = $1
```

```ts
// apps/web/server/mappers/portfolio-mapper.ts
export function mapPositionRow(row: PortfolioRow): PositionViewModel {
  return {
    unrealizedPnl: formatCurrency(row.unrealized_pnl),  // pre-computed by DB
    positionValue: formatCurrency(row.position_value),  // pre-computed by DB
    // no formula here — only formatting
  }
}
```

## Validation
```bash
grep -r "avgCost\|avg_cost\|unrealizedPnl" apps/web/components --include="*.tsx"
grep -r "\* position\.\|price - avg\|cost \* qty" apps/web/server/services apps/web/components --include="*.ts" --include="*.tsx"
pnpm --filter @repo/db typecheck
```

## Good Example
```ts
// Mapper receives pre-computed unrealized_pnl from DB row
return { unrealizedPnl: formatCurrency(row.unrealized_pnl) }
// ✓ No formula in mapper — just formatting
```

## Bad Example
```ts
// apps/web/components/PositionRow.tsx
const unrealizedPnl = (position.currentPrice - position.avgCost) * position.quantity
// ✗ Financial formula in React component — untestable, inconsistent with DB formula
```

## Safety Notes
If components compute PnL using floating-point JavaScript arithmetic while the DB uses `NUMERIC`, the values will differ by rounding. Users see two different PnL numbers depending on which code path runs — eroding trust and masking accounting errors.
