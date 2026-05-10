# Market Data Cache Retention

## Retention policy
- `1m` candles: retain `7-30` days.
- `5m` / `15m` candles: retain `30-90` days.
- `60m` candles: retain `90-180` days.
- `1d` bars: retain long-term for analytics and 1Y/2Y views.
- quote snapshots: short rolling retention, optimized for freshness.
- provider error events: retain long enough for operational debugging and rate-limit analysis.

## Current implementation status
- Daily bars are persisted in `app.market_daily_bars`.
- Quote snapshots are persisted in `app.market_quote_snapshots`.
- Intraday bars are currently fetched through provider cache path and are not yet persisted in a dedicated intraday table.

## Pruning roadmap
- Add dedicated intraday tables keyed by `(symbol, provider, resolution, observed_at)`.
- Add scheduled pruning job with configurable retention days per resolution.
- Keep audit-safe simulation and journal data out of aggressive pruning.

## Operational notes
- Never replace good cached market data with failed provider responses.
- During provider outage, prefer cached/stale data with explicit degraded labels.
- Rate-limit pressure should trigger slower refresh cadence before dropping data entirely.

