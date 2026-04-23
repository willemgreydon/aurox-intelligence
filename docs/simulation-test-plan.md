# Simulation Test Plan

## Goal
Validate that the paper-trading flow works end to end without any live broker execution.

## Preconditions
- `DATABASE_URL` points to a reachable Postgres or Neon database.
- At least one market data provider key is configured.
- Database migrations in `packages/db/src/migrations` have been applied.

## Recommended local flow
1. Install dependencies with `pnpm install` at repo root.
2. Start the web app with `pnpm dev:web`.
3. Start the worker with `pnpm dev:worker`.
4. Register or sign in.
5. Open `/invest` and start a simulation session.
6. Open `/invest/simulation`.
7. Place a BUY order for a stock with a live or cached quote.
8. Confirm that positions, orders, transactions, and equity values update.
9. Place a SELL order and confirm realized PnL and closed positions update.
10. Visit `/invest/orders`, `/invest/portfolio`, and `/invest/live-readiness` to verify downstream read models.

## Expected outcomes
- No real broker execution is triggered.
- Orders are recorded through the simulation adapter.
- Workspace summary updates cash, invested capital, equity, realized PnL, and unrealized PnL.
- Worker snapshot ingestion improves freshness and equity-curve history over time.

## Known limits in this snapshot
- Live broker execution is still disabled by registry.
- ETF and crypto execution remain browse-first in the current UI.
- Signal and forecast recomputation jobs are still lightweight placeholders compared with the richer simulation path.
