# `@repo/agents` — Execution Orchestration, Risk Gates & Broker Abstraction

**Package:** `packages/agents` · **npm name:** `@repo/agents`
**Status:** Authoritative — update after each execution / risk / readiness change.

Owns trade-workflow orchestration, the pre-trade risk gate stack, policy evaluation,
execution-mode + live-readiness gating, broker abstraction, and the simulation-safe AI
agent. See [EXECUTION.md](../EXECUTION.md), [RISK.md](../RISK.md), and
[SIMULATION_ENGINE.md](../SIMULATION_ENGINE.md) for system-level context.

---

## 1. Purpose & Boundary

`@repo/agents` is the **execution orchestration layer**. It turns a validated trade
intent + intelligence bundle into a gated, audited order — or a typed rejection.

Boundary & safety constraints (`.claude/rules/architecture-boundaries.md`,
`aurox-execution-risk.md`, `risk-gates-required.md`, `simulation-first-rule.md`,
`live-trading-lock.md`, `kill-switch-rule.md`, `db-boundary.md`):

- **No direct `@repo/db` import.** All persistence is **dependency-injected** — workflows
  receive `loadWorkspace` / `loadMarketPrice` / `resolveAssetId` / `submitOrder` from the
  caller (`apps/worker`, `apps/web` server actions). This keeps SQL in `@repo/db`.
- **Risk overrides everything:** `Risk > Policy > Agent > User Request > UI Convenience`.
  No bypass paths. Risk runs in **simulation too** — not live-only.
- **Simulation is the default execution target.** Live is gated; autonomous live is
  disabled by default until explicit opt-in.
- **Fail closed:** any guard failure returns a typed `AgentResult` error and mutates no
  state.
- **Auditable:** every supervised decision emits an in-memory audit trail.

---

## 2. Directory Map

| Subfolder | Responsibility |
|---|---|
| `workflows/` | Entrypoints: `runSimulationTradeWorkflow`, `runUnifiedTradeWorkflow`. Orchestrate supervisor → sizing → adapter submit. |
| `broker/` | Broker **supervisor** (`runBrokerSupervisor`, the gate sequencer), broker abstraction/adapters (`SimulatedBroker`, binance/coinbase/stock adapters, registry), and `broker-intelligence` decisioning. |
| `core/` | `runPolicyChecks` (policy engine) and `createAuditTrail` (orchestrator audit). |
| `risk/` | Pre-trade guards: `runCapitalGuard`, `runPositionLimitAgent`, `runDrawdownGuard`, plus `assessTradeRisk` (trade-risk-engine) and a generic `checkRisk` (risk-engine). |
| `policies/` | `checkModePolicy`, `checkMoneyLimitPolicy`, capital math (`computeAllowedCapital`, `computeAllowedOrderNotional`). |
| `execution/` | `evaluateExecutionModeGate` (live-readiness gate, KYC/kill-switch/audit), `EXECUTION_MODE_REGISTRY`, `reconcileExecution`. |
| `readiness/` | `checkLiveReadiness` — mode/connection/market-data/simulation-history readiness scoring. |
| `orders/` | `transitionOrder` — order state-machine guard (throws on invalid transitions). |
| `simulation/` | `simulateFill` — deterministic slippage-adjusted fill price. |
| `adapters/` | `BrokerExecutionAdapter` interface + `createSimulationBrokerAdapter`. |
| `autonomous/` | `runAgentDryRun` (simulation-safe dry-run) + capability types. Live execution is disabled here. |
| `ai-simulation-agent/` | `runAiSimulationAgent` — wraps an LLM caller, validates output against the contract, and enforces simulation-only + confidence + cap safety rules. |
| `intelligence/` | Recommendation/synthesis/news agents (intelligence composition; see `@repo/ai-market-intelligence` for the broader layer). |
| `market/` | `quote-resolver` helper. |
| `types/` | Zod-backed `broker-types`, plus `agent-types`, `execution-types`, `audit-types`, `policy-types`. |
| `__tests__/` | Vitest specs for every guard, both workflows, adapter, fill engine, readiness, AI agent. |

