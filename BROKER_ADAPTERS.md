# BROKER_ADAPTERS.md — AUROX INTELLIGENCE

**Version:** 1.0
**Role:** Broker Integration Layer, Exchange Connectivity & Live Execution Boundary

---

## 1. Purpose

Broker Adapters connect Aurox Intelligence to external execution venues.

They are responsible for:

* Translating internal orders into broker-specific formats
* Validating broker constraints
* Submitting orders
* Cancelling orders
* Reading order status
* Normalizing fills
* Protecting the system from broker-specific inconsistencies

Broker adapters are a high-risk boundary.

No UI, agent, or route may call a broker directly.

---

## 2. Core Principle

```text
Aurox Order Model → Broker Adapter → Broker API → Normalized Execution Result
```

The rest of the system must never depend on broker-specific response shapes.

---

## 3. Supported Broker Categories

Future supported categories:

```text
Equities / ETFs:
- Alpaca
- Interactive Brokers

Crypto:
- Coinbase
- Binance
- Kraken

Bank / Wealth:
- Open banking read-only integrations
```

---

## 4. Broker Adapter Location

Recommended package:

```text
packages/agents/src/adapters/
```

Recommended structure:

```text
packages/agents/src/adapters/
  broker-adapter.ts
  broker-capabilities.ts
  broker-constraints.ts
  simulation-broker-adapter.ts
  alpaca-broker-adapter.ts
  coinbase-broker-adapter.ts
  binance-broker-adapter.ts
```

---

## 5. Broker Adapter Interface

```ts
export interface BrokerAdapter {
  readonly brokerId: BrokerId
  readonly mode: "simulation" | "paper" | "live"

  getCapabilities(): Promise<BrokerCapabilities>

  getInstrumentConstraints(
    request: InstrumentConstraintRequest
  ): Promise<InstrumentConstraints>

  validateOrder(
    order: BrokerOrderRequest
  ): Promise<BrokerOrderValidationResult>

  submitOrder(
    order: BrokerOrderRequest
  ): Promise<BrokerOrderSubmissionResult>

  cancelOrder(
    request: BrokerCancelOrderRequest
  ): Promise<BrokerCancelOrderResult>

  getOrderStatus(
    request: BrokerOrderStatusRequest
  ): Promise<BrokerOrderStatusResult>

  getAccountState(
    request: BrokerAccountStateRequest
  ): Promise<BrokerAccountStateResult>
}
```

---

## 6. Broker ID

```ts
export type BrokerId =
  | "simulation"
  | "alpaca"
  | "interactive_brokers"
  | "coinbase"
  | "binance"
  | "kraken"
```

---

## 7. Broker Capabilities

```ts
export type BrokerCapabilities = {
  brokerId: BrokerId
  supportsStocks: boolean
  supportsEtfs: boolean
  supportsCrypto: boolean
  supportsFractionalEquities: boolean
  supportsFractionalCrypto: boolean
  supportsMarketOrders: boolean
  supportsLimitOrders: boolean
  supportsStopOrders: boolean
  supportsStopLimitOrders: boolean
  supportsPaperTrading: boolean
  supportsLiveTrading: boolean
  supportsOrderCancellation: boolean
  supportsOrderStatusPolling: boolean
  supportsWebhooks: boolean
  supportedCurrencies: string[]
}
```

---

## 8. Instrument Constraints

```ts
export type InstrumentConstraints = {
  brokerId: BrokerId
  symbol: string
  brokerSymbol: string
  assetKind: "stock" | "etf" | "crypto"
  minQuantity: number
  maxQuantity?: number
  minNotional: number
  maxNotional?: number
  quantityStep: number
  priceTickSize: number
  supportsFractional: boolean
  tradingHours?: TradingHours
}
```

---

## 9. Trading Hours

```ts
export type TradingHours = {
  timezone: string
  regularMarketOpen: string
  regularMarketClose: string
  supportsExtendedHours: boolean
  isCurrentlyTradable: boolean
}
```

Crypto brokers may return:

```ts
{
  timezone: "UTC",
  regularMarketOpen: "00:00",
  regularMarketClose: "23:59",
  supportsExtendedHours: true,
  isCurrentlyTradable: true
}
```

---

## 10. Internal Broker Order Request

```ts
export type BrokerOrderRequest = {
  idempotencyKey: string
  accountId: string
  portfolioId: string
  brokerId: BrokerId
  executionTarget: "simulation" | "paper" | "live"
  symbol: string
  brokerSymbol?: string
  assetKind: "stock" | "etf" | "crypto"
  side: "buy" | "sell"
  type: "market" | "limit" | "stop" | "stop_limit"
  quantity?: number
  notional?: number
  limitPrice?: number
  stopPrice?: number
  timeInForce: "day" | "gtc" | "ioc" | "fok"
  clientOrderId: string
  metadata?: Record<string, unknown>
}
```

---

## 11. Validation Result

```ts
export type BrokerOrderValidationResult = {
  valid: boolean
  brokerId: BrokerId
  normalizedSymbol: string
  brokerSymbol: string
  errors: BrokerValidationError[]
  warnings: BrokerValidationWarning[]
}
```

---

