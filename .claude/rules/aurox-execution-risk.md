# Aurox Execution & Risk Rules

## Purpose
Execution is the highest-risk domain in the system. Simulation is the default. Every execution path must pass risk validation, be transactional, and be auditable. Failures must close safely.

## Applies To
- `packages/agents/`
- `packages/db/**simulation**`
- `packages/db/**order**`
- `packages/db/**transaction**`
- `packages/db/**portfolio**`
- `apps/web/**invest**`
- `apps/web/**simulation**`

## Rule
Risk priority:
```text
Risk > Policy > Agent > User Request > UI Convenience
```

Execution is high risk. Simulation is the default execution target. Live execution is gated.

## Forbidden
- Bypass risk checks for any reason
- Execute without input validation (Zod + constraint checks)
- Mutate portfolio without a transaction log
- Introduce randomness into accounting
- Create broker calls from UI components
- Enable live execution by default
- Enable autonomous live trading by default

## Required Pre-Execution Checks
- Instrument constraints (min_qty, min_notional, tick_size, step_size)
- Cash availability (read from DB — not cached)
- Max position size (respect portfolio risk caps)
- Max drawdown (respect portfolio drawdown limit)
- Lane permissions (account lane permits this order)
- Data freshness (quote is not stale)
- Provider confidence (signal confidence meets minimum)
- Kill switch (halt state is not active)

## Required Pattern
```ts
// Fail closed on every validation failure
if (!riskResult.passed) {
  await logRiskRejection(order, riskResult)
  return { success: false, reason: "risk_check_failed" }
}
// Only submit after all checks pass
await submitOrder(order)
```

## Fail Closed
If validation fails:
```text
reject order
preserve all state
log failure reason with order context
return typed error result
```

## Validation
```bash
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/agents test
grep -r "runPreTradeRiskCheck\|riskCheck" packages/agents/src --include="*.ts"
grep -r "skipRisk\|bypassRisk" packages/agents/src --include="*.ts"
```

## Good Example
```ts
const riskResult = await runPreTradeRiskCheck(order, portfolio)
if (!riskResult.passed) return { success: false, ...riskResult }
await db.begin(async (tx) => { /* atomic order + transaction + position */ })
// ✓ Risk-gated, transactional, auditable
```

## Bad Example
```ts
// Skip risk check for simulation — "it's fake money anyway"
if (isLive) await runPreTradeRiskCheck(order, portfolio)
await submitOrder(order)
// ✗ Simulation without risk checks is not predictive of live behavior
```

## Safety Notes
A risk check that only runs in live mode means simulation results are not representative of live trading outcomes. Every risk gate that is removed from simulation is a gap between what the simulation tests and what live trading actually does.
