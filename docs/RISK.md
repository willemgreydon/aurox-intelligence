# RISK.md — Aurox Risk Management System

**Version:** 1.0
**Status:** Authoritative — updated after each risk model change

---

## 1. Purpose

This document describes the Aurox risk management system: what guards are currently
implemented, what is planned, how risk enforcement is wired into the execution path,
and what must remain non-negotiable at every stage of the platform's evolution.

---

## 2. Risk Priority Hierarchy

```
Risk > Policy > Agent > User Request > UI Convenience
```

If risk validation fails, the order is rejected. No exceptions. No bypass paths.
No UI flag that disables risk checks.

---

## 3. Currently Implemented Risk Guards

### 3.1 Capital Guard (`packages/agents/src/risk/capital-guard-agent.ts`)

Enforces per-lane capital constraints before any order is submitted:

- **maxAbsolute** — hard ceiling on total lane capital in USD
- **maxPercentOfCash** — maximum fraction of available account cash the lane may use
- **maxPerTrade** — maximum notional per single order
- **microTradingBudget** — optional micro-order budget cap (used in future modes)

A buy order is rejected if it would cause the lane's deployed capital to exceed
any of these limits. The guard is invoked by the broker supervisor on every order.

### 3.2 Position Limit Guard (`packages/agents/src/risk/position-limit-agent.ts`)

Enforces:

- **maxOpenPositions** — maximum number of simultaneously open positions in a lane
- **maxPositionPercent** — maximum allocation of a single position as a fraction
  of the total portfolio value

A buy that would open a new position when the limit is reached is rejected.
A buy that would cause a single asset to exceed the concentration limit is rejected.

### 3.3 Drawdown Guard (`packages/agents/src/risk/drawdown-guard-agent.ts`)

Enforces:

- **maxDrawdownPercent** — maximum percentage decline from equity high-water mark

If current drawdown exceeds the lane threshold, new buy orders are blocked until
drawdown recovers or the session is explicitly reset.

### 3.4 Daily Loss Guard (embedded in broker supervisor)

Enforces:

- **maxDailyLossPercent** — maximum realized + unrealized loss within a calendar day

Orders are blocked for the remainder of the day if this threshold is breached.

### 3.5 Signal Confidence Gate (embedded in broker supervisor)

For assisted and autonomous modes:

- **minSignalConfidence** — orders with confidence below this threshold are rejected

Manual orders may bypass this for simulation at `minSignalConfidence: 0.0`.
Guided and autonomous modes enforce stricter thresholds (0.55–0.75+).

### 3.6 Volatility Filter (optional, mode-specific)

- **maxVolatilityZScore** — blocks orders when the asset's volatility Z-score
  exceeds the configured limit

Currently only applied in guided_auto_simulation and above tiers.

### 3.7 Live Readiness Gate (`packages/agents/src/readiness/live-readiness-gate.ts`)

Before any live-target mode can execute:

- Verified user status required
- Broker connection required
- Market data health required
- Simulation history required
- Non-read-only mode required

All checks must pass. A single blocking check prevents live activation.

---

## 4. Execution Pre-Flight Checks

Before every order (simulation or live), the system checks:

| Check                     | Source                  | Rejects on                              |
|---------------------------|-------------------------|-----------------------------------------|
| Cash availability         | portfolio.availableCash | Buy notional exceeds available cash     |
| Position availability     | portfolio positions      | Sell quantity exceeds held quantity     |
| Asset kind allowed        | lane config             | Asset kind not in allowedAssetKinds     |
| Signal confidence         | intent payload          | confidence < minSignalConfidence        |
| Capital budget            | capital guard           | Notional exceeds lane caps              |
| Position count            | position limit guard    | Open positions at maximum               |
| Position concentration    | position limit guard    | Single asset exceeds maxPositionPercent |
| Daily loss                | risk engine             | Daily loss at threshold                 |
| Drawdown                  | drawdown guard          | Drawdown exceeds maxDrawdownPercent     |
| Volatility Z-score        | risk engine (optional)  | Z-score exceeds maxVolatilityZScore     |
| Live readiness            | readiness gate          | Live mode, any check fails              |
| Autonomous live block     | trade-execution-service | ai_autonomous + live always rejected    |