## 12. Validation Error

```ts
export type BrokerValidationError = {
  code:
    | "BROKER_UNAVAILABLE"
    | "ASSET_NOT_SUPPORTED"
    | "ORDER_TYPE_NOT_SUPPORTED"
    | "FRACTIONAL_NOT_SUPPORTED"
    | "MIN_QUANTITY_NOT_MET"
    | "MIN_NOTIONAL_NOT_MET"
    | "QUANTITY_STEP_INVALID"
    | "PRICE_TICK_INVALID"
    | "MARKET_CLOSED"
    | "INSUFFICIENT_BUYING_POWER"
    | "INSUFFICIENT_POSITION"
  message: string
}
```

---

## 13. Submission Result

```ts
export type BrokerOrderSubmissionResult = {
  accepted: boolean
  brokerId: BrokerId
  internalOrderId: string
  brokerOrderId?: string
  clientOrderId: string
  status:
    | "accepted"
    | "rejected"
    | "pending"
    | "filled"
    | "partially_filled"
  rejectionReason?: string
  submittedAt: string
  raw?: unknown
}
```

---

## 14. Order Status Result

```ts
export type BrokerOrderStatusResult = {
  brokerId: BrokerId
  internalOrderId: string
  brokerOrderId: string
  status:
    | "accepted"
    | "pending"
    | "filled"
    | "partially_filled"
    | "cancelled"
    | "rejected"
    | "expired"
  filledQuantity: number
  averageFillPrice?: number
  fees?: number
  updatedAt: string
  raw?: unknown
}
```

---

## 15. Cancel Order Result

```ts
export type BrokerCancelOrderResult = {
  brokerId: BrokerId
  brokerOrderId: string
  cancelled: boolean
  status: "cancelled" | "not_found" | "already_filled" | "failed"
  message?: string
}
```

---

## 16. Account State Result

```ts
export type BrokerAccountStateResult = {
  brokerId: BrokerId
  accountId: string
  buyingPower: number
  cash: number
  equity: number
  currency: string
  positions: BrokerPosition[]
  updatedAt: string
}
```

---

## 17. Broker Position

```ts
export type BrokerPosition = {
  symbol: string
  brokerSymbol: string
  assetKind: "stock" | "etf" | "crypto"
  quantity: number
  averageEntryPrice: number
  marketValue: number
  unrealizedPnl: number
}
```

---

## 18. Live Readiness Gate

Live broker adapters may only be used if:

* User explicitly enabled live trading
* Broker connection is verified
* Account state is readable
* Instrument constraints are loaded
* Risk profile exists
* Kill switch is available
* Audit logging is active
* Autonomous mode is explicitly allowed per lane

---

## 19. Broker Adapter Safety Rules

Adapters must never:

* Expose raw API keys
* Execute directly from UI
* Skip internal validation
* Translate failed broker responses into success
* Retry unsafe orders blindly
* Hide partial fills

---

## 20. Idempotency

Every broker order must include:

```text
clientOrderId
idempotencyKey
internalOrderId
```

If broker supports client order IDs, use them.

If broker does not support them, enforce idempotency internally.

---

## 21. Partial Fills

Partial fills must be represented explicitly.

```ts
export type BrokerFill = {
  brokerFillId: string
  brokerOrderId: string
  symbol: string
  side: "buy" | "sell"
  quantity: number
  price: number
  fee: number
  executedAt: string
}
```

Rules:

* Never assume full fill
* Update position only by filled quantity
* Keep order open until final status
* Reconcile all fills

---

## 22. Reconciliation

Broker state must be reconciled with Aurox internal state.

Reconciliation compares:

* Cash
* Buying power
* Positions
* Open orders
* Filled orders
* Fees

If mismatch:

```text
mark account as reconciliation_required
disable new live orders
allow only cancel/reduce-risk actions
```

---

## 23. Broker Failure Modes

Possible failures:

```text
API timeout
Authentication failure
Rate limit
Market closed
Order rejected
Partial fill
Unknown status
Duplicate request
Symbol unsupported
Insufficient buying power
```

Default behavior:

```text
fail closed
do not assume success
query broker status before retry
```

---

## 24. Rate Limits

Adapters must respect broker rate limits.

Recommended strategy:

* Request queue
* Exponential backoff
* Circuit breaker
* Status polling throttle

---

## 25. Circuit Breaker

Disable broker execution if:

* Authentication fails repeatedly
* Broker returns inconsistent state
* Order status cannot be verified
* Reconciliation fails
* Latency exceeds threshold repeatedly

---

## 26. Observability

Log every broker interaction:

* Request type
* Broker ID
* Internal order ID
* Broker order ID
* Status
* Latency
* Error code
* Normalized outcome

Never log:

* API keys
* Access tokens
* Secrets

---

## 27. Adapter Testing

Each adapter must include:

* Capability mapping tests
* Symbol normalization tests
* Order validation tests
* Min notional tests
* Tick size tests
* Quantity step tests
* Error normalization tests
* Partial fill tests
* Idempotency tests

---

## 28. Final Directive

Broker adapters are capital gateways.

If broker state is uncertain:

```text
DO NOT EXECUTE
```
