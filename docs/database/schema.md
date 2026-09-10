# Database Schema Reference — `app`

## Purpose
This is the authoritative reference for every table in the Aurox Intelligence Postgres database. The system runs on **raw Postgres** through the `postgres` driver (no ORM). All application tables live in the **`app`** schema and all SQL is owned exclusively by `packages/db`. Migrations are plain SQL applied in lexical filename order by `packages/db/scripts/migrate.mjs`.

This doc is grounded directly in `packages/db/src/migrations/0001…0015` and the repository files in `packages/db/src/repositories/`. Money and price precision (`NUMERIC(x,y)`) is cited from the SQL as written.

## Conventions
- **Schema:** `app` (created with `create schema if not exists app`). A handful of legacy operational tables live in the default (`public`) schema — flagged below.
- **PK:** mostly `uuid primary key default gen_random_uuid()` (requires `pgcrypto`, enabled in `0001`).
- **Money/Cash:** `NUMERIC(18, 2)` — two-decimal currency.
- **Quantity / price:** `NUMERIC(18, 8)` — eight-decimal precision (supports fractional + crypto).
- **Confidence / score:** `NUMERIC(5,4)` or `NUMERIC(6,4)` (0.0000–1.x), risk/opportunity scores `NUMERIC(6,2)`.
- **Timestamps:** `timestamptz`, defaulting to `now()`.
- **JSON:** `jsonb` (typically `'{}'::jsonb` or `'[]'::jsonb` defaults).
- **CURRENT vs FUTURE:** CURRENT = actively read/written by a repository. FUTURE = table exists but has no active reader yet (audit/forward-looking persistence).

---

## Domain Map (which migration creates what)

| Domain | Tables | Migration(s) | Owning repository |
|---|---|---|---|
| Auth / session | `users`, `auth_accounts`, `sessions`, `verification_tokens` | 0001 (cols extended in 0002) | `auth-repository.ts` |
| Legacy operational (public schema) | `assets`, `observations`, `forecasts`, `ingestion_runs`, `provider_sync` | 0002 | none active (legacy stubs in `src/schema/`) |
| Simulation ledger | `simulation_accounts`, `simulation_portfolios`, `simulation_positions`, `simulation_orders`, `simulation_transactions`, `simulation_snapshots` | 0003 (currency in 0011) | `simulated-trading-repository.ts` |
| Preferences / watchlist | `user_dashboard_presets`, `user_watchlist_items` | 0004 (expanded 0006) | `user-preferences-repository.ts` |
| Market intelligence insights | `market_intelligence_insights` | 0004 | `market-intelligence-repository.ts` |
| Market cache (assets + quotes + bars) | `market_assets`, `market_quote_snapshots`, `market_daily_bars` | 0005 (indexes 0014) | `asset-repository.ts`, `market-data-repository.ts` |
| Provider market extensions | `market_asset_profiles`, `crypto_global_metrics` | 0006 (provider) | `market-data-repository.ts` |
| Simulation sessions / lanes | `simulation_sessions` | 0007 | `simulation-session-repository.ts` |
| AI agent audit | `simulation_agent_decisions`, `simulation_agent_order_links`, `simulation_agent_daily_usage` | 0008 (metadata 0009) | `simulated-trading-repository.ts` |
| Provider monitor configs | `provider_monitor_configs` | 0010 | `provider-monitor-config-repository.ts` |
| Intelligence memory / traces | `asset_snapshots`, `lane_snapshots`, `signal_decision_traces`, `broker_decision_traces`, `news_items`, `news_impact_traces`, `report_artifacts`, `intelligence_memory_chunks` | 0011 | `intelligence-memory-repository.ts` |
| Observation events | `observation_events`, `observation_event_states` | 0012 (indexes 0014) | `observation-events-repository.ts` |
| Alert center | `alerts`, `alert_states` | 0013 (indexes 0014) | `alerts-repository.ts` |
| News intelligence snapshots | `news_articles`, `news_intelligence_snapshots`, `news_asset_links` | 0015 | `news-intelligence-repository.ts` |
| Migration tracking | `schema_migrations` | created by `migrate.mjs` | migrate script |

---

