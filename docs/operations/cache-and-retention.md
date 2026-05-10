# Cache And Retention Operations

## Scope
- Simulation remains safety-first and unchanged.
- Live trading is not enabled.
- Provider/cache changes only improve read performance and resilience.

## Provider Request Cache
- Location: `apps/web/server/lib/provider-cache.ts`
- Strategy:
  - TTL cache with optional stale-while-revalidate (SWR)
  - In-flight dedupe per key
  - Fallback to last known-good cached value on provider failures
- Keying:
  - provider + symbol/hash + timeframe/query dimensions

## Current TTL Policy
- Quotes: ~45s TTL, ~75s SWR window
- Historical bars: 15m TTL, 60m SWR window
- Existing DB-backed snapshots/bars remain authoritative persistence

## Safety Rules
- Never cache secrets or auth tokens in metadata logs.
- Never write failed provider responses over known-good DB snapshots.
- Never synthesize fake bars.

## Retention Helpers
- `runRetentionMaintenance()` in `apps/web/server/services/retention-service.ts`
- Prunes:
  - observation events (default 30 days)
  - resolved/dismissed alerts first (default 30 days)
  - broad alert cleanup fallback (default 120 days)
- Simulation journal/order audit data is intentionally not pruned here.

## Suggested Job Cadence
- Hourly:
  - prune resolved/dismissed alerts
- Daily:
  - prune observation events
  - broad alert cleanup

## Telemetry
- Use `AUROX_PERF_LOGS=true` (or `ENABLE_PERF_LOGS=true`) to emit server perf logs.
- Sensitive keys are redacted (`token`, `secret`, `password`, `authorization`, `apiKey`, `cookie`).
