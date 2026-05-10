# Performance / Persistence / Cache Audit

Date: 2026-05-09

## Current Findings
- Duplicate provider calls:
  - repeated quote/history fetch paths can occur across market pages and per-symbol loaders.
  - no shared generic provider cache abstraction existed before this pass.
- Slow route risk:
  - `/observe` and `/alerts` stack multiple heavy services; alert generation re-runs observe aggregation.
  - some list limits were broad (`600`) for alert fetches.
- Missing cache layers:
  - in-memory caches existed in stock simulation service, but no reusable SWR provider cache layer.
- Stale data behavior:
  - DB quote/history fallbacks were present, but no formal stale-read status abstraction.
- Revalidation:
  - simulation and watchlist actions had hardcoded multi-path revalidation; easy to over-expand.
  - alert/observe API state actions did not revalidate affected pages after mutation.
- Persistence:
  - DB-backed market snapshots/history already existed and are used first.
  - no dedicated retention orchestrator for observations/alerts.
- Index gaps:
  - additional indexes improve time-ordered and source/severity/status query performance on cache/event tables.

## Patch Plan Executed
1. Add generic provider request cache (TTL + SWR + in-flight dedupe + good-data fallback).
2. Integrate provider cache into quote/history provider fetch paths.
3. Add request-scoped memoization for observe model reuse in alerts.
4. Centralize targeted revalidation logic and wire into simulation/watchlist + alert/observe state updates.
5. Add retention maintenance service + resolved/dismissed alert prune path.
6. Add performance timer helper with metadata redaction.
7. Add supporting tests and operations docs.

## Exact Fixes Applied
- Added:
  - `apps/web/server/lib/provider-cache.ts`
  - `apps/web/server/lib/provider-cache.test.ts`
  - `apps/web/server/lib/revalidation-targets.ts`
  - `apps/web/server/lib/revalidation-targets.test.ts`
  - `apps/web/server/lib/performance-timer.ts`
  - `apps/web/server/lib/performance-timer.test.ts`
  - `apps/web/server/services/retention-service.ts`
  - `apps/web/server/services/retention-service.test.ts`
  - `docs/operations/cache-and-retention.md`
  - `packages/db/src/migrations/0014_market_cache_perf_indexes.sql`
- Updated:
  - `apps/web/server/services/stock-simulation-service.ts`
    - provider quote/history fetches now go through provider cache.
  - `apps/web/server/services/market-observation-service.ts`
    - added request-scoped observe memoization export.
  - `apps/web/server/services/alert-center-service.ts`
    - uses request-scoped observe model and tighter default list limit.
  - `apps/web/server/actions/simulation-actions.ts`
    - switched to centralized targeted revalidation helpers.
  - `apps/web/app/api/alerts/[id]/state/route.ts`
  - `apps/web/app/api/observe/events/[id]/state/route.ts`
    - now trigger targeted route revalidation after state mutations.
  - `packages/db/src/repositories/alerts-repository.ts`
    - added prune helper for resolved/dismissed alerts.