## Simulation Ledger — ER Overview

The simulation engine is a serious append-and-snapshot financial ledger, not a mock. Relationships:

```
app.users (1) ──< (1) app.simulation_accounts
                          │ 1
                          ▼
                  app.simulation_portfolios (1 per account)
                          │ 1
                          ├──< app.simulation_positions   (unique per portfolio_id+asset_id)
                          │
app.simulation_accounts ──┼──< app.simulation_orders      (filled | rejected | cancelled)
                          │           │
                          │           ▼
                          ├──< app.simulation_transactions ─ order_id (set null), position_id (set null)
                          │
                          └──< app.simulation_snapshots    (point-in-time equity rollups)

AI audit overlay:
app.simulation_agent_decisions ──< app.simulation_agent_order_links >── app.simulation_orders
app.simulation_agent_daily_usage  (per user/lane/day notional caps)
app.simulation_sessions ── lane lifecycle (decisions & usage reference session_id)
```

### Ledger invariants (enforced by `simulated-trading-repository.ts`)
- **One account per user:** `simulation_accounts.user_id` is `unique`.
- **One portfolio per account:** `simulation_portfolios.account_id` is `unique`.
- **Append-only audit trail:** orders, transactions, and snapshots are written, never silently mutated; a reset writes a `reset` transaction rather than deleting rows.
- **Transactional multi-table writes:** order fill atomically touches orders + transactions + positions + accounts within a single `db.begin`/transaction.
- **Order state machine:** `simulation_orders.status ∈ {filled, rejected, cancelled}` (orders are recorded at terminal/fill state for market orders). `order_type` is constrained to `market` only.
- **Cash math precision:** all cash/PnL columns are `NUMERIC(18,2)`; quantity/price are `NUMERIC(18,8)`. PnL is computed in SQL, not in the UI.
- **Agent decisions are simulation-only:** `simulation_agent_decisions.simulation_only = true` is a hard CHECK constraint.

---

## Auth / Session (migration 0001, extended 0002)

Owner: `auth-repository.ts` (via `src/schema/*.ts` table-name constants: `app.users`, `app.sessions`, `app.auth_accounts`, `app.verification_tokens`).

### `app.users`
User identity and account status.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `email` | `text` not null **unique** | |
| `password_hash` | `text` | nullable (OAuth-only users) |
| `display_name` | `text` not null | |
| `role` | `text` not null default `'member'` | CHECK `in ('member','admin')` |
| `status` | `text` not null default `'pending_verification'` | CHECK `in ('pending_verification','active','disabled')` |
| `avatar_url`, `email_verified_at`, `last_login_at` | text / timestamptz | |
| `created_at`, `updated_at` | `timestamptz` default `now()` | |

Indexes: `idx_users_status`, `idx_users_email_verified_at`.

### `app.auth_accounts`
External/OAuth provider linkage.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null → `users(id)` ON DELETE CASCADE | |
| `provider`, `provider_account_id` | `text` not null | **unique (provider, provider_account_id)** |
| `provider_email`, `access_token`, `refresh_token` | `text` | |
| `token_expires_at` | `timestamptz` | |
| `metadata` | `jsonb` default `'{}'` | |

Indexes: `idx_auth_accounts_user_id`, `idx_auth_accounts_provider_email`.

### `app.sessions`
Server session tokens.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null → `users(id)` CASCADE | |
| `session_token_hash` | `text` not null **unique** | hashed token |
| `expires_at` | `timestamptz` not null | |
| `revoked_at`, `last_seen_at` | `timestamptz` | |
| `ip_address`, `user_agent` | `text` | |

Indexes: `idx_sessions_user_id`, `idx_sessions_expires_at`, `idx_sessions_revoked_at`, `idx_sessions_user_active(user_id, revoked_at, expires_at)`.

