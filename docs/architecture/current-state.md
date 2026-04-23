# Current State

This document describes the validated current state of the repository as a production-oriented v1 financial intelligence platform.

## Product Scope

The application currently supports these product surfaces:

- `/dashboard`
- `/stocks`
- `/stocks/[symbol]`
- `/fx`
- `/fx/[pair]`
- `/signals`
- `/forecasts`
- `/admin`
- `/admin/monitoring`

The product direction is a workstation-style analytics interface for:

- stock monitoring and trend review
- FX monitoring and pair analysis
- explainable short-horizon signal and forecast summaries
- provider and platform monitoring

## Repository Boundaries

The monorepo remains intentionally split by responsibility:

- `apps/web`: Next.js App Router UI, route rendering, server-side read orchestration
- `apps/worker`: background jobs and ingestion entry points
- `packages/db`: persistence boundary, repositories, read queries
- `packages/providers`: external provider adapters and market-data normalization
- `packages/ingestion`: canonicalization and orchestration
- `packages/signals`: pure signal derivation logic
- `packages/forecasting`: pure forecast/scenario logic
- `packages/api-contracts`: shared DTOs and schemas
- `packages/observability`: shared runtime instrumentation helpers
- `packages/design-tokens`: single source of truth for design tokens and semantic theme variables

## UI and Design System

The web app uses a token-driven UI foundation:

- semantic CSS variables are centralized in `packages/design-tokens`
- light and dark theme support is implemented through semantic roles
- the UI language is dense, analytical, and workstation-oriented
- reusable UI families exist for stats, charts, dashboard cards, tables, filters, signals, forecasting blocks, and operational panels

Important web structure:

- `apps/web/app`: routes and layouts
- `apps/web/components`: shared UI and analytical component families
- `apps/web/server/queries`: read-entry orchestration
- `apps/web/server/mappers`: view-model and contract shaping
- `apps/web/server/services`: route-facing composition layer

## Real Data Coverage

### Provider Configuration

Provider configuration is already wired and in active use through:

- `packages/providers/src/config.ts`
- `packages/providers/src/market/client.ts`
- `apps/worker/src/jobs/ingest-market-data.ts`

Environment variables currently expected by the provider layer:

- `MARKET_DATA_PROVIDER`
- `FINNHUB_API_KEY`
- `EODHD_API_KEY`
- `FINNHUB_MARKET_SYMBOLS`
- `EODHD_MARKET_SYMBOLS`

### Stock Data

The app currently uses real stock provider data for:

- live stock quotes
- tracked stock universe overview
- stock detail history on `/stocks/[symbol]`
- dashboard live stock snapshot sections

### FX Data

The app currently uses real FX provider data for:

- live FX quotes on `/fx`
- FX pair detail history on `/fx/[pair]`

### Signal and Forecast Data

The app now exposes first-pass explainability surfaces:

- `/signals` derives signal snapshots from provider-backed tracked stock history using pure signal functions
- `/forecasts` derives v1 explainable forecasts from those signal snapshots

These are real derived outputs, but they are not yet persistence-backed or fully calibrated scenario-engine products.

## Route State Summary

### Dashboard

`/dashboard` mixes:

- repository-backed operational dashboard reads
- real stock quote summaries from the stock read service
- analytical UI sections that remain partially placeholder where persistence-backed breadth, scenarios, and cross-asset datasets are not yet available

### Stocks

`/stocks` is a real monitored stock surface with:

- live quote summaries
- movers
- tracked universe table
- provider freshness state

`/stocks/[symbol]` includes:

- live quote summary
- real historical price chart based on provider-returned daily bars
- honest partial modules for fundamentals, news, and deeper risk/driver blocks

### FX

`/fx` is a real monitored pair overview with provider-backed quotes.

`/fx/[pair]` includes:

- live quote summary
- real historical pair chart based on provider-returned daily bars
- honest partial modules for macro context and deeper scenario/risk analysis

### Signals

`/signals` is now a server-owned analytical surface that:

- reads tracked stock history through the provider/query/service path
- derives signals using pure package logic
- renders signal tables and breakdowns without embedding analytics logic in components

### Forecasts

`/forecasts` is now a server-owned explainability surface that:

- derives forecasts from signal snapshots
- renders structured forecast summaries
- stays explicit that medium/long-horizon scenario calibration remains partial

### Admin and Monitoring

`/admin` and `/admin/monitoring` provide:

- provider check visibility
- pipeline summaries
- warning visibility
- freshness and readiness messaging

Current monitoring is truthful but still partially constrained by the current persistence layer.

## Architectural Patterns In Use

The web app follows this read path:

1. providers and DB boundaries return raw operational or market data
2. `apps/web/server/queries/*` coordinate route-level reads
3. `apps/web/server/mappers/*` convert raw outputs into shared contracts or page view models
4. `apps/web/server/services/*` expose route-facing composed data
5. App Router pages render presentational components only

This pattern is now used across dashboard, stocks, FX, admin, signals, and forecasts.

## Known Partial Areas

The repository is coherent and build-green, but the following are still partial:

- dashboard still contains some analytical placeholder sections where no truthful persistence-backed dataset exists yet
- forecasts are derived from live signal snapshots rather than persisted forecast pipelines
- signals are provider-history-derived and not yet stored as first-class persisted signal records
- tracked universe expansion is still env/provider-driven rather than backed by a persisted asset registry
- fundamentals, news, and richer macro context are not yet built as first-class read models

## Build State

The monorepo currently builds successfully with:

```bash
npm run build
```

The current route set and package seams are build-valid and should be treated as the baseline v1 architecture.
