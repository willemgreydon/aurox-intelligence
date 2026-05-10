# Macro Data Integration

## Providers
- World Bank Indicators API (`api.worldbank.org/v2`)
- ECB Data Portal SDMX API (`data-api.ecb.europa.eu/service`)
- FRED API (`api.stlouisfed.org/fred`)

## Supported indicators (initial set)
- World Bank: `NY.GDP.MKTP.KD.ZG`, `FP.CPI.TOTL.ZG`, `SL.UEM.TOTL.ZS`
- ECB: curated rates/inflation SDMX series
- FRED: `FEDFUNDS`, `DGS10`, `DGS2`, `UNRATE`, `CPIAUCSL`, `VIXCLS`

## Environment variables
- `FRED_API_KEY=`
- `ENABLE_WORLD_BANK_MACRO=true`
- `ENABLE_ECB_MACRO=true`
- `ENABLE_FRED_MACRO=true`
- `MACRO_DATA_PROVIDER=multi`
- `MACRO_CACHE_TTL_SECONDS=21600`

Missing `FRED_API_KEY` degrades only FRED rows and does not block startup.

## Cache strategy
- Web service uses `unstable_cache` and provider layer in-memory cache.
- Default TTL is 6h (`21600s`) with safe minimum fallback.
- Macro fetch failures degrade to empty snapshot with deterministic default regime.

## Simulation usage
- Macro regime is added to simulation and portfolio intelligence as context, explanation, and risk-overlay signals.
- Prepare-buy/sell flow remains simulation-only and includes macro context note.

## Safety boundary
- No live trading execution is introduced.
- No macro provider code calls broker execution paths.
- No autonomous trade placement is added.

## Limitations
- ECB parser currently uses simplified JSON row mapping for curated fixtures.
- Regime model is deterministic heuristic scoring, not predictive forecasting.
- Series coverage is intentionally narrow for first rollout.

## Future expansion
- Add broader curated series catalog and better SDMX parser depth.
- Persist macro snapshots in DB for audit and historical regime replay.
- Add dedicated macro risk controls in policy engine (still simulation-only until explicitly approved).