### `app.verification_tokens`
Email verification / password reset / magic link tokens.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` → `users(id)` CASCADE | nullable |
| `email` | `text` not null | |
| `token_hash` | `text` not null **unique** | |
| `type` | `text` not null | CHECK `in ('email_verification','password_reset','magic_link','email_change')` |
| `expires_at` | `timestamptz` not null | |
| `used_at` | `timestamptz` | |

Indexes: `idx_verification_tokens_email_type`, `_user_id`, `_expires_at`, `_used_at`.

---

## Legacy Operational (migration 0002, default/`public` schema)

These tables were created **without** the `app.` prefix and have no active repository querying them (only inert table-name constants in `src/schema/`). Treat as **LEGACY / FUTURE** ingestion scaffolding.

| Table | Key columns / precision | Notes |
|---|---|---|
| `assets` | `id text` PK, `symbol text unique`, `asset_class` CHECK `in ('stock','fx')` | distinct from `app.market_assets` |
| `observations` | OHLCV: `open/high/low/close numeric(18,6)`, `volume numeric(24,6)`, `close` not null | `asset_id → assets(id)` CASCADE |
| `forecasts` | `confidence_score numeric(5,4)`, `horizon` CHECK `('short','medium','long')`, `directional_bias` CHECK `('bullish','bearish','neutral')` | |
| `ingestion_runs` | `status` CHECK `('pending','running','succeeded','failed')` | |
| `provider_sync` | `status` CHECK `('ok','warning','failed')` | |

> NOTE: live market data is served from the `app.market_*` cache tables (0005/0006), not from these legacy tables.

---

## Simulation Ledger (migration 0003; base currency widened in 0011)

Owner: `simulated-trading-repository.ts`.

### `app.simulation_accounts`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null **unique** → `users(id)` CASCADE | one account per user |
| `base_currency` | `text` default `'EUR'` (was `'USD'` in 0003) | CHECK `in ('USD','EUR')` after 0011 |
| `initial_cash_balance` | `numeric(18,2)` default `100000` | |
| `cash_balance` | `numeric(18,2)` default `100000` | live cash |
| `realized_pnl` | `numeric(18,2)` default `0` | |
| `allow_negative_balance` | `boolean` default `false` | |

Index: `idx_simulation_accounts_user_id`.

### `app.simulation_portfolios`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `account_id` | `uuid` not null **unique** → `simulation_accounts(id)` CASCADE | one portfolio per account |
| `name` | `text` default `'Primary simulation portfolio'` | |

### `app.simulation_positions`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `portfolio_id` | `uuid` not null → `simulation_portfolios(id)` CASCADE | |
| `asset_id`, `symbol`, `asset_class` | `text` not null | `asset_class` CHECK `in ('stock','etf','crypto')` |
| `quantity` | `numeric(18,8)` default `0` | |
| `average_cost` | `numeric(18,8)` default `0` | cost basis |
| `realized_pnl` | `numeric(18,2)` default `0` | |
| `opened_at`, `closed_at` | `timestamptz` | |
| | | **unique (portfolio_id, asset_id)** |

Indexes: `idx_simulation_positions_portfolio_id`, `idx_simulation_positions_symbol`.

### `app.simulation_orders`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `account_id` | `uuid` not null → `simulation_accounts(id)` CASCADE | |
| `portfolio_id` | `uuid` not null → `simulation_portfolios(id)` CASCADE | |
| `asset_id`, `symbol`, `asset_class` | `text` not null | CHECK `('stock','etf','crypto')` |
| `side` | `text` not null | CHECK `in ('buy','sell')` |
| `status` | `text` not null | CHECK `in ('filled','rejected','cancelled')` |
| `order_type` | `text` default `'market'` | CHECK `in ('market')` — market only |
| `quantity`, `requested_price`, `executed_price` | `numeric(18,8)` not null | |
| `gross_amount`, `cash_effect` | `numeric(18,2)` not null | |
| `realized_pnl` | `numeric(18,2)` default `0` | |
| `notes` | `text` | |
| `executed_at` | `timestamptz` default `now()` | |

Index: `idx_simulation_orders_account_created_at(account_id, created_at desc)`.

### `app.simulation_transactions`
Append-only cash/asset ledger entries; the auditable trail behind every position change.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `account_id` | `uuid` not null → `simulation_accounts(id)` CASCADE | |
| `portfolio_id` | `uuid` not null → `simulation_portfolios(id)` CASCADE | |
| `order_id` | `uuid` → `simulation_orders(id)` ON DELETE **SET NULL** | preserves trail if order removed |
| `position_id` | `uuid` → `simulation_positions(id)` ON DELETE **SET NULL** | |
| `transaction_type` | `text` not null | CHECK `in ('initial_funding','buy','sell','reset')` |
| `asset_id`, `symbol`, `asset_class` | `text` nullable | `asset_class` CHECK null-or `('stock','etf','crypto')` |
| `quantity`, `price` | `numeric(18,8)` nullable | |
| `gross_amount`, `fee_amount` | `numeric(18,2)` default `0` | |
| `cash_delta` | `numeric(18,2)` not null | signed cash movement |
| `realized_pnl` | `numeric(18,2)` default `0` | |
| `description` | `text` not null | |

Index: `idx_simulation_transactions_account_created_at(account_id, created_at desc)`.

### `app.simulation_snapshots`
Point-in-time portfolio equity rollups (post-fill / scheduled / reset).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `account_id`, `portfolio_id` | `uuid` not null (CASCADE) | |
| `cash_balance`, `market_value`, `equity_value` | `numeric(18,2)` not null | |
| `unrealized_pnl`, `realized_pnl` | `numeric(18,2)` not null | |
| `position_count` | `integer` not null | |
| `taken_at` | `timestamptz` default `now()` | |

Index: `idx_simulation_snapshots_account_taken_at(account_id, taken_at desc)`.

---

## Simulation Sessions / Lanes (migration 0007)

Owner: `simulation-session-repository.ts`.

### `app.simulation_sessions`
Lifecycle of a simulation lane run.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null → `users(id)` CASCADE | |
| `lane_id` | `text` not null | CHECK `in ('manual_stock_lane','manual_multi_asset_lane','ai_copilot_lane','signal_follow_lane','agent_sandbox_lane')` |
| `lane_mode` | `text` not null | CHECK `in ('manual','ai-assisted','strategy')` |
| `status` | `text` default `'draft'` | CHECK `('draft','starting','running','paused','stopping','stopped','completed','failed')` |
| `observation_status` | `text` default `'idle'` | CHECK `('idle','warming','watching','degraded','error')` |
| `asset_scope` | `text` default `'stock'` | CHECK `('stock','etf','crypto','multi-asset')` |
| `max_capital_usd` | `numeric(18,2)` default `0` | |
| `micro_allocation_percent` | `numeric(6,2)` default `0` | |
| `decision_source` | `text` default `'manual_ui'` | CHECK `('manual_ui','ai_assisted','automation')` |
| heartbeat/lifecycle | `last_heartbeat_at`, `started_at`, `paused_at`, `stopped_at`, `completed_at`, `failed_at`, `last_error`, `last_opened_at` | |

Indexes: `idx_simulation_sessions_user_updated_at`; **`uq_simulation_sessions_user_lane_active`** — partial unique index on `(user_id, lane_id)` WHERE status is active (`draft/starting/running/paused/stopping`), preventing two concurrent active sessions per lane per user.

---

## AI Agent Audit (migration 0008; metadata in 0009)

Owner: `simulated-trading-repository.ts` (decisions + order links). `simulation_agent_daily_usage` is **FUTURE** — created but no active repository reader.

### `app.simulation_agent_decisions`
Auditable record of every AI-proposed/autonomous simulation decision. Simulation-only is constraint-enforced.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null → `users(id)` CASCADE | |
| `session_id` | `uuid` → `simulation_sessions(id)` SET NULL | |
| `lane_id` | `text` | CHECK null-or one of the five lane ids |
| `autonomy_mode` | `text` not null | CHECK `('suggest_only','human_confirmed','autonomous_simulation')` |
| `mode_id` | `text` not null | |
| `request_context`, `ranked_assets`, `decision_payload` | `jsonb` | |
| `decision_action` | `text` not null | CHECK `('HOLD','PROPOSE_BUY','PROPOSE_SELL','SIMULATED_BUY_REQUEST','SIMULATED_SELL_REQUEST')` |
| `simulation_only` | `boolean` default `true` | **CHECK `simulation_only = true`** (hard live-trading lock) |
| `requires_human_confirmation` | `boolean` default `true` | |
| `max_notional_per_trade`, `max_daily_notional`, `max_open_exposure` | `numeric(18,2)` default `0` | CHECK `>= 0` |
| `used_daily_notional`, `proposed_notional` | `numeric(18,2)` nullable | CHECK null-or `>= 0` |
| `cap_check_status` | `text` default `'not_applicable'` | CHECK `('not_applicable','passed','rejected','failed')` |
| `execution_intent_status` | `text` default `'not_submitted'` | CHECK `('not_submitted','submitted','rejected_by_cap','rejected_by_risk','rejected_read_only','error')` |
| `error_code`, `error_message`, `cap_check_reason` | `text` | |
| **0009 added** | `account_id`, `portfolio_id`, `mode` (not null, default `'suggest_only'`), `action` (not null, default `'HOLD'`), `symbol`, `asset_class`, `confidence numeric`, `ranked_snapshot_hash`, `decision_json jsonb` (not null), `rejected_reason` | backfilled from legacy columns |

Indexes: by `(user_id, requested_at)`, `(session_id, requested_at)`, `(lane_id, requested_at)`, `(decision_action)`, plus 0009 `(user_id, created_at)` and `(user_id, lane_id, created_at)`.

### `app.simulation_agent_order_links`
Links agent decisions to the simulation orders they produced.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `decision_id` | `uuid` not null → `simulation_agent_decisions(id)` CASCADE | |
| `order_id` | `uuid` not null → `simulation_orders(id)` CASCADE | |
| `link_type` | `text` not null | CHECK `in ('autonomous_submission','human_confirmation')` |
| | | **unique (decision_id, order_id)** |
| **0009 added** | `simulation_order_id` (not null), `user_id text` (not null), `account_id`, `portfolio_id`, `session_id`, `lane_id`, `notional numeric` (default 0) | backfilled from orders/decisions |

Indexes: `(order_id)`, `(decision_id)`, partial-aware unique on `(decision_id, simulation_order_id)`, plus 0009 `(user_id, created_at)` and `(user_id, lane_id, created_at)`.

### `app.simulation_agent_daily_usage` (FUTURE)
Per-user/lane/day notional usage accounting for cap enforcement.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null → `users(id)` CASCADE | |
| `session_id` | `uuid` → `simulation_sessions(id)` SET NULL | |
| `lane_id` | `text` | CHECK null-or one of five lanes |
| `usage_date` | `date` not null | |
| `strategy_tag`, `source` | `text` not null | `source` CHECK `('ai_suggested','ai_autonomous')` |
| `notional_used` | `numeric(18,2)` default `0` | CHECK `>= 0` |
| `order_count` | `integer` default `0` | CHECK `>= 0` |
| `last_order_at` | `timestamptz` | |

Indexes: composite **unique** `ux_sim_agent_daily_usage_scope` over `(user_id, usage_date, strategy_tag, source, coalesce(session_id,…), coalesce(lane_id,'__all__'))`; plus `(user_id, usage_date)`, `(session_id, usage_date)`.

---

## Preferences / Watchlist (migration 0004; expanded 0006)

Owner: `user-preferences-repository.ts`.

### `app.user_dashboard_presets`
| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` **PK** → `users(id)` CASCADE | one row per user |
| `locale` | `text` default `'en'` | CHECK `('en','de','fr')` |
| `default_chart_type` | `text` default `'trend'` | CHECK `('bar','donut','comparison','trend','stock')` |
| `default_time_period` | `text` default `'1mo'` | CHECK over `1s…5y` set |
| `tracked_symbols`, `visible_modules` | `jsonb` default `'[]'` | |
| **0006 added** | `simulation_preferences jsonb` default `'{}'`, `activity_preferences jsonb` default `'{}'` | backfilled with broker-mode defaults |

