# Architecture Overview

See also:

- [Current State](./current-state.md)
- [Best Practices](./best-practices.md)

## Core flow

1. Provider adapters fetch raw external data.
2. Ingestion layer validates and canonicalizes payloads.
3. Canonical records are stored through `packages/db`.
4. Signal engine derives indicators and composite signals.
5. Forecasting engine produces explainable scenario outputs.
6. Web app reads through server queries and services.
7. Admin surfaces monitor freshness, health, and job runs.

## Boundaries

- `apps/web`: rendering and controlled route handlers
- `apps/worker`: scheduled jobs and recomputations
- `packages/providers`: transport and provider mapping
- `packages/ingestion`: normalization, dedupe, persistence orchestration
- `packages/signals`: pure derivation logic
- `packages/forecasting`: pure explainable forecast logic
- `packages/db`: persistence boundary
- `packages/api-contracts`: shared contract boundary
- `packages/observability`: shared runtime instrumentation helpers

## Current Route Families

The current v1 route set includes:

- `/dashboard`
- `/stocks`
- `/stocks/[symbol]`
- `/fx`
- `/fx/[pair]`
- `/signals`
- `/forecasts`
- `/admin`
- `/admin/monitoring`
