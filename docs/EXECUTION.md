# EXECUTION.md — Aurox Execution Layer

**Version:** 1.0
**Status:** Authoritative — updated after each execution architecture change

---

## 1. Purpose

This document describes the Aurox execution model: how trade decisions move from intent to
persisted simulation order, the staged progression toward live trading, per-lane capital
controls, and the constraints that must remain enforced at every layer.

---

## 2. Current Execution State

| Target       | Status               | Notes                                        |
|--------------|----------------------|----------------------------------------------|
| Simulation   | Active (default)     | All users, all current lanes                 |
| Live manual  | Disabled             | Requires readiness gates + operator approval |
| Live AI-suggested | Disabled        | Requires confirmed simulation history first  |
| Live autonomous   | Explicitly blocked | Code-level guard in trade-execution-service  |

**Default:** Every execution path resolves to `simulation` unless a live mode is explicitly
activated through the readiness gate and broker mode registry.

---

## 3. Staged Execution Progression

The system must advance through these stages in order. No stage may be skipped.

### Stage 1 — Fictive Cash Simulation (CURRENT)

- All trading uses fictive cash allocated at session start (default USD 100,000).
- No real capital is involved at any point.
- Orders are deterministically filled by the simulation fill engine.
- Full accounting: positions, cash, fees, slippage, PnL — all persisted.
- **Asset scope:** Stock simulation active. ETF and crypto readiness prepared but
  not confirmed active end-to-end.

### Stage 2 — Human-Confirmed Paper Trading (PLANNED)

- AI may suggest trades but the user must confirm every order before execution.
- Still paper trading — no real money.
- Requires: AI suggestion pipeline, order-by-order confirmation UI, session policy controls.
- **Gate:** Stable Stage 1 history with validated simulation performance.

### Stage 3 — Broker Sandbox / Paper Broker (PLANNED)

- Orders are routed to a broker sandbox environment (e.g. Binance testnet, Coinbase sandbox).
- Validates full execution wiring without real money.
- Requires: confirmed broker adapter wiring, dry-run validation, symbol allowlist, healthy
  market data feed.
- **Gate:** Stage 2 complete; broker adapter tested in dry-run; user verified.

### Stage 4 — Real Micro-Trading with Explicit Tiny Capital Cap (FUTURE / GATED)

- Real-money trading at a very small explicit per-lane capital cap.
- Example caps: €0.05, €5, €100 — set explicitly by the user per lane.
- **Requires all of:**
  - Verified user identity
  - Completed simulation and sandbox history
  - Healthy broker connection
  - Configured per-lane capital cap (explicit, not percentage only)
  - Active kill-switch
  - Operator approval
  - No autonomous execution
- **Gate:** Stage 3 complete; all readiness checks pass.

### Stage 5 — Larger Capital After Observed Performance (FUTURE / GATED)

- Capital limits may be raised only after sustained risk and performance validation.
- No automatic escalation — every increase requires explicit user re-approval.
- Risk caps, drawdown limits, and kill-switch remain required at every capital level.
- **Gate:** Stage 4 live history with acceptable drawdown, win rate, and compliance review.

---

## 4. Execution Flow

```
UI / Server Action
  → Zod validation
  → assertSimulationSessionAllowsTradingForCurrentUser
  → executeTradeForUser (trade-execution-service.ts)
      → readinessGate (blocks live unless conditions met)
      → autonomous live guard (blocks ai_autonomous + live)
      → buildManualTradeBundle (intelligence context)
      → adapter selection (simulation | live)
      → runUnifiedTradeWorkflow
          → runBrokerSupervisor (policy + risk + capital checks)
          → resolveQuantity
          → adapter.submitOrder
              [simulation] → executeSimulationOrder (@repo/db)
              [live]       → live broker adapter (future, gated)
```

---

## 5. Execution Adapters

### SimulationBrokerAdapter

- Location: `packages/agents/src/adapters/simulation-broker-adapter.ts`
- Routes to: `executeSimulationOrder` in `@repo/db`
- Target: `simulation`
- Status: Active, default

### LiveBrokerExecutionAdapter

- Location: `apps/web/server/lib/brokers/live-execution-adapter.ts`
- Routes to: Binance or Coinbase via environment-configured provider
- Target: `live`
- Status: Not active. Requires broker credentials + readiness gate passage.
- **Autonomous live execution is explicitly blocked at the service layer.**

---

## 6. Broker Mode Registry

Located at: `apps/web/server/config/broker-mode-registry.ts`

| Tier | Mode ID                 | Target     | Enabled | Notes                         |
|------|-------------------------|------------|---------|-------------------------------|
| 1    | manual_only             | simulation | true    | Default, no restrictions      |
| 2    | assisted_confirmation   | simulation | true    | AI-suggested, human approval  |
| 3    | guided_auto_simulation  | simulation | true    | Stock-only, signal confidence |
| 4    | guardrailed_auto_live   | live       | false   | Disabled — future only        |
| 5    | micro_trading           | simulation | false   | Disabled — future only        |

Tiers 4 and 5 are `enabled: false` and cannot be reached via the readiness gate in the
current implementation.

---

## 7. Per-Lane Capital Model

Each lane has an explicit capital envelope:

- `maxAbsolute` — hard cap on total lane capital (USD)
- `maxPercentOfCash` — max fraction of account cash the lane may use
- `maxPerTrade` — single-order cap
- `microTradingBudget` — optional micro-order budget (future use)

Capital is checked by the broker supervisor before every order. The system rejects
orders that exceed the lane envelope.

Future real-money lanes will require explicit user-set caps per lane, not just
percentage configuration. The absolute cap always wins.

---

## 8. Execution Constraints (Always Enforced)

- Cash availability checked before every buy.
- Position availability (holdings) checked before every sell.
- Asset kind must match lane's `allowedAssetKinds`.
- Signal confidence must meet `minSignalConfidence`.
- Daily loss limit checked against `maxDailyLossPercent`.
- Max drawdown checked against `maxDrawdownPercent`.
- Open position count checked against `maxOpenPositions`.
- Per-trade notional bounded to `maxPerTrade`.
- Cooldown period enforced between orders where configured.

---

## 9. What Does NOT Exist Yet

- Full broker reconciliation loop (post-submit state sync)
- Regulatory-grade live execution controls
- Dedicated execution records table (currently embedded in order notes)
- Full order lifecycle audit trail for live trades
- Lane-level capital attribution in the DB schema

These must be implemented before Stage 3 or Stage 4 can be safely activated.

---

## 10. Security Rules

- Provider API keys stay server-side only
- Broker credentials never exposed to UI
- No direct broker calls from route handlers or UI components
- All execution paths require authenticated session

---

## 11. Failure Handling

Execution must fail closed:

```
If any check fails → reject order, preserve state, log reason, return safe AgentResult error
```

No silent failures. No partial state mutations. No optimistic execution without confirmed fill.