### `app.user_watchlist_items`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` not null → `users(id)` CASCADE | |
| `asset_id`, `symbol`, `asset_class` | `text` not null | `asset_class` CHECK `('stock','etf','crypto','fx')` |
| `added_at` | `timestamptz` not null | |
| | | **unique (user_id, asset_id)** |

Index: `idx_user_watchlist_items_user_id(user_id, added_at desc)`.

---

## Market Intelligence Insights (migration 0004, `public` schema)

Owner: `market-intelligence-repository.ts` (table name constant `market_intelligence_insights`; persists batches inside a transaction, tolerates missing-schema error `42P01`/`42703`).

### `market_intelligence_insights`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `asset_id`, `symbol`, `headline`, `summary`, `what_changed` | `text` not null | |
| `stance` | `text` not null | CHECK `('positive','negative','neutral')` |
| `confidence_score` | `numeric(5,4)` not null | |
| `factors`, `risk_flags` | `jsonb` default `'[]'` | |
| `provenance` | `jsonb` not null | |
| `generated_at` | `timestamptz` not null | |

Indexes: `(symbol, generated_at desc)`, `(asset_id, generated_at desc)`.

---

## Market Cache (migration 0005; perf indexes 0014)

Owners: `asset-repository.ts` (`market_assets`), `market-data-repository.ts` (quotes/bars/profiles/metrics).