---

## 3. Key Exports / Public API

All re-exported from `packages/agents/src/index.ts` unless noted.

### Workflow entrypoints

| Export | Signature (summary) | What it does |
|---|---|---|
| `runSimulationTradeWorkflow` | `(intent, config, bundle, context, deps) => Promise<AgentResult<SimulationTradeResult>>` | Default path. Loads workspace/price/asset via injected deps, runs the supervisor gate stack, sizes the order, then calls injected `submitOrder` (simulation repository). |
| `runUnifiedTradeWorkflow` | `(intent, config, bundle, context, adapter, deps) => Promise<AgentResult<UnifiedTradeResult>>` | Mode-aware path. Asserts `adapter.executionTarget === config.executionTarget`, runs the same gate stack, then submits through a `BrokerExecutionAdapter`. |

### Gate sequencer & guards

| Export | Signature (summary) | What it does |
|---|---|---|
| `runBrokerSupervisor` | `(intent, config, workspace, context) => AgentResult<SupervisorResult>` | Sequences **capital guard → policy checks → position-limit guard**; builds the `DecisionPacket` + audit trail; sets `orderState` to `approved` or `awaiting_user_approval`. |
| `runCapitalGuard` | `(summary, orders, config, side) => AgentResult<CapitalGuardResult>` | Buy-side capital envelope: cash > 0, `computeAllowedCapital`, daily `allowedOrderNotional`. Sells bypass capital gating (return `Infinity` budget). |
| `runPositionLimitAgent` | `(positions, config, intent, portfolioValue) => AgentResult<PolicyCheckResult[]>` | `maxOpenPositions` (buys only) + per-symbol `maxPositionPercent` concentration. |
| `runDrawdownGuard` | `(state, config) => AgentResult<DrawdownGuardResult>` | Blocks when `currentDrawdownPercent >= maxDrawdownPercent`. |
| `runPolicyChecks` | `(intent, config, account, traceId) => PolicyDecision` | Aggregates `checkModePolicy` + `checkMoneyLimitPolicy`; resolves `approved` / `requires_approval` / `rejected`. |
| `assessTradeRisk` | `(input: TradeRiskInput) => TradeRiskAssessment` | Advisory risk profile: level, stop-loss/size suggestions, volatility/liquidity/concentration warnings. |

### Readiness / mode / lifecycle

| Export | Signature (summary) | What it does |
|---|---|---|
| `checkLiveReadiness` | `(config, context) => LiveReadinessResult` | Scores blocking checks (mode enabled, verified user, broker, market data, simulation history, read-only) with severities. |
| `evaluateExecutionModeGate` | `(mode, context) => ExecutionModeGateResult` | Live-mode gate: auth always; for `live-*` adds KYC, broker, asset support, risk profile, max position, **kill switch**, audit log, explicit confirmation; `live-autonomous` adds explicit opt-in. |
| `EXECUTION_MODE_REGISTRY` / `getExecutionModeDefinition` | `readonly ExecutionModeDefinition[]` / `(mode) => def` | Five modes: `simulation` (default-on), `paper`, `live-manual`, `live-ai-assisted`, `live-autonomous` (all live default-off). |
| `transitionOrder` | `(order, next, patch?) => Order` | Enforces the order state machine; **throws** on invalid transitions. |
| `reconcileExecution` | `(request, result) => AgentResult<ReconciliationResult>` | Asserts filled symbol/side/quantity/requested-price match the request; errors on anomalies. |

### Simulation / adapters / autonomous / AI

