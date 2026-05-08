# Observe Persistence and Outcomes Audit

Date: 2026-05-08

## Files inspected
- `apps/web/app/observe/page.tsx`
- `apps/web/components/observe/observe-workstation.tsx`
- `apps/web/server/services/market-observation-service.ts`
- `apps/web/server/lib/market-observation-engine.ts`
- `apps/web/server/lib/market-observation-engine.test.ts`
- `packages/db/src/migrations/0011_intelligence_memory_and_currency.sql`
- `packages/db/src/repositories/intelligence-memory-repository.ts`
- `packages/db/src/repositories/simulated-trading-repository.ts`
- `apps/web/server/services/simulation-workstation-service.ts`

## Current state
- `/observe` feed/timeline/anomalies are generated runtime-only in `getObserveViewModel`.
- No persistence for observation events.
- No read/pin state.
- No outcome/ROI join in timeline.
- Watchlist intelligence only applies default confidence sort.

## Reusable data already available
- Simulation outcomes from `app.simulation_orders`, `app.simulation_positions`, and `app.simulation_snapshots`.
- Intelligence trace storage from `0011` tables (`signal_decision_traces`, `broker_decision_traces`, `news_impact_traces`, `report_artifacts`, `intelligence_memory_chunks`).

## Gaps and fixes
1. Observation persistence: missing table/repository.
: Add `observation_events` + `observation_event_states` with dedupe fingerprint and query indexes.
2. Runtime generation not resiliently persisted.
: Wire best-effort persistence in observation service with degraded fallback on DB failure.
3. Outcome awareness.
: Add `observation-outcome-service` to deterministically map simulation-linked events to `PENDING/WIN/LOSS/NEUTRAL/UNAVAILABLE`.
4. Watchlist interaction.
: Add sort/filter/search helpers and UI controls.
5. Actionability.
: Add mark read/pin/dismiss actions via API route and detail view `/observe/[id]`.