### `app.market_assets`
Curated tradable/simulated universe (seeded with ~21 assets in 0005).

| Column | Type | Notes |
|---|---|---|
| `asset_id` | `text` **PK** | |
| `symbol` | `text` not null **unique** | |
| `name`, `category`, `thesis`, `risk_summary` | `text` not null | |
| `asset_class` | `text` not null | CHECK `('stock','etf','crypto','fx','index')` |
| `geography`, `sector` | `text` | |
| `action_availability` | `text` default `'planned'` | CHECK `('available','simulated','planned','unavailable')` |
| `is_simulated`, `is_tradable` | `boolean` default `false` | |

Indexes: `(asset_class)`, `(asset_class, is_tradable)`. Seed uses `on conflict (asset_id) do update` (idempotent upsert).

### `app.market_quote_snapshots`
Latest-quote cache, keyed by symbol (one row per symbol).

| Column | Type | Notes |
|---|---|---|
| `symbol` | `text` **PK** | |
| `asset_id` | `text` | |
| `price`, `change_amount`, `change_percent` | `numeric(18,8)` nullable | |
| `source` | `text` not null | provider name |
| `observed_at` | `timestamptz` | quote time |
| `fetched_at` | `timestamptz` default `now()` | cache write time (freshness) |

Indexes: `(observed_at desc)`; 0014 adds `(source, fetched_at desc)`.

