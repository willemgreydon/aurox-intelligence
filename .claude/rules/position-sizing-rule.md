# Position Sizing Rule

## Purpose
Position size calculations must respect instrument constraints, portfolio risk limits, and lane-level capital caps. Position sizing logic lives in `packages/agents` — not in UI forms or route handlers.

## Applies To
- `packages/agents/src/`
- `apps/web/server/actions/`
- `apps/web/components/`

## Rule
Position sizing must account for all of the following before an order is sized:

| Constraint | Source |
|---|---|
| `min_quantity` | Instrument spec from broker/provider |
| `min_notional` | Instrument spec (e.g., $1 minimum for fractional) |
| `tick_size` | Price precision (e.g., $0.01 for stocks) |
| `step_size` | Quantity precision (e.g., 0.001 for crypto) |
| `max_position_pct` | Portfolio risk config (e.g., max 10% in one asset) |
| `lane_capital_cap` | Lane-level capital limit |
| `available_cash` | Actual account balance, not cached |
| `signal_confidence` | Position size should scale with confidence |

Position sizing formula (risk-based):
```
max_position_size = min(
  available_cash × max_position_pct,
  lane_capital_cap × confidence,
  available_cash − min_cash_reserve
)
quantity = floor(max_position_size / order_price / step_size) × step_size
```

## Forbidden
- User-submitted quantity used directly without server-side validation against constraints
- Position size computed in a React form without server verification
- Ignoring `min_notional` (can result in broker rejection)
- Ignoring `step_size` (can result in precision errors)
- Position size that does not account for remaining available cash
- Allowing a position to exceed `max_position_pct` of portfolio value

## Required Pattern
```ts
// packages/agents/src/sizing/position-sizer.ts
export function computePositionSize(params: {
  availableCash: number
  orderPrice: number
  constraints: InstrumentConstraints
  riskConfig: LaneRiskConfig
  signalConfidence: number
}): PositionSizeResult {
  const maxByRisk = params.availableCash * params.riskConfig.maxPositionPct
  const maxByLane = params.riskConfig.laneCapitalCap * params.signalConfidence
  const rawNotional = Math.min(maxByRisk, maxByLane, params.availableCash - params.riskConfig.minCashReserve)
  const rawQty = rawNotional / params.orderPrice
  const quantity = Math.floor(rawQty / params.constraints.stepSize) * params.constraints.stepSize

  if (quantity * params.orderPrice < params.constraints.minNotional) {
    return { valid: false, reason: "below_min_notional" }
  }
  if (quantity < params.constraints.minQuantity) {
    return { valid: false, reason: "below_min_quantity" }
  }
  return { valid: true, quantity }
}
```

## Validation
```bash
pnpm --filter @repo/agents typecheck
grep -r "computePositionSize\|positionSizer\|stepSize\|minNotional" packages/agents/src --include="*.ts"
grep -r "quantity\b" apps/web/server/actions --include="*.ts" | grep "formData\|input\."
```

## Good Example
```ts
const sizing = computePositionSize({ availableCash, orderPrice, constraints, riskConfig, signalConfidence })
if (!sizing.valid) return { success: false, reason: sizing.reason }
// ✓ All constraints respected before order is submitted
```

## Bad Example
```ts
const quantity = parseFloat(formData.get("quantity") as string)
await submitSimulationOrder({ symbol, quantity, side: "buy" })
// ✗ Raw user quantity, no constraint check, no risk cap, no step_size rounding
```

## Safety Notes
An order with quantity below `min_notional` is rejected by the broker, wasting the round-trip. An order that ignores `step_size` creates a precision error that some brokers fill at the wrong quantity and others reject entirely. Both waste capital and create confusing audit records.
