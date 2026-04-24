# Aurox Intelligence

Aurox Intelligence is a production-oriented TypeScript monorepo for financial intelligence and simulation-first multi-asset investing.

## What It Does

- provides provider-backed market data surfaces
- derives explainable analytics signals and forecast context
- runs persisted simulation trading for stocks, ETFs, and crypto
- exposes workstation-grade invest interfaces with typed server-driven read models

## Product Surfaces

- `/dashboard`
- `/market`
- `/stocks`, `/stocks/[symbol]`
- `/fx`, `/fx/[pair]`
- `/signals`
- `/forecasts`
- `/invest`
- `/invest/simulation`
- `/invest/portfolio`
- `/invest/orders`
- `/invest/live-readiness`
- `/invest/stocks`, `/invest/etfs`, `/invest/crypto`

## Architecture Rules

Aurox enforces strict monorepo boundaries.

- provider logic stays in `packages/providers`
- DB access stays in `packages/db`
- contracts stay in `packages/api-contracts`
- signals stay pure in `packages/signals`
- forecasts stay pure in `packages/forecasting`
- route orchestration and rendering stay in `apps/web`

Canonical web read flow:

`Query -> Mapper -> Service -> Route -> UI`

## Monorepo Layout

```text
apps/
  web/
packages/
  agents/
  ai-market-intelligence/
  api-contracts/
  db/
  forecasting/
  observability/
  providers/
  signals/
```

## Quick Start

1. Install dependencies

```bash
pnpm install
```

2. Create local env

```bash
cp .env.example .env
```

3. Apply migrations

```bash
node packages/db/scripts/migrate.mjs
```

4. Start development

```bash
pnpm dev
```

## Key Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm test
```

Targeted examples:

```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
```

## Simulation Safety Model

Current execution is simulation-first:
- no default live broker execution
- deterministic accounting and persistence
- lane and tradability enforcement
- auditable order and transaction history

Simulation core tables:
- `app.simulation_accounts`
- `app.simulation_portfolios`
- `app.simulation_positions`
- `app.simulation_orders`
- `app.simulation_transactions`
- `app.simulation_snapshots`

## Documentation Map

- [System Docs Master](./DOCUMENTATION.md)
- [Current State Summary](./CURRENT_STATE_SUMMARY.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Architecture Current State](./docs/architecture/current-state.md)
- [Architecture Best Practices](./docs/architecture/best-practices.md)
- [Simulation Test Plan](./docs/simulation-test-plan.md)

Domain docs in `docs/` cover execution, risk, portfolio construction, reporting, taxonomy, ETF/crypto structure, AI usage, and anomaly detection.

## Current Known Baseline Issue

There is an existing unrelated `apps/web` auth test typing issue in `server/auth/service.test.ts` that can fail full web typecheck. Core modified packages (`api-contracts`, `db`) should still be validated independently when changing domain logic.
