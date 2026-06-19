# Runbook: Kill Switch Activation (Halt All Execution)

Halt execution across the platform. Today this protects the simulation engine;
the same control is the gate that will protect live execution once that path is
enabled. Read this entire runbook before acting — and read the
**implementation-state** section carefully, because the halt mechanism is
partially planned.

Related:
[`.claude/rules/kill-switch-rule.md`](../../.claude/rules/kill-switch-rule.md),
[`docs/live-microtrading/incident-response-and-kill-switch.md`](../live-microtrading/incident-response-and-kill-switch.md),
[`apps/web/lib/governance-gate.ts`](../../apps/web/lib/governance-gate.ts).

## Symptoms / Trigger

Activate the kill switch when any of the following occur (from the live incident runbook):

- Rapid loss acceleration or anomalous order activity.
- Sustained order-rejection spikes.
- Reconciliation mismatches beyond threshold.
- Stale/degraded market data while execution is active.
- A rogue signal or data-corruption event that could drive bad fills.
- Any infrastructure incident affecting execution reliability.

## Severity

- **SEV-1** by default. Halting is a containment action for capital-affecting or
  execution-integrity incidents. Activating the kill switch is always safe;
  hesitating under uncertainty is not.

## Preconditions

- Repo access and ability to restart / redeploy the web app.
- Repo-owner notified (kill-switch activation is a SEV-1 escalation trigger).
- Understand the current implementation state (next section).

## Implementation state — read this first

There are three layers here, with different maturity:

### Implemented: governance decision function

[`apps/web/lib/governance-gate.ts`](../../apps/web/lib/governance-gate.ts) is the
**source of truth for the halt doctrine**. It defines:

- `GovernanceState` with `killSwitchEnabled` and `emergencyStopEnabled` flags
  (both default `false` in `DEFAULT_GOVERNANCE_STATE`).
- `resolveExecutionGate(input)` — a pure function that returns a `GateDecision`.
  The kill switch / emergency stop are evaluated **first** and override
  everything: when either flag is set, the decision is
  `{ permitted: false, approvalState: 'BLOCKED_BY_KILL_SWITCH', blockCode: 'KILL_SWITCH' | 'EMERGENCY_STOP' }`.
- The approval state machine treats a halt as a revocation: an `APPROVED` state
  can transition to `BLOCKED_BY_KILL_SWITCH`, never silently re-open.

This logic is correct and unit-tested
([`apps/web/lib/governance-gate.test.ts`](../../apps/web/lib/governance-gate.test.ts)).

### Implemented: simulation "emergency stop" action (different semantics)

[`apps/web/server/actions/broker-mode-actions.ts`](../../apps/web/server/actions/broker-mode-actions.ts)
exposes `emergencyStopAction()`, wired into the Invest overview UI
([`apps/web/app/invest/overview/page.tsx`](../../apps/web/app/invest/overview/page.tsx)).
**Important:** this action currently calls `resetSimulationAccount(userId)` — it
**flattens the user's simulation positions and resets the account**, it does
**not** set a persistent halt flag. Use it to stop a runaway simulation account,
not as a global halt. See
[simulation-account-reset.md](./simulation-account-reset.md) for exactly what it does.

### TARGET / planned: persisted global halt wired into execution

The following do **not** yet exist and must be marked as targets:

- A persisted `GovernanceState` (the flags live in-process / passed into
  `resolveExecutionGate`; there is no DB-backed halt record surviving restart).
- `getExecutionHaltState` / `setExecutionHaltState` repositories and an
  `emergency-halt` server action — **planned**, not implemented. Do not assume
  these function names exist.
- A halt check at the entry of the agents trade workflow. This is a **known gap**,
  explicitly marked in
  [`packages/agents/src/__tests__/unified-trade-workflow.test.ts`](../../packages/agents/src/__tests__/unified-trade-workflow.test.ts)
  (`it.todo('blocks execution when the kill switch / halt state is active …')`).
  `runUnifiedTradeWorkflow` does **not** consult `resolveExecutionGate` today.

