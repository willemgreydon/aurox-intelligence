# Architecture Overview

This document is the authoritative architecture map for Aurox Intelligence.

## Mission

Aurox Intelligence is a simulation-first financial intelligence platform that combines market data, explainable analytics, and workstation-grade investing UX.

The architecture is optimized for:
- deterministic behavior
- clear trust boundaries
- incremental evolution toward live broker integration
- AI-agent compatibility for development workflows

## Repository Topology

```text
apps/
  web/                         # Next.js App Router product UI + server orchestration
packages/
  api-contracts/               # Zod schemas and shared TS contracts
  providers/                   # External market/macro/news/banking adapters
  db/                          # Postgres repositories, read models, persistence
  signals/                     # Pure signal derivation logic
  forecasting/                 # Pure forecasting + explainability logic
  agents/                      # Trade workflow, policy, readiness, adapters
  ai-market-intelligence/      # High-level recommendation/intelligence composition
  observability/               # Shared logging/metrics/tracing helpers
```

## Boundary Contract

Aurox uses strict boundaries.

- UI routes and components do not call providers directly.
- UI routes and components do not call DB directly.
- Provider transport and symbol normalization stay in `packages/providers`.
- Persistence access stays in `packages/db`.
- Shared types and schemas stay in `packages/api-contracts`.
- Signal/forecast logic remains pure in `packages/signals` and `packages/forecasting`.

## Read Path Pattern

The canonical read path in `apps/web` is:

`Query -> Mapper -> Service -> Route -> UI`

- Query: gather raw domain data from package boundaries.
- Mapper: derive route-specific read models/view models.
- Service: provide route-consumable contract and orchestration.
- Route: choose rendering and route concerns only.
- UI: present, interact, and dispatch actions.

This pattern is required for new major screens.

## Write Path Pattern

Write path is server-driven:

1. UI submits an action form.
2. Server action validates with Zod.
3. Domain service enforces lane/scope/policy constraints.
4. Repository transaction applies deterministic updates.
5. Read models are revalidated.

## Simulation Core Design

Simulation is a real persisted execution system, not a toy demo.

Key properties:
- deterministic fill/accounting logic
- persisted orders/transactions/snapshots
- lane-aware execution constraints
- audit-friendly execution record metadata

Primary tables:
- `app.simulation_accounts`
- `app.simulation_portfolios`
- `app.simulation_positions`
- `app.simulation_orders`
- `app.simulation_transactions`
- `app.simulation_snapshots`

## Current Product Surfaces

Major route families:
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

## Data Reliability Model

Aurox uses provider-backed data with cache-first resilience:
- quote and history snapshots from provider adapters
- persistent quote/history caches in DB
- graceful fallback on provider degradation
- explicit freshness/status messaging in UI

## Live Migration Philosophy

Live trading is intentionally gated.

Architecture already includes:
- execution target seams (`simulation` vs `live`)
- readiness check structures
- broker capability boundaries
- policy-aware order workflows

Simulation remains the safe default and reference path.

## Non-Goals

The architecture does not optimize for:
- hidden business logic in UI
- ad-hoc route-side provider calls
- speculative abstractions without integration path
- synthetic data pretending to be live

## Success Criteria for Future Changes

A change is architecture-compliant when:
- contracts are explicit and shared
- boundaries remain intact
- behavior is deterministic and testable
- read models remain reusable
- migration seams become clearer, not blurrier