---

## 5. Risk Types Modelled

### Market Risk

- Unrealized PnL tracking per position
- Portfolio equity mark-to-market with each price update
- Drawdown measured from equity high-water mark

### Concentration Risk

- Per-position allocation cap (`maxPositionPercent`)
- Asset class diversification tracked in `positionsByAssetClass`

### Liquidity Risk

- Market price staleness tracked via `freshnessState`
- Orders requiring market price fall back to `WORKFLOW_NO_PRICE` error if no valid price exists
- Stale data lowers observed confidence, which may fail the confidence gate

### Operational Risk

- Session health model: `running`, `paused`, `degraded`, `error`, `failed`
- Trading is blocked when session is in `degraded` or `error` state
- Kill-switch equivalent: `isReadOnly` flag derived from session state

---

## 6. Core Risk Metrics (Tracked / Displayed)

| Metric             | Where computed         | Where displayed                   |
|--------------------|------------------------|-----------------------------------|
| Drawdown %         | drawdown guard         | Portfolio risk profile card       |
| Unrealized PnL     | position accounting    | Simulation workstation, portfolio |
| Realized PnL       | position accounting    | Transaction journal, portfolio    |
| Portfolio return % | simulation page        | Simulation workstation            |
| Risk level         | risk profile builder   | Portfolio risk profile card       |
| Concentration      | portfolio mapper       | Portfolio allocation charts       |
| Top concentration  | portfolio mapper       | Risk profile explanation          |

Risk level is derived as: `low | medium | high | critical | unavailable`
based on a combination of drawdown and top concentration thresholds.

---

## 7. What Is NOT Yet Implemented

These are on the roadmap but not yet in the codebase:

- **VaR (Value at Risk)** — factor-based historical VaR calculation
- **Expected Shortfall** — tail-risk estimate beyond VaR
- **Stop-loss automation** — automatic sell on position loss threshold
- **Sector limits** — maximum allocation per sector
- **Correlation limits** — maximum portfolio beta/correlation to a single factor
- **Macro regime guard** — risk reduction in crisis regimes
- **Live reconciliation loop** — post-submit position state verification
- **Regulatory compliance layer** — required before any live trading in regulated markets

---

## 8. Risk Guards for Live Trading (Future)

Before any live mode is activated, additional guards must be implemented:

1. **Stop-loss policy** — mandatory exit rule for every live position
2. **Kill-switch** — immediate halt of all live orders and pending executions
3. **Order rate limiter** — hard cap on orders per minute/hour per lane
4. **Broker-level position check** — reconcile broker-reported positions vs local state
5. **Anomaly detection** — flag unusual execution patterns before they compound
6. **Withdrawal/capital safety lock** — freeze live execution if account balance drops below floor

---

## 9. Per-Lane Risk Envelope

Each broker mode config (`BrokerModeConfig`) carries a complete risk envelope:

```typescript
risk: {
  maxPositionPercent: number;    // 0–1, max single-position allocation
  maxOpenPositions: number;       // integer, max concurrent positions
  maxDailyLossPercent: number;   // 0–1, daily loss ceiling
  maxDrawdownPercent: number;    // 0–1, drawdown ceiling from high-water
  minSignalConfidence: number;   // 0–1, minimum signal quality
  maxVolatilityZScore?: number;  // optional, asset volatility filter
}
```

These values differ by tier — autonomous modes use tighter constraints than manual modes.

---

## 10. Non-Negotiable Rules

❌ Risk checks cannot be disabled from UI
❌ Risk checks cannot be bypassed via feature flags
❌ Live execution cannot proceed with a failing readiness check
❌ Autonomous live execution is permanently blocked until explicitly re-enabled with full
   safety review
❌ No order may mutate portfolio state if any risk check rejects
❌ No risk guard may be removed without architecture review and test coverage update