| Export | Signature (summary) | What it does |
|---|---|---|
| `simulateFill` | `(marketPrice, side, slippageBps?) => number` | Deterministic adverse-slippage fill price (buy higher, sell lower). Throws on non-positive price / negative bps. |
| `createSimulationBrokerAdapter` | `(deps) => BrokerExecutionAdapter` | `executionTarget: 'simulation'`; maps an execution request to a `SimulationExecutionInput` and submits via injected repo. |
| `runAgentDryRun` | `(input) => AgentDryRunResult` | Simulation-safe autonomous dry-run; rejects if `executionMode === 'live'` or any risk check fails. |
| `runAiSimulationAgent` | `(request, caller) => Promise<AgentResult<AiSimulationAgentDecision>>` | Calls an LLM, validates output via `aiSimulationAgentDecisionSchema`, then enforces safety rules (see §5). Defaults to `HOLD` on any failure. |

---

## 4. Core Contracts Consumed / Produced

Types come from `@repo/api-contracts` (workspace/order/AI-decision shapes) and from
`packages/agents/src/types/broker-types.ts` (Zod-backed broker/intent/config schemas).

```ts
// types/agent-types.ts — result + context
type AgentResult<T> =
  | { ok: true;  value: T }
  | { ok: false; error: string; code: string };

interface AgentContext { traceId: TraceId; accountId: string; userId: string; modeId: string; initiatedAt: string; }

// types/broker-types.ts (Zod) — trade intent
interface TradeIntentPayload {
  accountId: string; modeId: string;
  source: 'manual' | 'ai_suggested' | 'ai_autonomous';
  symbol: string; assetKind: 'stock' | 'etf' | 'crypto';
  side: 'buy' | 'sell';
  sizingMode: 'quantity' | 'notional' | 'risk_budget';
  quantity?: number; notional?: number;            // both .positive()
  thesis: string;                                  // 1..1000 chars
  confidence?: number;                             // [0,1]
  strategyTag?: string;
}

// BrokerModeConfig (Zod) — per-mode capital / risk / trading / approvals envelope
//   capital: { maxAbsolute, maxPercentOfCash, maxPerTrade, microTradingBudget? }
//   risk:    { maxPositionPercent, maxOpenPositions, maxDailyLossPercent,
//              maxDrawdownPercent, minSignalConfidence, maxVolatilityZScore? }
//   trading: { maxOrdersPerDay, cooldownMinutes, allowScalingIn/Out, allowOvernight, allowWeekendCrypto }
//   approvals: { requireFreshConsent, requireHealthyBrokerConnection, requireHealthyMarketData }

// types/execution-types.ts — intelligence input to a workflow
interface IntelligenceDecisionBundle {
  symbol: string; assetKind: AssetKind;
  marketContext: { regime; volatilityState; breadthState? };
  signal: { direction: 'long' | 'short' | 'neutral'; score: number; confidence: number };
  factors?; tradePlan?; generatedAt: string;
}

// types/audit-types.ts — produced
interface DecisionPacket { traceId; userId; accountId; modeId; symbol; assetKind;
  requestedAction; intentSource; policyDecision; executionTarget; orderState; generatedAt; }
```

The canonical `OrderState` enum lives in `broker-types.ts`
(`draft | proposed | awaiting_user_approval | rejected_by_policy | rejected_by_risk |
approved | submitted | partially_filled | filled | cancelled | expired | failed |
reconciled`). The lighter `orders/order-state-machine.ts` `OrderStatus` is a separate,
narrower lifecycle guard used by `transitionOrder`.

---

## 5. Safety Invariants & Risk-Gate Flow

### Gate flow (both workflows, via `runBrokerSupervisor`)

```
intent + config + bundle + context
  → loadWorkspace / loadMarketPrice / resolveAssetId       (injected; null ⇒ typed error, no state change)
  → runBrokerSupervisor:
        1. runCapitalGuard        (buy: cash > 0, capital envelope, daily order budget)
        2. runPolicyChecks        (mode policy + money-limit policy)
        3. runPositionLimitAgent  (max open positions + concentration)
     → DecisionPacket.orderState = 'approved' | 'awaiting_user_approval'
  → if 'awaiting_user_approval' ⇒ STOP (WORKFLOW_AWAITING_APPROVAL)   ← human-in-the-loop
  → resolveQuantity(...) ; reject if <= 0 (WORKFLOW_ZERO_QUANTITY)
  → adapter.submitOrder / deps.submitOrder
```

