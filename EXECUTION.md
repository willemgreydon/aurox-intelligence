# EXECUTION.md — AUROX INTELLIGENCE

**Version:** 2.0 (Institutional Execution Engine)
**Role:** Deterministic Trade Execution, Order Lifecycle & Broker Integration

---

# 1. PURPOSE

The Execution System is responsible for:

* Converting decisions into orders
* Ensuring safe and compliant execution
* Managing order lifecycle
* Updating portfolio state deterministically

---

# 2. CORE PRINCIPLES

## 2.1 Deterministic Execution

* Same inputs → same outputs
* No randomness in execution math
* All calculations reproducible

---

## 2.2 Safety First

* Every trade must pass risk validation
* Execution must fail safely
* No silent failures

---

## 2.3 Idempotency

* No duplicate execution
* Safe retries allowed
* Every order has a unique identity

---

## 2.4 Simulation Parity

* Simulation logic MUST match live logic
* No divergence between environments

---

# 3. EXECUTION FLOW

```text id="qknu4l"
Trade Decision
    ↓
Pre-Execution Validation
    ↓
Order Construction
    ↓
Execution Routing
    ↓
Order Execution
    ↓
Post-Execution Processing
    ↓
Portfolio Update
```

---

# 4. EXECUTION TARGETS

## 4.1 Simulation (DEFAULT)

* Fully deterministic
* Local accounting engine
* No external dependencies

---

## 4.2 Live (GATED)

* Broker-based execution
* Requires readiness checks
* Disabled by default

---

# 5. ORDER MODEL

## 5.1 Order Contract

```ts id="n5r9qf"
type Order = {
  id: string
  asset: string
  side: "buy" | "sell"
  type: "market" | "limit" | "stop" | "stop_limit"
  quantity: number
  price?: number
  stopPrice?: number
  status: "pending" | "submitted" | "executed" | "failed" | "cancelled"
  timestamp: number
}
```

---

## 5.2 Execution Result

```ts id="t6h5l3"
type ExecutionResult = {
  orderId: string
  executedPrice: number
  executedQuantity: number
  fees: number
  slippage: number
  status: "filled" | "partial" | "rejected"
}
```

---

# 6. PRE-EXECUTION VALIDATION

Execution MUST NOT proceed unless all checks pass.

## 6.1 Validation Layers

* Risk validation
* Liquidity validation
* Slippage estimation
* Position sizing validation
* Instrument constraint validation

---

## 6.2 Instrument Constraints

Agents must validate:

* Minimum order size
* Tick size
* Step size
* Notional limits

---

## 6.3 Slippage Estimation

```text id="6vphbn"
Expected Slippage = f(order size, market depth, volatility)
```

Reject trade if above threshold.

---

# 7. EXECUTION STRATEGIES

## 7.1 Immediate Execution

* Default
* Market orders

---

## 7.2 TWAP (Time-Weighted Average Price)

* Splits orders over time

---

## 7.3 VWAP (Volume-Weighted Average Price)

* Executes relative to volume profile

---

## 7.4 Strategy Selection

Based on:

* Order size
* Liquidity
* Market conditions

---

# 8. BROKER ADAPTER ARCHITECTURE

## 8.1 Interface

```ts id="3cvfd2"
interface BrokerAdapter {
  executeOrder(order: Order): Promise<ExecutionResult>
  cancelOrder(orderId: string): Promise<void>
  getOrderStatus(orderId: string): Promise<string>
}
```

---

## 8.2 Responsibilities

* Translate internal orders → broker format
* Handle API communication
* Normalize responses

---

## 8.3 Supported Brokers (Future)

* Binance
* Coinbase
* Alpaca
* Interactive Brokers

---

# 9. ORDER LIFECYCLE

```text id="0p4qvk"
Created → Validated → Submitted → Executed → Settled
```

---

## 9.1 States

* pending
* submitted
* partial
* executed
* failed
* cancelled

---

## 9.2 Rules

* State transitions must be explicit
* No implicit status changes
* All transitions logged

---

# 10. SIMULATION ENGINE (EXECUTION CONTEXT)

## 10.1 Responsibilities

* Execute orders locally
* Update balances
* Track positions
* Calculate PnL

---

## 10.2 Accounting Rules

* Double-entry consistency
* Fees applied explicitly
* Positions updated atomically

---

## 10.3 Example Flow

```text id="z1yq7o"
BUY → Reduce cash → Increase asset position → Log transaction
```

---

# 11. POST-EXECUTION PROCESSING

After execution:

* Update portfolio state
* Recalculate exposure
* Update risk metrics
* Trigger reporting updates

---

# 12. EXECUTION SAFETY RULES

## 12.1 No Duplicate Orders

* Must enforce idempotency
* Retry must not duplicate execution

---

## 12.2 No Silent Failures

* Every failure must return reason
* No ignored errors

---

## 12.3 No Partial State Updates

* Execution must be atomic
* Either complete or rollback

---

# 13. LATENCY & TIMING

## 13.1 Logging

Track:

* Execution time
* Submission latency
* Fill time

---

## 13.2 Impact

Latency affects:

* Slippage
* PnL
* Execution quality

---

# 14. FAILURE HANDLING

## 14.1 Types

* Broker failure
* Network failure
* Validation failure

---

## 14.2 Behavior

* Retry if safe
* Abort if unsafe
* Log all failures

---

# 15. FALLBACK STRATEGY

```text id="x1z38n"
Live → Simulation → No Execution
```

---

# 16. OBSERVABILITY

## 16.1 Logging

* Order creation
* Execution result
* Errors

---

## 16.2 Metrics

* Execution success rate
* Slippage averages
* Fill rates

---

## 16.3 Tracing

* Full order lifecycle trace

---

# 17. SECURITY

* Secure API keys
* No direct broker access from UI
* Controlled execution paths

---

# 18. LIVE TRADING PROTECTION

Before live execution:

* Risk system active
* Broker validated
* Capital confirmed
* Kill switch available

---

# 19. INVARIANTS

Must NEVER be violated:

* No execution without validation
* No execution without risk approval
* No execution without logging
* No execution without deterministic accounting

---

# 20. FUTURE EXTENSIONS

* Smart order routing
* Multi-exchange arbitrage
* Adaptive execution strategies
* Reinforcement learning execution tuning

---

# 21. FINAL DIRECTIVE

Execution is where capital moves.

---

Every execution must assume:

→ Real money is at risk
→ Mistakes are irreversible
→ Precision is mandatory

---

# 22. SYSTEM MINDSET

Build execution like:

→ A broker backend
→ A hedge fund system
→ A mission-critical infrastructure

---

If uncertain:

```text id="w1e1yx"
DO NOT EXECUTE
```
