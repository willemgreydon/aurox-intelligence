# AGENTS.md — Aurox Agent System

**Version:** 1.0
**Status:** Authoritative — updated after each agent workflow or policy change

---

## 1. Purpose

This document describes the Aurox agent system: the orchestration layer that governs
trade decisions, enforces policy and risk rules, and routes execution to the appropriate
adapter (simulation or live). Agents in Aurox are not AI models — they are deterministic
decision and validation components that enforce rules before any order reaches an adapter.

---

## 2. Agent Package Location

All agent code lives in:

```
packages/agents/src/
```

No agent logic is allowed in `apps/web`, route handlers, or UI components.

---

## 3. Agent Modes

### Mode 1: Manual

The user explicitly submits every order through the UI.

- Decision source: `manual_ui`
- AI may provide analysis and recommendations
- No autonomous execution
- All orders require user intent → server action → validation → execution
- **Current default for all active lanes**

### Mode 2: AI-Assisted (Planned)

AI proposes ranked opportunities. User approves order-by-order or via session policy.

- Decision source: `ai_assisted`
- All submissions still human-gated via `requireHumanApproval: true`
- No orders execute without explicit user confirmation
- **Not yet active** — requires AI suggestion pipeline and confirmation UI

### Mode 3: Autonomous (Future / Gated)

AI executes orders within a strict lane envelope. Only allowed if all of:

- Readiness gate passes
- Risk checks pass
- Broker validated and connected
- Capital cap explicitly configured by user
- Kill-switch active and tested
- Operator approval granted

**Autonomous live execution is explicitly blocked** at the service layer:

```typescript
if (config.executionTarget === 'live' && intent.source === 'ai_autonomous') {
  return agentError(
    'Autonomous live execution is not enabled in this patch.',
    'LIVE_AUTONOMOUS_DISABLED',
  );
}
```

This guard must not be removed without full architecture review.

---

## 4. Agent Components

### Policy Engine (`core/policy-engine.ts`)

Evaluates whether a trade intent is allowed under the current lane policy configuration.
Returns a policy verdict before risk checks are run.

### Agent Orchestrator (`core/agent-orchestrator.ts`)

Coordinates the sequence: policy → risk → execution. Handles the result chain and
ensures all guards are applied in order.

### Broker Supervisor (`broker/broker-supervisor-agent.ts`)

The primary pre-execution gate. Runs:
1. Capital checks (capital guard)
2. Position limit checks
3. Drawdown checks
4. Daily loss checks
5. Signal confidence filter
6. Volatility filter (mode-specific)
7. Order state machine transition

Returns a `DecisionPacket` with:
- `orderState` — `draft | proposed | awaiting_user_approval | approved | rejected_by_policy | rejected_by_risk`
- `allowedOrderNotional` — bounded notional the order may use
- `auditEntries` — log of all checks performed

### Capital Guard Agent (`risk/capital-guard-agent.ts`)

Enforces per-lane capital limits. See `docs/RISK.md` for details.

### Position Limit Agent (`risk/position-limit-agent.ts`)

Enforces max open positions and max concentration per asset.

### Drawdown Guard Agent (`risk/drawdown-guard-agent.ts`)

Blocks new buys when drawdown exceeds the lane threshold.

### Risk Engine (`risk/risk-engine.ts`)

Computes composite risk state for the current lane and workspace.

### Reconciliation Agent (`execution/reconciliation-agent.ts`)

Post-submit verification agent that checks the submitted order matches the execution
request. Used to detect fill engine inconsistencies or race conditions.

---

## 5. Workflows

### Simulation Trade Workflow (`workflows/simulation-trade-workflow.ts`)

Used for direct simulation-path orders (no live adapter involved).

```
Intent + Config + Bundle + Context + Deps
  → loadWorkspace
  → loadMarketPrice
  → resolveAssetId
  → runBrokerSupervisor (policy + risk)
  → resolveQuantity
  → deps.submitOrder (→ executeSimulationOrder in @repo/db)
  → return SimulationTradeResult
```

DB operations are injected via `SimulationWorkflowDeps` — the workflow has no direct
`@repo/db` import. Callers (server actions) bind the real repository functions.