### `app.market_daily_bars`
Daily OHLCV cache.

| Column | Type | Notes |
|---|---|---|
| `symbol`, `observed_on date` | **composite PK (symbol, observed_on)** | |
| `open/high/low/close` | `numeric(18,8)` not null | |
| `volume` | `numeric(20,2)` nullable | |
| `source` | `text` not null | |
| `fetched_at` | `timestamptz` default `now()` | |

Indexes: `(symbol, observed_on desc)`; 0014 adds `(symbol, source, observed_on desc)` and `(fetched_at desc)`.

---

## Provider Market Extensions (migration 0006 provider)

Owner: `market-data-repository.ts`.

### `app.market_asset_profiles`
| Column | Type | Notes |
|---|---|---|
| `symbol` | `text` **PK** | |
| `asset_id` | `text` | |
| `asset_class` | `text` not null | CHECK `('stock','etf','crypto')` |
| `name` | `text` not null | |
| `exchange`, `currency`, `description`, `sector`, `industry`, `country`, `website_url`, `logo_url` | `text` | |
| `market_cap` | `numeric(22,2)` | |
| `source` | `text` not null | |
| `updated_at` | `timestamptz` not null | |
| `fetched_at` | `timestamptz` default `now()` | |

Index: `(fetched_at desc)`.

### `app.crypto_global_metrics`
Global crypto market aggregates, keyed by observation timestamp.

| Column | Type | Notes |
|---|---|---|
| `observed_at` | `timestamptz` **PK** | |
| `active_cryptocurrencies`, `markets` | `integer` | |
| `total_market_cap_usd`, `total_volume_24h_usd` | `numeric(24,2)` | |
| `bitcoin_dominance_percent`, `ethereum_dominance_percent`, `market_cap_change_24h_percent` | `numeric(12,4)` | |
| `source` | `text` not null | |

