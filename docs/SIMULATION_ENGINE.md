# SIMULATION_ENGINE.md — Aurox Simulation Engine

**Version:** 1.0
**Status:** Authoritative — updated after each simulation accounting change

---

## 1. Purpose

The Aurox simulation engine is a deterministic financial execution environment.
It is not a visual demo, a mock, or an approximation. Every order, position mutation,
cash movement, and portfolio snapshot is persisted and traceable.

The simulation engine is the training and safety environment for Aurox Intelligence.
All execution logic is designed to behave identically to how real-capital execution
would behave — except that no real money changes hands.

---

## 2. Core Invariants

These rules must never be violated:

1. **No randomness.** Every fill, fee, and cash delta is computed deterministically from
   the order input, execution model configuration, and market price at time of submission.

2. **Full accounting traceability.** Every cash movement produces a transaction record.
   No balance changes silently.

3. **Fail closed.** If validation fails, the order is rejected and no state is mutated.
   Partial fills are not silently committed.

4. **Same logic as live.** Execution constraints, capital checks, position limits, and
   risk guards use the same code paths that will govern live trading in future stages.

5. **Reversibility via audit.** Any simulation state can be reconstructed from the
   transaction journal. Account reset is available and fully auditable.

---

## 3. Persisted State

Simulation state lives in five tables in the `app` schema:

| Table                      | Purpose                                                   |
|----------------------------|-----------------------------------------------------------|
| `simulation_accounts`      | Account identity, initial cash, currency                  |
| `simulation_portfolios`    | Current balances: cash, reserved, invested, equity        |
| `simulation_positions`     | Open and closed positions with cost basis and PnL         |
| `simulation_orders`        | Filled and rejected order records                         |
| `simulation_transactions`  | Every cash event: funding, buy, sell, reset               |
| `simulation_snapshots`     | Periodic equity snapshots for equity curve rendering      |

All tables are owned by `@repo/db`. No application code outside `@repo/db` may write
directly to these tables.

---

## 4. Order Lifecycle

```
Order intent received
  → Zod schema validation (SimulationExecutionInput)
  → Asset class check (stock | etf | crypto)
  → Side check (buy | sell)
  → Cash availability check (buy only)
  → Position availability check (sell only — must hold sufficient quantity)
  → Lane capital check (notional vs maxPerTrade and lane maxAbsolute)
  → Risk cap checks (position percent, drawdown, daily loss)
  → Fee and slippage computation from ExecutionModel
  → Execution record construction (with validation hash)
  → Position mutation (upsert or close)
  → Cash delta applied to portfolio
  → Transaction record written
  → Order record written (status: filled | rejected)
  → Snapshot may be triggered
```

No step is skipped. If any check fails, the function throws and no DB writes occur.

---

## 5. Fill Engine

Location: `packages/agents/src/simulation/fill-engine.ts`

The fill engine computes:

- **Execution price** — requested price adjusted by slippage model
- **Fee amount** — computed from `feeBps` in ExecutionModel
- **Slippage amount** — computed from `slippageBps`
- **Net cash effect** — for buys: `-(executionPrice × quantity + fee)`, for sells: `+(executionPrice × quantity - fee)`

Default simulation model (when not overridden):
- `feeBps: 0` (no simulated fees unless configured)
- `slippageBps: 0` (no slippage unless configured)
- `latencyMs: 0`
- `venue: simulation_engine`

The fill engine is a pure function. No I/O, no DB calls, no randomness.

---

## 6. Position Accounting

### Opening a Position (Buy)

- If no position exists for the asset: create new position with `quantity` and `averageCost = executionPrice`
- If position exists: recalculate average cost via weighted average:
  ```
  newAverageCost = (existingQuantity × existingAverageCost + newQuantity × executionPrice)
                  / (existingQuantity + newQuantity)
  ```

### Closing / Reducing a Position (Sell)

- Realized PnL = `(executionPrice - averageCost) × soldQuantity`
- Remaining position quantity = `existingQuantity - soldQuantity`
- If remaining quantity is zero: position is marked closed with `closedAt` timestamp
- Partial sells reduce quantity and update market value but do not change `averageCost`

### Position Valuation

