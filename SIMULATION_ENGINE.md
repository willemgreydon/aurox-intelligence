# SIMULATION_ENGINE.md — AUROX INTELLIGENCE

**Version:** 1.0
**Role:** Deterministic Simulation Ledger, Accounting, PnL & Portfolio State Engine

---

## 1. Purpose

The Simulation Engine is the default execution environment for Aurox Intelligence.

It is responsible for:

* Simulated order execution
* Deterministic portfolio accounting
* Position tracking
* Cash balance updates
* Fee calculation
* Realized and unrealized PnL
* Auditable transaction history
* Strategy validation before live trading

Simulation is not a UI demo.

It is a production-grade financial accounting system used to validate execution logic before real capital is involved.

---

## 2. Core Principles

### 2.1 Determinism

Same input must always produce the same result.

No randomness is allowed in:

* Order execution
* Fee calculation
* Position updates
* PnL calculation
* Cash movement

---

### 2.2 Ledger Integrity

Every state mutation must produce an auditable ledger entry.

No portfolio state may change without:

* Order record
* Transaction record
* Balance update
* Position update
* Timestamp
* Reason

---

### 2.3 Simulation-Live Parity

Simulation must mirror live execution rules as closely as possible.

The simulation engine must use the same concepts as live trading:

* Orders
* Fills
* Fees
* Slippage
* Positions
* Portfolio snapshots
* Risk validation
* Instrument constraints

---

### 2.4 Atomic Updates

A simulated execution must either fully succeed or fully fail.

Partial state corruption is forbidden.

---

## 3. Simulation Tables

Canonical persisted tables:

```text
app.simulation_accounts
app.simulation_portfolios
app.simulation_positions
app.simulation_orders
app.simulation_transactions
app.simulation_snapshots
```

Recommended future tables:

```text
app.simulation_fills
app.simulation_fees
app.simulation_risk_events
app.simulation_ledger_entries
app.simulation_strategy_runs
```

---

## 4. Core Domain Model

### 4.1 Simulation Account

```ts
export type SimulationAccount = {
  id: string
  userId: string
  baseCurrency: "USD" | "EUR"
  cashBalance: number
  reservedCash: number
  equityValue: number
  totalPortfolioValue: number
  realizedPnl: number
  unrealizedPnl: number
  status: "active" | "paused" | "closed"
  createdAt: string
  updatedAt: string
}
```

---

### 4.2 Simulation Portfolio

```ts
export type SimulationPortfolio = {
  id: string
  accountId: string
  name: string
  strategyMode: "manual" | "assisted" | "autonomous"
  riskProfile: "conservative" | "balanced" | "aggressive"
  baseCurrency: "USD" | "EUR"
  createdAt: string
  updatedAt: string
}
```

---

### 4.3 Simulation Position

```ts
export type SimulationPosition = {
  id: string
  accountId: string
  portfolioId: string
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  quantity: number
  averageEntryPrice: number
  marketPrice: number
  marketValue: number
  costBasis: number
  realizedPnl: number
  unrealizedPnl: number
  feesPaid: number
  openedAt: string
  updatedAt: string
}
```

---

### 4.4 Simulation Order