Index: `(observed_at desc)`.

---

## Intelligence Memory / Traces (migration 0011)

Owner: `intelligence-memory-repository.ts` (pruning + reads). See also `docs/database/intelligence-memory.md`. Default 90-day retention via `pruneIntelligenceMemory(retentionDays)`.

Migration 0011 also widens `simulation_accounts.base_currency` to allow `'EUR'` (default changed to EUR) — see the simulation ledger section.

All trace/snapshot tables share the canonical explainable-trace shape: `source_type`, `source_id`, `asset_ids jsonb`, `symbols jsonb`, `time_window_start/end`, `metrics jsonb`, `explanation text` (not null), `confidence numeric(5,4)` default 0, `version_hash text` (not null), `created_at`. Each has an index on `(created_at desc)`.

| Table | Distinguishing columns | Status |
|---|---|---|
| `app.asset_snapshots` | canonical trace shape | CURRENT |
| `app.lane_snapshots` | + `lane_id text` not null | CURRENT |
| `app.signal_decision_traces` | canonical trace shape | CURRENT |
| `app.broker_decision_traces` | canonical trace shape | CURRENT |
| `app.news_impact_traces` | canonical trace shape | CURRENT |
| `app.report_artifacts` | + `artifact_type text` | CURRENT |
| `app.intelligence_memory_chunks` | + `chunk_type text` | CURRENT |
| `app.news_items` | `id text` PK, `title`, `source`, `url`, `published_at`, `summary`, `sentiment_score numeric(6,4)`, `relevance_score numeric(6,4)`, `risk_tags jsonb`, `extracted_entities jsonb`, `version_hash` | **FUTURE** (no active reader; superseded by 0015 `news_articles`) |

---

## Observation Events (migration 0012; indexes 0014)

Owner: `observation-events-repository.ts`.

### `app.observation_events`
Deduplicated system observations feeding the alert pipeline.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `workspace_id`, `user_id`, `asset_id`, `symbol`, `asset_class` | uuid/text nullable | |
| `source`, `event_type`, `severity`, `title`, `description` | `text` not null | |
| `confidence` | `numeric(6,4)` | |
| `score` | `numeric(8,4)` | |
| `related_signal_id` / `_news_id` / `_risk_id` / `_decision_id` / `_order_id` | `text` | cross-domain refs |
| `metadata` | `jsonb` default `'{}'` | |
| `fingerprint`, `bucket_hour` | `text` / `timestamptz` not null | dedupe key pair |
| `observed_at` | `timestamptz` not null | |

Indexes: **unique** `(fingerprint, bucket_hour)` dedupe; `(observed_at desc)`; `(source)`; `(symbol)`; 0014 adds `(source, severity, observed_at desc)`.

### `app.observation_event_states`
Per-user read/pin/dismiss state.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `event_id` | `uuid` not null → `observation_events(id)` CASCADE | |
| `user_id` | `uuid` not null | |
| `is_read`, `is_pinned`, `is_dismissed` | `boolean` default `false` | |
| | | **unique (event_id, user_id)** |

Index: `(user_id, updated_at desc)`.

---

## Alert Center (migration 0013; indexes 0014)

Owner: `alerts-repository.ts`.

### `app.alerts`
Deduplicated, cooldown-bucketed alerts (optionally promoted from observation events).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `observation_event_id` | `uuid` → `observation_events(id)` SET NULL | |
| `workspace_id`, `user_id`, `asset_id`, `symbol`, `asset_class` | uuid/text nullable | |
| `source`, `category`, `severity`, `title`, `description` | `text` not null | |
| `confidence` | `numeric(6,4)` | |
| `score` | `numeric(8,4)` | |
| `status` | `text` default `'OPEN'` | |
| `dedupe_key`, `cooldown_bucket` | `text` not null | |
| `dedupe_scope` | `text` default `'global'` | |
| `metadata` | `jsonb` default `'{}'` | |
| `first_seen_at`, `last_seen_at` | `timestamptz` not null | |

Indexes: **unique** `(dedupe_key, cooldown_bucket, dedupe_scope)`; `(symbol)`; `(last_seen_at desc)`; 0014 adds `(source, severity, last_seen_at desc)`.

