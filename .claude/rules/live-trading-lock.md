# Live Trading Lock Rule

## Purpose
Live execution is locked by default and can only be activated through an explicit, multi-step readiness gate. No code change may weaken this gate or make live execution easier to accidentally trigger.

## Applies To
- `packages/agents/`
- `apps/web/server/actions/`
- Any execution mode configuration

## Rule
Live execution is gated. The gate requires ALL of the following to pass:

1. **Broker adapter validated** — broker is configured, authenticated, and responding
2. **Risk gates active** — all pre-trade risk checks are passing
3. **Execution mode explicitly set to live** — in DB by a privileged action, not from request params
4. **Capital verified** — actual broker account balance confirmed (not simulation balance)
5. **Kill switch armed** — emergency stop mechanism is present and testable
6. **Data freshness verified** — real-time market data is confirmed fresh
7. **Observability active** — logging and alerting is confirmed running

Until ALL conditions pass, the system must route to simulation regardless of any configuration.

The live readiness gate lives in:
```text
packages/agents/src/readiness/live-readiness-gate.ts
```

## Forbidden
- Setting `executionMode = "live"` in any seed data or migration
- Creating a test helper that bypasses the readiness gate
- Accepting execution mode from `process.env.FORCE_LIVE_MODE` without gate checks
- Adding a UI toggle that switches to live without server-side gate verification
- Shipping a disabled or placeholder live readiness gate
- Creating a broker adapter that defaults to live execution

## Required Pattern
```ts
// packages/agents/src/readiness/live-readiness-gate.ts
export async function assertLiveReadinessGate(accountId: string): Promise<void> {
  const checks = await runAllReadinessChecks(accountId)
  const failed = checks.filter(c => !c.passed)
  if (failed.length > 0) {
    throw new LiveReadinessError(
      `Live execution blocked: ${failed.map(c => c.name).join(", ")}`
    )
  }
}

// packages/agents/src/workflows/unified-trade-workflow.ts
if (resolvedMode === "live") {
  await assertLiveReadinessGate(order.accountId)  // throws if not ready
  return await runLiveExecution(order)
}
```

## Validation
```bash
grep -r "assertLiveReadiness\|liveReadinessGate\|LiveReadinessError" packages/agents/src --include="*.ts"
grep -r '"live"\|live_mode\|LIVE' packages/agents/src --include="*.ts"
pnpm --filter @repo/agents typecheck
```

## Good Example
```ts
// Explicit gate — throws if any readiness check fails
await assertLiveReadinessGate(accountId)
// Only reaches this line if ALL checks passed
await brokerAdapter.submitOrder(order)
// ✓ Live execution is gated by a throwing assertion
```

## Bad Example
```ts
const isLive = process.env.LIVE_MODE === "true"
if (isLive) {
  await brokerAdapter.submitOrder(order)  // ✗ No readiness gate, just env var
}
```

## Safety Notes
Bypassing the live readiness gate submits a real order to a real broker at real market prices. This is irreversible and may cost significant capital. The readiness gate is a non-negotiable safety mechanism, not a developer convenience check.
