# Realtime Intraday + Symbol Universe Audit (May 9, 2026)

## Current State (Before This Pass)
- Provider adapters were effectively daily-history only.
- `1m` / `1h` graph timeframes were UI-level only and degraded to daily bars.
- `getMarketGraphData` could fetch missing history, but timeframe switches did not trigger server backfill/API expansion.
- Quote refresh and provider health metadata existed partially, but intraday capability mapping was not explicit.

## Gaps Confirmed
- No real Binance intraday candle adapter for `BINANCE:*` symbols.
- No resolution-aware provider contract (`1m`, `5m`, `15m`, `30m`, `60m`, `1d`) in provider fetch options.
- No dedicated graph history endpoint for on-demand timeframe expansion.
- 1Y/2Y coverage could degrade even when backfill was possible.

## Changes Applied In This Pass
- Added provider history resolution model in provider types (`MarketHistoryResolution`) plus degraded-reason scaffolding.
- Added `binance` provider support in config/schema/registry and implemented:
  - quote: `/api/v3/ticker/price`
  - history: `/api/v3/klines` for `1m|5m|15m|30m|60m|1d`
- Updated provider client to pass explicit resolution into history readers.
- Updated legacy/daily-only adapters (Polygon/Finnhub/EODHD/TwelveData/CoinGecko) to reject unsupported intraday resolution explicitly instead of silently downgrading.
- Extended `loadHistoryBars(symbol, minBars, resolution)`:
  - `1d` remains DB-backed with provider top-up + persistence.
  - intraday uses provider cache path (no fake synthesis, no daily-table overwrite).
- Updated market graph service:
  - maps timeframe -> resolution (`1m => 1m`, `1h => 5m`, else `1d`)
  - uses resolution-aware history fetch
  - records backfill metadata (`backfillAttempted`, `backfillSucceeded`, `providerReturnedBars`)
  - attempts long-range top-up for `1Y`/`2Y` primary symbol when coverage is insufficient.
- Added lightweight endpoint for timeframe-specific top-up:
  - `GET /api/market/history?symbol=...&timeframe=...`
- Updated graph workspace to request additional history on timeframe switches (when coverage is insufficient for 1Y/2Y) without full page reload.

## Remaining Open Points
- Intraday persistence currently uses provider cache path, not dedicated DB intraday table retention buckets.
- Provider health/rate-limit dashboard UI still needs fuller operations surface.
- Larger symbol universe batching/virtualization and worker-ingestion batch jobs remain a follow-up.

## Continuation Pass (May 9, 2026)
- Added provider capability matrix read model and admin UI surface:
  - quote mode, asset classes, resolution support, configured status, and recent success/failure stamps.
- Added market quote API route:
  - `GET /api/market/quote?symbol=...&assetClass=...`
  - validates params and returns normalized provider-safe error text.
- Upgraded market graph status strip to show:
  - selected timeframe, requested/actual resolution, provider, quote mode, coverage ratio, backfill status.
- Added active-page quote refresh controls in graph workspace:
  - polling cadence helper with hidden-tab throttling behavior.
- Added worker intraday ingestion skeleton:
  - `apps/worker/src/jobs/ingest-intraday-market-data.ts`
  - priority symbols + crypto intraday resolutions
  - resilient per-symbol error handling and summary logging.
- Added retention operations doc:
  - `docs/operations/market-data-cache-retention.md`
- Added symbol-universe pagination/search foundation service:
  - `apps/web/server/services/symbol-universe-service.ts`
- Added normalized provider error helper for UI-safe messaging:
  - `apps/web/server/lib/provider-error-normalizer.ts`