### `app.alert_states`
Per-user alert status / snooze.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `alert_id` | `uuid` not null → `alerts(id)` CASCADE | |
| `user_id` | `uuid` not null | |
| `status` | `text` default `'OPEN'` | |
| `snoozed_until` | `timestamptz` | |
| | | **unique (alert_id, user_id)** |

Indexes: `(user_id, updated_at desc)`; 0014 adds `(status, updated_at desc)`.

---

## News Intelligence Snapshots (migration 0015)

Owner: `news-intelligence-repository.ts`. This is the CURRENT news pipeline (supersedes legacy `news_items`).

### `app.news_articles`
Deduplicated raw news articles.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `provider`, `title`, `url`, `source_name` | `text` not null | |
| `provider_article_id` | `text` | |
| `published_at`, `fetched_at` | `timestamptz` not null | |
| `language`, `summary` | `text` | |
| `content_hash` | `text` not null **unique** | dedupe |
| `raw_metadata` | `jsonb` default `'{}'` | |

Indexes: partial unique `(provider, provider_article_id)` where not null; unique `(provider, url)`; `(published_at desc)`; `(content_hash)`.

### `app.news_intelligence_snapshots`
AI-derived scoring/explanation per article.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `article_id` | `uuid` not null → `news_articles(id)` CASCADE | |
| `content_hash` | `text` not null | |
| `sentiment_score`, `relevance_score`, `urgency_score`, `novelty_score`, `confidence` | `numeric(6,4)` not null | |
| `sentiment_label` | `text` not null | |
| `risk_score`, `opportunity_score` | `numeric(6,2)` not null | |
| `market_impact_horizon` | `text` default `'unknown'` | |
| `entities`, `topics`, `event_types`, `affected_signals`, `affected_risk_factors`, `decision_hints`, `explanation` | `jsonb` default `'[]'` | |
| `extracted_indicators` | `jsonb` default `'{}'` | |

Indexes: `(created_at desc)`, `(risk_score desc)`, `(urgency_score desc)`, **GIN** on `event_types`, `topics`, `entities`.

### `app.news_asset_links`
Maps articles/snapshots to affected assets.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `article_id` | `uuid` not null → `news_articles(id)` CASCADE | |
| `snapshot_id` | `uuid` → `news_intelligence_snapshots(id)` CASCADE | |
| `asset_id` | `text` | |
| `symbol`, `asset_class` | `text` not null | |
| `relevance_score`, `impact_score` | `numeric(6,4)` default `0` | |

Indexes: `(symbol, created_at desc)`, `(asset_class, created_at desc)`, `(article_id, snapshot_id)`.

---

## Provider Monitor Configs (migration 0010)

Owner: `provider-monitor-config-repository.ts`.

### `app.provider_monitor_configs`
| Column | Type | Notes |
|---|---|---|
| `id` | `text` **PK** | |
| `provider_key`, `provider_name`, `category` | `text` not null | |
| `enabled`, `monitor_health`, `monitor_latency`, `monitor_errors`, `display_in_dashboard` | `boolean` default `true` | |
| `monitor_quota` | `boolean` default `false` | |
| `alert_threshold_ms`, `failure_threshold` | `integer` nullable | |

No additional indexes beyond PK.

---

## Migration Tracking

### `app.schema_migrations`
Created by `migrate.mjs` (not in a `.sql` file).

| Column | Type | Notes |
|---|---|---|
| `id` | `text` **PK** | migration filename |
| `applied_at` | `timestamptz` default `now()` | |

---

## Safety Notes
- **DB absence boots safely:** repositories check `client.isConfigured`; when `DATABASE_URL` is unset, writes are skipped with a typed "not persisted" result rather than crashing.
- **No SQL outside `packages/db`.** All tables here are accessed only through the listed repositories.
- **Simulation is the only execution target.** No live-trading table exists; `simulation_agent_decisions.simulation_only = true` is constraint-enforced.
- **Append-only audit posture** across orders, transactions, snapshots, agent decisions, observation events, and alerts; resets are logged, not destructive deletes.