```ts
export type SimulationOrder = {
  id: string
  accountId: string
  portfolioId: string
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  side: "buy" | "sell"
  type: "market" | "limit" | "stop" | "stop_limit"
  requestedQuantity: number
  requestedNotional?: number
  limitPrice?: number
  stopPrice?: number
  status:
    | "created"
    | "validated"
    | "rejected"
    | "filled"
    | "partially_filled"
    | "cancelled"
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

---

### 4.5 Simulation Transaction

```ts
export type SimulationTransaction = {
  id: string
  accountId: string
  portfolioId: string
  orderId: string
  symbol: string
  side: "buy" | "sell"
  quantity: number
  executionPrice: number
  grossNotional: number
  feeAmount: number
  netCashImpact: number
  realizedPnlImpact: number
  createdAt: string
}
```

---

### 4.6 Simulation Snapshot

```ts
export type SimulationSnapshot = {
  id: string
  accountId: string
  portfolioId: string
  cashBalance: number
  equityValue: number
  totalPortfolioValue: number
  realizedPnl: number
  unrealizedPnl: number
  drawdown: number
  exposure: number
  createdAt: string
}
```

---

## 5. Order Validation

Before a simulation order can execute, validate:

* Account exists
* Portfolio exists
* Asset is supported
* Market price exists
* Quantity is positive
* Order side is valid
* Cash is sufficient for buys
* Position is sufficient for sells
* Instrument constraints pass
* Risk limits pass
* Lane permissions pass

---

## 6. Instrument Constraints

Each instrument should define:

```ts
export type InstrumentConstraints = {
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  minQuantity: number
  minNotional: number
  quantityStep: number
  priceTickSize: number
  supportsFractional: boolean
}
```

Validation rules:

```text
quantity >= minQuantity
notional >= minNotional
quantity % quantityStep == 0
price % priceTickSize == 0
```

For fractional assets, step size may be smaller.

---

## 7. Fee Model

### 7.1 Fee Contract

```ts
export type FeeModel = {
  type: "flat" | "percent" | "tiered"
  flatFee?: number
  percentageFee?: number
  minimumFee?: number
  maximumFee?: number
}
```

---

### 7.2 Fee Calculation

```text
grossNotional = quantity * executionPrice
percentageFeeAmount = grossNotional * percentageFee
feeAmount = max(minimumFee, flatFee + percentageFeeAmount)
feeAmount = min(feeAmount, maximumFee) if maximumFee exists
```

---

### 7.3 Default Simulation Fee

Recommended default:

```text
fee = max(0.01, grossNotional * 0.001)
```

Meaning:

* Minimum fee: 0.01
* Percentage fee: 0.10%

---

## 8. Slippage Model

Simulation may include deterministic slippage.

### 8.1 Slippage Contract

```ts
export type SlippageModel = {
  baseBps: number
  volatilityMultiplier: number
  liquidityMultiplier: number
  maxBps: number
}
```

---

### 8.2 Buy Slippage

```text
executionPrice = marketPrice * (1 + slippageBps / 10000)
```

---

### 8.3 Sell Slippage

```text
executionPrice = marketPrice * (1 - slippageBps / 10000)
```

---

### 8.4 Deterministic Slippage Rule

Slippage must derive from known inputs only:

* Market price
* Order size
* Volatility
* Liquidity score
* Spread

No randomness.

---

## 9. Buy Order Accounting

Given:

```text
quantity = Q
executionPrice = P
grossNotional = Q * P
fee = F
cashImpact = grossNotional + F
```

Buy is valid if:

```text
cashBalance >= cashImpact
```

After execution:

```text
cashBalance = cashBalance - cashImpact
position.quantity = previousQuantity + Q
position.costBasis = previousCostBasis + grossNotional + F
position.averageEntryPrice = position.costBasis / position.quantity
feesPaid = previousFeesPaid + F
```

Transaction record:

```text
side = buy
grossNotional = Q * P
feeAmount = F
netCashImpact = -cashImpact
realizedPnlImpact = 0
```

---

## 10. Sell Order Accounting

Given:

```text
quantity = Q
executionPrice = P
grossNotional = Q * P
fee = F
```

Sell is valid if:

```text
position.quantity >= Q
```

Cost basis removed:

```text
costBasisRemoved = position.averageEntryPrice * Q
```

Realized PnL:

```text
realizedPnl = grossNotional - fee - costBasisRemoved
```

After execution:

```text
cashBalance = cashBalance + grossNotional - fee
position.quantity = previousQuantity - Q
position.costBasis = previousCostBasis - costBasisRemoved
position.realizedPnl = previousRealizedPnl + realizedPnl
account.realizedPnl = previousAccountRealizedPnl + realizedPnl
```

If position quantity becomes zero:

```text
averageEntryPrice = 0
costBasis = 0
unrealizedPnl = 0
```

Transaction record:

```text
side = sell
grossNotional = Q * P
feeAmount = F
netCashImpact = grossNotional - F
realizedPnlImpact = realizedPnl
```

---

## 11. Unrealized PnL

For open positions:

```text
marketValue = quantity * marketPrice
unrealizedPnl = marketValue - costBasis
```

Portfolio unrealized PnL:

```text
portfolioUnrealizedPnl = sum(position.unrealizedPnl)
```

---

## 12. Portfolio Value

```text
equityValue = sum(position.quantity * currentMarketPrice)
totalPortfolioValue = cashBalance + equityValue
```

---

## 13. Exposure

```text
grossExposure = sum(abs(position.marketValue))
netExposure = sum(position.marketValue)
exposureRatio = grossExposure / totalPortfolioValue
```

---

## 14. Drawdown

```text
peakValue = max(previousPeakValue, currentTotalPortfolioValue)
drawdown = (peakValue - currentTotalPortfolioValue) / peakValue
```

---

## 15. Order Lifecycle

```text
created
  ↓