> **Consequence:** Until the halt gate is persisted and wired into the workflow,
> there is no single in-code flag that reliably stops all execution across a
> restart. The reliable containment action today is **operational** (stop the
> process / block the route), described below.

## Step-by-step actions

### A. Implemented containment (do this now)

1. **Stop the simulation execution surface.** The fastest reliable halt today is
   to take the execution path offline:
   - Take the web app process down or put it in maintenance, **or**
   - Disable the trade/submit server actions route so no new orders are accepted.
   This guarantees no new fills regardless of the governance flag wiring.

2. **If a single simulation account is the problem,** use the in-product control:
   on Invest → Overview, the **Emergency Stop** button triggers
   `emergencyStopAction()`, which resets that account (audit-safe — see
   [simulation-account-reset.md](./simulation-account-reset.md)). This stops that
   account's runaway behavior but does not halt the whole platform.

3. **Snapshot runtime state and logs** before further changes (per the live
   incident runbook): capture current logs, recent policy decisions, and recent
   simulation orders/transactions for the post-mortem.

4. **Notify the repo owner / on-call.** Kill-switch activation is always a
   repo-owner escalation.

### B. Wiring the governance kill switch (when implementing the TARGET)

When the persisted halt is built, the intended flow is:

1. A privileged `emergency-halt` server action sets `killSwitchEnabled = true`
   (or `emergencyStopEnabled = true`) in the persisted `GovernanceState`.
2. Every execution entry point (the agents workflow and the trade server action)
   calls `resolveExecutionGate(...)` and refuses to proceed when
   `blockCode === 'KILL_SWITCH'` or `'EMERGENCY_STOP'`.
3. The activation is written to an audit/system-event log.
4. `revalidatePath('/invest')` (and related paths) so the UI reflects the halt.

Follow [`.claude/rules/kill-switch-rule.md`](../../.claude/rules/kill-switch-rule.md):
the flag must be DB-backed (survive restart), checked in **all** workflows
(simulation included), settable via server action, logged as a system event, and
require explicit confirmation to re-enable.

## Verification

1. **No new fills.** Confirm no new `simulation_orders` / `simulation_transactions`
   rows are being created for the affected scope after containment.
2. If using the route/process containment: confirm the trade action returns a
   blocked/maintenance response and the process is down or read-only.
3. (When governance halt is wired) confirm `resolveExecutionGate` returns
   `permitted: false` with `blockCode` of `KILL_SWITCH`/`EMERGENCY_STOP` for a
   sample order, and that the UI shows the halted state.

## Rollback / Recovery (re-enable execution)

Re-enabling execution after a halt is a deliberate, gated action — never a quiet
revert. Per the live recovery protocol and the kill-switch rule:

1. **Root cause identified** and understood.
2. **Fix deployed and validated** (in staging/shadow where applicable).
3. **Explicit repo-owner sign-off** recorded.
4. **Re-enable**:
   - Operational containment: bring the process back / re-enable the trade route.
   - (When governance halt is wired) set `killSwitchEnabled`/`emergencyStopEnabled`
     back to `false` via the privileged action, log the change, and revalidate.
5. **Gradual re-enable** — manual execution first; do not restore any autonomous
   path until confidence is re-established.

## Post-incident follow-up

- Write the incident report with a full timeline (per
  [`docs/live-microtrading/incident-response-and-kill-switch.md`](../live-microtrading/incident-response-and-kill-switch.md)).
- **Highest-priority follow-up:** close the known gap — persist `GovernanceState`,
  add the `emergency-halt` action plus `get/setExecutionHaltState`, and wire the
  halt check into `runUnifiedTradeWorkflow`. Delete the `it.todo` marker in
  [`unified-trade-workflow.test.ts`](../../packages/agents/src/__tests__/unified-trade-workflow.test.ts)
  only once the halt is asserted by a real test.
- Add a regression test that proves execution is blocked while halted (simulation
  and, later, live).
- Bump guardrail/policy version and record corrective actions.
