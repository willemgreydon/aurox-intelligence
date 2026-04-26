# Kill Switch Rule

## Purpose
The system must have an operational kill switch that halts all active execution (simulation and live) immediately. The kill switch must be testable, observable, and present in all execution-capable workflows.

## Applies To
- `packages/agents/src/workflows/`
- `packages/agents/src/readiness/`
- `apps/web/server/actions/`

## Rule
An operational kill switch means:
1. A mechanism exists to set a `halted` flag on an account or the global execution system
2. All execution workflows check this flag before proceeding
3. The flag can be set via server action, not just by direct DB mutation
4. The halt state is logged as a system event
5. Re-enabling execution after a halt requires explicit confirmation

Kill switch check location:
```text
packages/agents/src/workflows/ — each workflow must check halt state at entry
```

Kill switch activation:
```text
apps/web/server/actions/emergency-halt.ts — privileged server action
```

The halt flag must be stored in the DB (not in-memory) so it survives process restarts.

## Forbidden
- Execution workflows with no kill switch check
- Kill switch that only works in live mode (simulation workflows must also respect halt)
- Kill switch state stored only in-memory
- Kill switch that requires a code deploy to activate
- Kill switch that has no observable log entry when activated
- Removing kill switch check to "clean up" a workflow

## Required Pattern
```ts
// packages/agents/src/workflows/simulation-trade-workflow.ts
export async function runSimulationTradeWorkflow(order: TradeOrder): Promise<TradeResult> {
  const haltState = await getExecutionHaltState(order.accountId)
  if (haltState.isHalted) {
    return { success: false, reason: "execution_halted", haltedAt: haltState.haltedAt }
  }
  // ... proceed with normal execution
}

// apps/web/server/actions/emergency-halt.ts
"use server"
export async function activateEmergencyHalt(accountId: string) {
  await setExecutionHaltState(accountId, { isHalted: true, reason: "manual_halt" })
  await logSystemEvent("EMERGENCY_HALT_ACTIVATED", { accountId })
  revalidatePath("/invest")
  return { success: true }
}
```

## Validation
```bash
grep -r "haltState\|isHalted\|killSwitch\|emergencyHalt" packages/agents/src --include="*.ts"
grep -r "getExecutionHaltState\|setExecutionHaltState" packages/agents/src apps/web/server/actions --include="*.ts"
pnpm --filter @repo/agents typecheck
```

## Good Example
```ts
// Entry of every execution workflow
const halt = await getExecutionHaltState(accountId)
if (halt.isHalted) return { success: false, reason: "halted" }
// ✓ Kill switch checked before any order processing
```

## Bad Example
```ts
export async function runSimulationTradeWorkflow(order: TradeOrder) {
  // No halt check — kill switch bypass
  await submitOrder(order)
}
// ✗ Workflow proceeds even if halt is active
```

## Safety Notes
A kill switch that only works in live mode provides no protection during simulation testing. A kill switch stored only in-memory is reset on every server restart. Both defects mean that in a real emergency — provider outage, rogue signal, data corruption — there is no reliable way to stop the system.