- Market value = `currentMarketPrice × quantity`
- Unrealized PnL = `marketValue - costBasis`
- Market prices are injected at read time from the latest cached quote snapshot
- If no market price is available: `marketValue` falls back to `costBasis`; `unrealizedPnl` is zero

---

## 7. Portfolio Accounting

Portfolio balances maintained in `simulation_portfolios`:

```
equityValue = cashBalance + portfolioValue
portfolioValue = sum of all open position market values
availableCash = cashBalance - reservedCash
unrealizedPnl = sum of all open position unrealizedPnl
realizedPnl = cumulative realized PnL from all closed positions
```

Every buy reduces `cashBalance` by the net cash effect.
Every sell increases `cashBalance` by the net cash effect.
Reserved cash is tracked separately for future lane-level pre-reservation (not yet active).

---

## 8. Transaction Journal

Every cash movement writes a transaction record of type:

| Type              | When written                                  |
|-------------------|-----------------------------------------------|
| `initial_funding` | At account initialization                     |
| `buy`             | After every filled buy order                  |
| `sell`            | After every filled sell order                 |
| `reset`           | After account reset                           |

The transaction journal is append-only and immutable. It is the authoritative record for
reconciliation.

---

## 9. Execution Record

Each order carries an `executionRecord` embedded in the order notes (current implementation)
or as a structured field (future DB column). The record contains:

- `executionId` — unique identifier for the fill event
- `requestedPrice` — price at time of order submission
- `executionPrice` — price after slippage
- `slippageAmount` and `slippageBps`
- `feeAmount`
- `notionalAmount` — gross order value before fees
- `latencyMs`
- `validationHash` — deterministic hash of the fill inputs for integrity verification
- `venue` — always `simulation_engine` in current release
- `model` — copy of the ExecutionModel used for this fill

**Known issue:** Execution records are currently serialized into order notes for backward
compatibility. A dedicated `simulation_execution_records` table should be added before
live migration proceeds.

---

## 10. Simulation Sessions

Simulation activity is organized into sessions:

- Each session has a `laneId`, `laneMode`, `assetScope`, and `maxCapitalUsd`
- A session may be `draft`, `starting`, `running`, `paused`, `stopping`, `stopped`,
  `completed`, or `failed`
- Trading is only permitted when `status === 'running'` or `status === 'starting'`
  AND `observationStatus` is not `error` or `degraded`
- The workstation derives `isReadOnly` from session state — all trade actions check this

---

## 11. Asset Scope and Lane Enforcement

Each session has an `assetScope`: `stock`, `etf`, `crypto`, or `multi-asset`.

The `listSimulationTradableAssets` query filters the asset catalog by scope.
Orders are validated against the lane's `allowedAssetKinds` before execution.

**Current truth:**

| Asset class | Simulation execution | Status                             |
|-------------|---------------------|------------------------------------|
| Stock       | Active              | Works end-to-end                   |
| ETF         | Prepared            | Schemas exist, not confirmed active |
| Crypto      | Prepared            | Schemas exist, not confirmed active |

ETF and crypto simulation will be considered active only when:
1. `listSimulationTradableAssets` returns ETF/crypto rows from the catalog
2. Orders for ETF and crypto assets successfully pass all checks
3. End-to-end test coverage confirms the flow

---

## 12. Snapshots and Equity Curve

Periodic snapshots record the full portfolio state at a point in time:
- `cashBalance`, `marketValue`, `equityValue`, `unrealizedPnl`, `realizedPnl`, `positionCount`
- `takenAt` timestamp

Snapshots are sorted and rendered as the equity curve on the simulation workstation.
They are append-only and never mutated after creation.

---

## 13. Account Reset

The reset operation:
1. Closes all open positions (sets `closedAt`, zero market value)
2. Resets `cashBalance` to `initialCashBalance`
3. Resets PnL accumulators to zero
4. Writes a `reset` transaction record
5. Does NOT delete order or transaction history (audit trail preserved)

---

## 14. Idempotency

Order submission accepts an optional `idempotencyKey`. If a key is provided and a matching
order already exists, the existing order is returned without re-executing. This prevents
double-submission on network retry or UI re-render.
