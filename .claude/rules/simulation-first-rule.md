# Simulation First Rule

## Purpose
Simulation is the default and mandatory execution target. Live execution is gated behind explicit readiness checks. No code change may make live execution easier to enable or simulation easier to bypass.

## Applies To
- `packages/agents/`
- `packages/db/src/repositories/`
- `apps/web/server/actions/`
- `apps/web/app/**invest**`
- Any code that routes trade operations

## Rule
The execution mode hierarchy:
```text
SIMULATION (default) → PAPER (when live broker is connected) → LIVE (gated)
```

Every trade operation must:
1. Determine execution mode from the order context (never from user-provided input directly)
2. Default to SIMULATION if mode is ambiguous or unreadable
3. Route through the simulation engine for all non-live executions
4. Log the execution mode with every order

The simulation engine tables (`simulation_accounts`, `simulation_portfolios`, `simulation_orders`, `simulation_positions`, `simulation_transactions`, `simulation_snapshots`) must be treated as a serious financial ledger — not a test scaffold.

## Forbidden
- Defaulting execution mode to `"live"` anywhere in the system
- Allowing user-submitted form input to directly set execution mode without server-side verification
- Creating shortcuts that bypass simulation accounting to "speed up" development
- Using in-memory state to represent simulation portfolio (must persist to DB)
- Adding `// TODO: add simulation check later` and shipping without it
- Treating simulation PnL as approximate or display-only

## Required Pattern
```ts
// packages/agents/src/workflows/unified-trade-workflow.ts
export async function executeTradeWorkflow(order: TradeOrder): Promise<TradeResult> {
  const mode = resolveExecutionMode(order.accountId)  // reads from DB, never from raw input
  if (mode === "simulation") {
    return runSimulationExecution(order)
  }
  if (mode === "live") {
    await assertLiveReadinessGate(order.accountId)  // must pass before proceeding
    return runLiveExecution(order)
  }
  throw new ExecutionModeError("Unknown execution mode — rejecting order")
}
```

## Validation
```bash
grep -r "execution_mode\|executionMode" packages/agents/src --include="*.ts"
grep -r '"live"' packages/agents/src --include="*.ts"
grep -r "assertLiveReadiness\|liveGate" packages/agents/src --include="*.ts"
pnpm --filter @repo/agents typecheck
```

## Good Example
```ts
const mode = await resolveExecutionMode(accountId)
// mode is read from the account's DB record, not from request parameters
if (mode !== "simulation" && mode !== "paper") {
  await assertLiveReadinessGate(accountId)
}
// ✓ Simulation is default, live is gated by readiness assertion
```

## Bad Example
```ts
const mode = formData.get("mode") as string  // ✗ user controls execution mode directly
await executeTrade({ ...order, mode })       // ✗ no readiness gate for live
```

## Safety Notes
An accidental live execution of a trade order at market price is irreversible. The cost of a simulation-first default is near zero. The cost of an unintended live order is real capital loss.