### Mode policy checks (`checkModePolicy`)

`mode.enabled`, `mode.assetKind` (allowed asset kinds), `mode.humanApproval`
(`requireHumanApproval` + `source === 'ai_autonomous'` ⇒ `requires_approval`),
`mode.perTradeLimit` (`capital.maxPerTrade`), `mode.confidence`
(`>= risk.minSignalConfidence`), `mode.dailyOrders` (`trading.maxOrdersPerDay`),
`mode.dailyLoss` (`risk.maxDailyLossPercent`), `mode.drawdown` (`risk.maxDrawdownPercent`).

### Money-limit checks (`checkMoneyLimitPolicy`)

`money.cashAvailable`, `money.capitalEnvelope`, `money.orderBudget`
(`<= allowedOrderNotional`), `money.positionCap`. Sells are treated as capital-returning
and skip buy-only gating.

### Live-readiness / mode gate (`evaluateExecutionModeGate`)

For any `live-*` mode the gate **requires all of**: auth, KYC, broker connected, broker
supports asset class, risk profile configured, max position configured, **emergency stop
(kill switch) enabled**, audit logging enabled, explicit live confirmation. `live-autonomous`
additionally requires explicit `autonomousOptIn` ("disabled by default until explicit opt-in").
This realizes `live-trading-lock.md` + `kill-switch-rule.md`.

### AI simulation agent safety (`runAiSimulationAgent` → `enforceSafetyRules`)

- Output must parse against `aiSimulationAgentDecisionSchema`, else ⇒ `HOLD`.
- `simulationOnly !== true` ⇒ `HOLD`.
- `confidence < 0.5` and action ≠ `HOLD` ⇒ `HOLD` (`MIN_CONFIDENCE_THRESHOLD`).
- `suggest_only` mode downgrades `SIMULATED_*_REQUEST` → `PROPOSE_*` + human confirmation.
- `human_confirmed` mode forces `requiresHumanConfirmation` on simulated orders.
- `notional > capSettings.maxNotionalPerTrade` ⇒ `HOLD`.

---

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| Missing workspace / price / asset | Typed `AgentResult` error (`WORKFLOW_NO_WORKSPACE` / `WORKFLOW_NO_PRICE` / `WORKFLOW_ASSET_NOT_FOUND`); no state mutated. |
| Non-positive / non-finite price | `sanitizePositiveNumber` rejects ⇒ `WORKFLOW_NO_PRICE`. |
| Capital exhausted / no cash (buy) | `CAPITAL_GUARD_NO_CASH` / `CAPITAL_GUARD_ENVELOPE_EXHAUSTED`. |
| Any policy check rejected | First rejection surfaced as `SUPERVISOR_POLICY_REJECTED` (with audit `supervisor.blocked`). |
| Position cap / concentration breach | `SUPERVISOR_POSITION_REJECTED`. |
| `requires_approval` verdict | `orderState='awaiting_user_approval'` ⇒ workflow returns `WORKFLOW_AWAITING_APPROVAL` — **does not** submit. |
| Computed quantity `<= 0` / non-finite | `WORKFLOW_ZERO_QUANTITY`. |
| Adapter/config target mismatch | `WORKFLOW_TARGET_MISMATCH` (unified workflow). |
| Adapter submission throws | Caught ⇒ `ADAPTER_SUBMIT_FAILED` (sim adapter) or propagated `orderResult` error code. |
| Invalid order transition | `transitionOrder` **throws** `Invalid transition X → Y`. |
| Fill price invalid input | `simulateFill` **throws** on non-positive price / negative bps. |
| Reconciliation mismatch | `EXECUTION_RECONCILIATION_FAILED` listing each anomaly. |
| AI output unparseable / unsafe | Defaults to a safe `HOLD` decision (never errors the caller). |

