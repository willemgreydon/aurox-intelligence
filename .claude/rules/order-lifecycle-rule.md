# Order Lifecycle Rule

## Purpose
Simulation (and future live) orders follow a strict state machine. Every transition must be valid, atomic, and logged. Invalid transitions must be rejected. The order state must always reflect reality.

## Applies To
- `packages/db/src/repositories/`
- `packages/agents/src/workflows/`

## Rule
Order state machine:

```
PENDING → SUBMITTED → FILLED     (success path)
PENDING → SUBMITTED → REJECTED   (market/validation rejection)
PENDING → SUBMITTED → CANCELLED  (user cancellation)
PENDING → REJECTED               (pre-submission validation failure)
```

Rules:
- A `FILLED` order cannot transition to any other state
- A `REJECTED` order cannot transition to any other state
- A `CANCELLED` order cannot transition to any other state
- Only `PENDING` and `SUBMITTED` orders can be cancelled
- A `FILLED` order must produce a matching `simulation_transactions` record
- Order fill must update `simulation_positions` atomically

Order model fields:
```ts
type SimulationOrder = {
  id: string
  accountId: string
  symbol: string
  assetKind: AssetKind
  side: "buy" | "sell"
  quantity: number
  limitPrice?: number
  status: "pending" | "submitted" | "filled" | "rejected" | "cancelled"
  executionMode: "simulation" | "live"
  createdAt: number
  filledAt?: number
  rejectedReason?: string
}
```

## Forbidden
- Direct status update without checking the current status first
- `UPDATE app.simulation_orders SET status = 'filled'` without atomically updating positions and transactions
- Allowing a `FILLED` order to be cancelled
- Order that lacks a `rejectedReason` when status is `REJECTED`
- Order fill without corresponding transaction record

## Required Pattern
```ts
// packages/db/src/repositories/simulation-order-repository.ts
export async function fillSimulationOrder(orderId: string, fillPrice: number): Promise<void> {
  await db.begin(async (tx) => {
    const [order] = await tx`
      SELECT * FROM app.simulation_orders WHERE id = ${orderId} AND status = 'submitted' FOR UPDATE
    `
    if (!order) throw new OrderStateError(`Order ${orderId} is not in SUBMITTED state`)

    await tx`UPDATE app.simulation_orders SET status = 'filled', filled_at = NOW() WHERE id = ${orderId}`
    await tx`INSERT INTO app.simulation_transactions (order_id, symbol, quantity, price, ...) VALUES (...)`
    await tx`UPDATE app.simulation_positions SET quantity = quantity + ${order.quantity} WHERE ...`
    await tx`UPDATE app.simulation_accounts SET cash_balance = cash_balance - ${fillPrice * order.quantity} WHERE ...`
  })
}
```

## Validation
```bash
grep -r "status.*filled\|status.*rejected\|status.*cancelled" packages/db/src --include="*.ts"
grep -r "FOR UPDATE\|db\.begin\|transaction" packages/db/src/repositories --include="*.ts"
pnpm --filter @repo/db typecheck
```

## Good Example
```ts
// Check current state before transition
const [order] = await tx`SELECT status FROM app.simulation_orders WHERE id = ${id} FOR UPDATE`
if (order.status !== "submitted") throw new InvalidTransitionError(order.status, "filled")
// ✓ Guard ensures only valid transitions occur
```

## Bad Example
```ts
// Direct status overwrite without state check
await db`UPDATE app.simulation_orders SET status = 'filled' WHERE id = ${id}`
// ✗ Could overwrite a CANCELLED or already FILLED order, no atomic position update
```

## Safety Notes
An order that transitions to `FILLED` without a matching transaction record creates a phantom trade. The portfolio shows wrong cash and positions but the audit trail has no explanation. In live trading, this would mean capital moved but no record of where it went.
