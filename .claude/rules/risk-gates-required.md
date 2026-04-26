# Risk Gates Required Rule

## Purpose
Every execution path — simulation or live — must pass through risk validation before an order is submitted. Risk gates cannot be removed, disabled, or commented out. If a risk check is uncertain, the system must reject the order.

## Applies To
- `packages/agents/`
- `packages/db/src/repositories/`
- `apps/web/server/actions/`

## Rule
Risk priority order:
```text
Risk > Policy > Agent > User Request > UI Convenience
```

Mandatory risk checks before any order submission:

| Check | Description |
|---|---|
| Cash availability | Available cash >= order notional value |
| Max position size | New position does not exceed per-asset exposure cap |
| Max drawdown | Portfolio drawdown does not exceed configured threshold |
| Liquidity threshold | Asset volume is sufficient for the order size |
| Slippage threshold | Expected slippage is within acceptable bounds |
| Instrument constraints | Min quantity, min notional, tick size, step size |
| Stop-loss policy | Exit policy is defined for the position |
| Anomaly conditions | Signal confidence is above minimum threshold |
| Lane permissions | Account lane permits the requested trade type |
| Data freshness | Market data is not stale beyond acceptable threshold |

On any failed check:
```text
reject order
preserve all state
log failure reason
return typed error to caller
```

## Forbidden
- `// TODO: add risk check` in execution paths
- `if (skipRiskForDev) { ... }` patterns
- Feature flags that disable risk in production
- Risk checks that only run in live mode (simulation must also validate)
- Catching risk check errors and proceeding anyway
- Trusting user-submitted position sizes without server-side validation

## Required Pattern
```ts
// packages/agents/src/risk/pre-trade-check.ts
export async function runPreTradeRiskCheck(order: TradeOrder, portfolio: Portfolio): Promise<RiskCheckResult> {
  const checks = [
    checkCashAvailability(order, portfolio),
    checkMaxPositionSize(order, portfolio),
    checkDrawdownLimit(portfolio),
    checkInstrumentConstraints(order),
    checkDataFreshness(order.symbol)
  ]
  const results = await Promise.all(checks)
  const failed = results.filter(r => !r.passed)
  if (failed.length > 0) {
    return { passed: false, failures: failed }
  }
  return { passed: true }
}
```

## Validation
```bash
grep -r "runPreTradeRiskCheck\|riskCheck\|checkRisk" packages/agents/src --include="*.ts"
grep -r "skipRisk\|bypassRisk\|// TODO.*risk" packages/agents/src apps/web/server/actions --include="*.ts"
pnpm --filter @repo/agents typecheck
```

## Good Example
```ts
const riskResult = await runPreTradeRiskCheck(order, portfolio)
if (!riskResult.passed) {
  await logRiskRejection(order, riskResult.failures)
  return { success: false, reason: "risk_check_failed", details: riskResult.failures }
}
await submitOrder(order)
// ✓ Order only submitted after risk passes
```

## Bad Example
```ts
// "risk check is expensive, skip for simulation"
const skipRisk = process.env.NODE_ENV === "development"
if (!skipRisk) await runPreTradeRiskCheck(order, portfolio)
await submitOrder(order)  // ✗ Proceeds without risk check in dev/simulation
```

## Safety Notes
A risk check that only runs in live mode gives false confidence during simulation testing. Simulation orders must be subject to the same risk logic — otherwise the simulation results are not predictive of live trading outcomes.
