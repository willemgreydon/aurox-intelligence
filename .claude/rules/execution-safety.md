# Execution Safety Rule

## Purpose
Execution logic must be isolated, transactional, and fail-closed. It must never proceed under uncertainty. Every order must be fully validated before any state is mutated.

## Applies To
- `packages/agents/src/workflows/`
- `packages/db/src/repositories/`
- `apps/web/server/actions/`

## Rule
Before any order state is mutated, the system must confirm all of the following:

1. **Input validation** — order fields are Zod-validated, not raw user input
2. **Instrument constraints** — min_qty, min_notional, tick_size, step_size satisfied
3. **Cash availability** — confirmed against current account balance (not cached)
4. **Risk check passed** — all pre-trade checks completed and passed
5. **Execution mode confirmed** — mode read from DB, not from request
6. **Lane permission** — account lane allows this order type and asset class
7. **Data freshness** — quote used for order price is not stale

If any step fails:
```text
Reject immediately
Do not mutate any table
Log reason with order context
Return typed error
```

The execution flow in `packages/agents`:
```text
simulation-trade-workflow.ts  → default simulation path
unified-trade-workflow.ts     → mode-aware routing
broker-supervisor-agent.ts    → broker validation and live path gate
```

## Forbidden
- Optimistic order submission (submit first, validate later)
- Swallowing instrument constraint errors silently
- Using user-provided price as execution price without market data verification
- Executing a sell order without confirming position exists
- Creating partial order fills without atomic position + transaction updates
- Logging an error but proceeding to submit the order anyway

## Required Pattern
```ts
export async function runSimulationTradeWorkflow(order: ValidatedTradeOrder): Promise<TradeResult> {
  const constraints = await getInstrumentConstraints(order.symbol)
  const constraintCheck = validateOrderConstraints(order, constraints)
  if (!constraintCheck.valid) {
    return { success: false, reason: "constraint_violation", detail: constraintCheck.reason }
  }
  const account = await getSimulationAccount(order.accountId)
  if (account.cashBalance < order.estimatedNotional) {
    return { success: false, reason: "insufficient_cash" }
  }
  return await db.begin(async (tx) => {
    // atomic: order + transaction + position + balance
    return commitSimulationOrder(tx, order, account)
  })
}
```

## Validation
```bash
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/agents test
grep -r "begin\|transaction" packages/agents/src --include="*.ts"
grep -r "constraintCheck\|instrumentConstraints" packages/agents/src --include="*.ts"
```

## Good Example
```ts
if (order.quantity < constraints.minQty) {
  return { success: false, reason: `min_qty_not_met: ${constraints.minQty}` }
}
// ✓ Constraint check returns typed error, no state mutation occurs
```

## Bad Example
```ts
try {
  await submitOrder(order)
} catch (e) {
  console.log("Order failed but continuing", e)  // ✗ Swallowing execution failure
}
// ✗ System in unknown state after swallowed error
```

## Safety Notes
An optimistic order submission that fails mid-way leaves the portfolio in an inconsistent state. In simulation this creates phantom positions. In live trading it means capital was committed but position was never recorded — a critical accounting defect.