validated
  ↓
filled | rejected | cancelled
```

No order may skip validation.

No filled order may be edited.

Corrections require reversal transactions.

---

## 16. Ledger Rules

Every execution creates ledger entries.

Suggested ledger event types:

```text
ORDER_CREATED
ORDER_VALIDATED
ORDER_REJECTED
ORDER_FILLED
CASH_DEBITED
CASH_CREDITED
POSITION_INCREASED
POSITION_REDUCED
FEE_CHARGED
PNL_REALIZED
SNAPSHOT_CREATED
```

---

## 17. Transaction Atomicity

Execution must run in a DB transaction:

```text
BEGIN
  validate account
  validate portfolio
  validate order
  calculate execution
  insert order
  insert transaction
  update cash
  update position
  update account totals
  insert snapshot
COMMIT
```

On failure:

```text
ROLLBACK
```

---

## 18. Idempotency

Every execution request must carry an idempotency key.

```ts
export type ExecutionRequest = {
  idempotencyKey: string
  accountId: string
  portfolioId: string
  order: SimulationOrder
}
```

If the same idempotency key appears twice:

* Return existing result
* Do not execute twice

---

## 19. Reconciliation

After execution, recompute:

* Cash balance
* Position quantities
* Cost basis
* Market value
* Realized PnL
* Unrealized PnL
* Portfolio value

If stored values differ from recomputed values:

```text
mark account as reconciliation_required
block new trades until resolved
```

---

## 20. Simulation Risk Events

Risk-related simulation events:

```ts
export type SimulationRiskEvent = {
  id: string
  accountId: string
  portfolioId: string
  orderId?: string
  severity: "info" | "warning" | "critical"
  type:
    | "INSUFFICIENT_CASH"
    | "INSUFFICIENT_POSITION"
    | "MAX_EXPOSURE_REACHED"
    | "DRAWDOWN_LIMIT_REACHED"
    | "INVALID_INSTRUMENT_CONSTRAINT"
    | "SLIPPAGE_LIMIT_EXCEEDED"
  message: string
  createdAt: string
}
```

---

## 21. Safe Failure Rules

If simulation cannot calculate safely:

```text
reject order
do not mutate portfolio
log reason
return deterministic failure result
```

---

## 22. Testing Requirements

Minimum tests:

* Buy order reduces cash
* Buy order increases position
* Sell order increases cash
* Sell order reduces position
* Sell order realizes PnL correctly
* Fees are applied correctly
* Insufficient cash rejects order
* Insufficient position rejects sell
* Repeated idempotency key does not double-execute
* Snapshot reflects account state
* Zero quantity rejected
* Negative quantity rejected

---

## 23. Final Directive

Simulation is the rehearsal stage for real capital.

If accounting is uncertain:

```text
DO NOT EXECUTE
```
