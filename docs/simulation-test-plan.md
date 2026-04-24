# Simulation Test Plan

This is the complete validation plan for Aurox simulation trading.

## Objective

Verify end-to-end correctness of simulation session lifecycle, order execution, accounting, read models, and UI surfaces.

## Scope

In scope:
- session start/resume
- lane restrictions
- buy/sell execution
- portfolio recomputation
- order and transaction journaling
- snapshot generation
- route-level rendering on invest surfaces

Out of scope:
- real broker settlement
- regulatory reporting obligations

## Environment Preconditions

- `DATABASE_URL` configured and reachable
- migrations applied
- at least one market data provider configured
- web app running
- worker running for periodic snapshots

## Deterministic Test Matrix

### A. Session and Lane Controls

1. Start `manual_stock_lane` session.
Expected: session created/running; stock scope enforced.

2. Attempt ETF/crypto order in stock lane.
Expected: order blocked with clear lane/scope reason.

3. Start/resume multi-asset lane.
Expected: stock/ETF/crypto submissions accepted if tradable.

### B. Buy Path

1. Submit valid buy order.
Expected:
- order persisted
- transaction persisted
- cash decreases by gross + fee
- position quantity and average cost updated
- snapshot created

2. Submit idempotent duplicate buy.
Expected: existing order returned, no duplicate accounting mutation.

3. Submit buy exceeding available cash.
Expected: rejected with deterministic message.

### C. Sell Path

1. Submit valid partial sell.
Expected:
- quantity decreases
- realized PnL reflects execution price, cost basis, and fee
- cash increases by gross - fee

2. Submit sell exceeding held quantity.
Expected: rejected.

3. Submit full sell to zero quantity.
Expected: position closed timestamp set; appears in closed positions.

### D. Execution Metadata

1. Verify order notes contain structured execution record payload.
2. Verify parsed order output exposes execution record fields.
3. Verify slippage/fee/latency values are consistent with configured execution model.

### E. Read Model Integrity

1. Portfolio page
- open and closed positions consistent with DB
- allocations sum approximately to 100 percent when open positions exist
- recent trades list reflects latest orders

2. Orders page
- order row values match persisted records
- transaction journal cash deltas align with account balance progression

3. Simulation page
- summary metrics and equity curve update after trades/snapshots

### F. Failure/Degraded Modes

1. Simulate provider failure.
Expected: stale/partial states displayed; no fabricated quote values.

2. Force read-only session state.
Expected: trading controls disabled with explicit reason.

## SQL Verification Checklist

Check after each scenario:
- `simulation_accounts.cash_balance`
- `simulation_positions.quantity/average_cost/realized_pnl`
- `simulation_orders` latest row values
- `simulation_transactions.cash_delta/realized_pnl`
- `simulation_snapshots` progression

## Acceptance Criteria

- all deterministic checks pass
- no silent accounting drift
- no route crashes in loading/error/empty states
- lane and tradability enforcement works server-side

## Regression Cadence

- run smoke flow on each simulation engine change
- run extended matrix before release tags
- archive execution and portfolio snapshots for diff-based auditing