**Fail-closed principle:** guards reject by returning an `AgentResult` error before any
order is built or submitted — no partial state. (`execution-safety.md`,
`risk-gates-required.md`.)

---

## 7. How to Extend

**Add a pre-trade risk guard**
1. Create `packages/agents/src/risk/<name>-agent.ts` returning `AgentResult<...>`.
2. Wire it into `runBrokerSupervisor` (`broker/broker-supervisor-agent.ts`) in the gate
   sequence, with `audit.add(...)` on pass and `supervisor.blocked` on fail.
3. Add config knobs to `brokerModeRiskSchema` in `types/broker-types.ts` if needed
   (contract-first), and re-export the guard from `index.ts`.
4. Add a `__tests__/<name>.test.ts` covering pass, boundary, and reject (fail-closed).

**Add an execution mode**
1. Extend `ExecutionMode` + `EXECUTION_MODE_REGISTRY` (`execution/execution-mode-*.ts`),
   keeping any live mode `enabledByDefault: false`.
2. Add required gate checks in `evaluateExecutionModeGate` — never weaken the kill-switch
   / audit / confirmation checks (`live-trading-lock.md`).

**Add a workflow / adapter**
1. New workflow in `workflows/`; reuse `runBrokerSupervisor` for the gate stack and keep
   DB access **injected** (no `@repo/db` import).
2. New broker via the `BrokerExecutionAdapter` interface; assert
   `executionTarget` matches config; default new brokers to sandbox/simulation
   (`broker-sandbox-rule.md`).
3. Re-export from `index.ts`; cover with a `__tests__` spec that uses the **real** gate
   (mock only the injected boundary deps, per `unified-trade-workflow.test.ts`).

---

## 8. Testing Notes

| Test file | Covers |
|---|---|
| `__tests__/unified-trade-workflow.test.ts` | Buy through the **real** risk gate, sell without buy-capital gating, real capital-guard block on zero cash, disabled-mode rejection, target mismatch, `ai_autonomous` awaiting-approval block, zero-quantity, missing boundary data, adapter-failure propagation. |
| `__tests__/capital-guard.test.ts` / `drawdown-guard.test.ts` / `position-limit.test.ts` | Per-guard pass/boundary/reject. |
| `__tests__/money-limit-policy.test.ts` | Cash/envelope/budget/position-cap checks, sell exemptions. |
| `__tests__/live-readiness-gate.test.ts` | Readiness scoring + blocking checks per mode. |
| `__tests__/broker-supervisor-agent.test.ts` | Gate sequencing + audit packet. |
| `__tests__/fill-engine.test.ts` | Deterministic slippage + input guards. |
| `__tests__/simulation-broker-adapter.test.ts` | Request→input mapping, error wrapping. |
| `__tests__/reconciliation-agent.test.ts` | Mismatch anomaly detection. |
| `__tests__/ai-simulation-agent.test.ts` | Schema validation + safety-rule downgrades / HOLD defaults. |
| `__tests__/news-impact-engine.test.ts` | News intelligence helper. |
| `__tests__/execution-fixtures.ts` | Shared deterministic fixtures for the above. |

Run:

```bash
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/agents test
```

---

## 9. Related Docs

- [EXECUTION.md](../EXECUTION.md) — system-level execution flow
- [RISK.md](../RISK.md) — risk hierarchy + currently implemented guards
- [SIMULATION_ENGINE.md](../SIMULATION_ENGINE.md) — simulation ledger the sim workflow writes into
- [AGENTS.md](../AGENTS.md) — agent system overview
- [signals.md](./signals.md) / [forecasting.md](./forecasting.md) — upstream intelligence
- `.claude/rules/`: `risk-gates-required.md`, `aurox-execution-risk.md`, `execution-safety.md`, `simulation-first-rule.md`, `live-trading-lock.md`, `kill-switch-rule.md`, `broker-sandbox-rule.md`, `order-lifecycle-rule.md`, `position-sizing-rule.md`