### Unified Trade Workflow (`workflows/unified-trade-workflow.ts`)

Used for all execution paths — simulation and live — through a common adapter interface.

```
Intent + Config + Bundle + Context + Adapter + Deps
  → validate adapter.executionTarget matches config.executionTarget
  → loadWorkspace
  → loadMarketPrice
  → resolveAssetId
  → runBrokerSupervisor
  → check for awaiting_user_approval (block if set)
  → resolveQuantity
  → buildExecutionRequest
  → adapter.submitOrder
  → return UnifiedTradeResult
```

---

## 6. Adapters

### SimulationBrokerAdapter (`adapters/simulation-broker-adapter.ts`)

Routes to `@repo/db` simulation order execution.
- `executionTarget: 'simulation'`
- No external network calls
- Returns a typed `ExecutionOrderResult`

### LiveBrokerExecutionAdapter (`apps/web/server/lib/brokers/live-execution-adapter.ts`)

Routes to a configured real broker (Binance or Coinbase).
- `executionTarget: 'live'`
- **Not active** — requires broker credentials + readiness gate passage
- Not yet production-validated

---

## 7. Intelligence Bundle

Before calling any workflow, a `IntelligenceDecisionBundle` is built:

```typescript
type IntelligenceDecisionBundle = {
  signal: { direction: 'bullish' | 'bearish' | 'neutral'; confidence: number };
  generatedAt: string;
};
```

For manual trades: `buildManualTradeBundle` provides a neutral bundle with confidence
passed from the intent (default 0.5).

For AI-assisted trades (future): the bundle will be built from signal synthesis and
market intelligence agents.

---

## 8. Readiness Gate (`readiness/live-readiness-gate.ts`)

`checkLiveReadiness(config, context)` evaluates:

| Check                 | Required for live? | Severity |
|-----------------------|--------------------|----------|
| Mode enabled          | Always             | critical |
| User verified         | If configured      | critical |
| Broker connection     | If configured      | critical |
| Market data healthy   | If configured      | warning/critical |
| Simulation history    | Live only          | critical |
| Not read-only         | Live only          | critical |

Returns `LiveReadinessResult` with `ready: boolean` and `blockingCheckCount`.

A mode is only ready when `blockingCheckCount === 0`.

---

## 9. Broker Mode Registry

`apps/web/server/config/broker-mode-registry.ts` defines all valid execution modes.

Each mode has:
- `id` — string identifier used in session config and audit records
- `label` — display name
- `enabled` — gate flag; disabled modes cannot be reached
- `requiresVerifiedUser` — forces identity verification before activation
- `requireHumanApproval` — forces user confirmation before order submission
- `executionTarget` — `simulation | live`
- `allowedAssetKinds` — which asset classes this mode accepts
- `capital` — per-mode capital envelope
- `risk` — per-mode risk thresholds
- `trading` — order cadence and type restrictions
- `approvals` — connection and data freshness requirements

---

## 10. Audit Trail

Every agent decision produces `AuditEntry[]` records attached to the `DecisionPacket`.

Entries capture:
- Check name and description
- Pass/fail result
- Reason string (human-readable)
- Severity level

These are logged with every order and visible in the order notes for simulation history.

---

## 11. Agent System Constraints

These must remain enforced:

❌ No agent may bypass the broker supervisor
❌ No agent may mutate portfolio state directly — only via adapter → @repo/db
❌ No agent may call provider APIs — use injected market price dependencies only
❌ Autonomous live execution must remain blocked until full safety stack is in place
❌ An `awaiting_user_approval` order state must block execution — never auto-approve
❌ Agent workflows must return `AgentResult<T>` — never throw to the caller

---

## 12. Planned Agent Additions

These agents are not yet implemented:

- **Signal synthesis agent** (scaffolded) — builds signal bundle from `@repo/signals` outputs
- **Market intelligence agent** (scaffolded) — enriches decisions with intelligence context
- **Stop-loss enforcement agent** — monitors positions and triggers sell on threshold breach
- **Reconciliation loop agent** — periodic post-submit state verification for live trades
- **Kill-switch agent** — halts all active executions and cancels pending orders on trigger

Each planned agent must follow the same `AgentResult<T>` contract and must not bypass
existing guards when implemented.
