# Database Migrations Catalog

## Purpose
This catalogs every plain-SQL migration in `packages/db/src/migrations/`, in application order, with what each one creates/alters, a reversibility note, and the owning domain. It also documents the migration runner and the additive-preferred / rollback-comment policy.

The database is **raw Postgres** (driver `postgres`, no ORM). Schema is `app`. There are **16 migration files** numbered `0001…0015` — note that **two files share the `0006` prefix** (`0006_account_preference_expansion.sql` and `0006_provider_market_extensions.sql`), so the on-disk count is 16 even though the highest sequence number is 15.

---

## How Migrations Are Applied

Run:

```bash
node packages/db/scripts/migrate.mjs
```

Runner behavior (`packages/db/scripts/migrate.mjs`):

1. Loads env via `@next/env` from repo root. Connection precedence:
   `DATABASE_URL_UNPOOLED` → `DIRECT_URL` → `DATABASE_URL`.
   (Migrations require a **direct/unpooled** Postgres connection; runtime can use the pooled `DATABASE_URL`.) If none is set, the script throws.
2. Opens a single connection (`max: 1`, `prepare: false`).
3. Ensures `create schema if not exists app` and a tracking table `app.schema_migrations (id text primary key, applied_at timestamptz default now())`.
4. Reads `*.sql` files from `packages/db/src/migrations/`, **sorts by filename** (`localeCompare`), and for each unapplied file:
   - Runs the entire file body inside `sql.begin(...)` (one transaction per migration) via `transaction.unsafe(statement)`.
   - On success, inserts the filename into `app.schema_migrations`.
5. Already-applied files (present in `schema_migrations`) are skipped — the runner is **idempotent / re-runnable**.

### Ordering note (the two 0006 files)
Because ordering is pure lexical filename sort, `0006_account_preference_expansion.sql` runs **before** `0006_provider_market_extensions.sql` (`a` < `p`). Both depend only on tables created earlier (`user_dashboard_presets` from 0004, and no dependency for the provider tables), so the relative order between them is safe either way.

---

## Migration Policy (per `.claude/rules`)

- **Additive preferred.** New tables and **nullable** columns added with `if not exists`. Existing files use `create table if not exists`, `add column if not exists`, and `create index if not exists` so re-application and partial states are safe.
- **Each migration runs in its own transaction.** A failing file rolls back fully; it is not recorded as applied.
- **Rollback comments expected** for schema-changing migrations. NOTE: the current 0001–0015 files predate the rollback-comment rule and do **not** carry inline `-- Rollback:` comments — the per-migration reversibility is documented in the table below instead. New migrations going forward must include an inline rollback comment and flag any destructive change.
- **Destructive changes require an explicit note + backup strategy.** The only constraint-dropping migration here (`0011`, dropping/replacing a CHECK on `simulation_accounts.base_currency`) is non-data-destructive (widens the allowed set).
- **Backfills must be idempotent.** Data backfills in `0006_account` and `0009` are guarded with `coalesce(...)` and `where … is null` predicates so re-runs are no-ops.

---

## Catalog

| # | File | Domain | Creates / Alters | Reversibility |
|---|---|---|---|---|
| 1 | `0001_auth_session_neon.sql` | Auth/session | `create schema app`; enable `pgcrypto`; create `app.users`, `app.auth_accounts`, `app.sessions`, `app.verification_tokens` (+ `add column if not exists` guards, CHECK constraints, indexes) | Easy — drop the four tables (no prior data). Schema/extension are shared, leave in place. |
| 2 | `0002_runtime_operational_schema.sql` | Auth backfill + legacy operational | `alter table` adds late columns to the auth tables; creates **public-schema** legacy tables `assets`, `observations` (OHLCV `numeric(18,6)`), `forecasts` (`confidence_score numeric(5,4)`), `ingestion_runs`, `provider_sync` + indexes | Easy — drop the five legacy tables; column adds are nullable/defaulted and harmless to retain. |
| 3 | `0003_simulation_trading_schema.sql` | Simulation ledger | Create `app.simulation_accounts`, `_portfolios`, `_positions`, `_orders`, `_transactions`, `_snapshots` (money `numeric(18,2)`, qty/price `numeric(18,8)`; FKs, CHECKs, uniques, indexes) | Easy structurally — drop tables in FK order. In practice **append-only ledger**: do not drop with live simulation data without archival. |
| 4 | `0004_preferences_and_intelligence_persistence.sql` | Preferences + insights | Create `app.user_dashboard_presets` (PK = user_id), `app.user_watchlist_items`, and public-schema `market_intelligence_insights` (`confidence_score numeric(5,4)`) + indexes | Easy — drop the three tables. |
| 5 | `0005_stock_market_cache.sql` | Market cache | Create `app.market_assets`, `app.market_quote_snapshots` (price `numeric(18,8)`), `app.market_daily_bars` (OHLCV `numeric(18,8)`, composite PK) + indexes; **seed ~21 `market_assets` rows** via `insert … on conflict do update` | Easy — drop tables. Seed is idempotent upsert (re-runnable). |
| 6a | `0006_account_preference_expansion.sql` | Preferences expansion | `add column if not exists simulation_preferences jsonb`, `activity_preferences jsonb` to `user_dashboard_presets`; idempotent backfill of broker-mode defaults | Easy — drop the two columns. Backfill is guarded (`where … = '{}'`). |
| 6b | `0006_provider_market_extensions.sql` | Provider market data | Create `app.market_asset_profiles` (`market_cap numeric(22,2)`), `app.crypto_global_metrics` (`numeric(24,2)` caps, `numeric(12,4)` dominance) + indexes | Easy — drop the two tables. |
| 7 | `0007_simulation_sessions.sql` | Simulation lanes | Create `app.simulation_sessions` (lane/status/observation CHECKs); index `(user_id, updated_at)` + **partial unique** `uq_simulation_sessions_user_lane_active` (active statuses only) | Easy — drop table + indexes. |
| 8 | `0008_ai_simulation_agent_audit_tables.sql` | AI agent audit | Create `app.simulation_agent_decisions` (hard CHECK `simulation_only = true`, notional `numeric(18,2)`), `app.simulation_agent_order_links` (unique decision+order), `app.simulation_agent_daily_usage` (composite unique scope) + indexes | Easy — drop three tables. |
| 9 | `0009_ai_simulation_agent_audit_metadata_v1.sql` | AI agent audit (v1 metadata) | `alter` adds metadata columns to `simulation_agent_decisions` (`mode`, `action`, `decision_json`, `confidence numeric`, …) and `simulation_agent_order_links` (`simulation_order_id`, `user_id`, `notional`, …); idempotent backfills (`coalesce`); promotes some columns to `not null`; conditional unique index via `do $$ … $$` | Medium — drop the added columns. **Not** plainly reversible once `not null` is enforced if pre-existing rows lacked values; backfill makes forward-apply safe. |
| 10 | `0010_provider_monitor_configs.sql` | Provider monitor | Create `app.provider_monitor_configs` (`id text` PK, boolean monitor flags, nullable `integer` thresholds) | Easy — drop table. |
| 11 | `0011_intelligence_memory_and_currency.sql` | Currency + intelligence memory | **Drops & re-adds** CHECK on `simulation_accounts.base_currency` (default → `'EUR'`, allow `USD`/`EUR`); creates 8 trace/memory tables: `asset_snapshots`, `lane_snapshots`, `signal_decision_traces`, `broker_decision_traces`, `news_items`, `news_impact_traces`, `report_artifacts`, `intelligence_memory_chunks` (`confidence numeric(5,4)`) + `(created_at)` indexes | Medium — the CHECK swap is reversible (re-add USD-only) but would conflict with EUR rows; trace tables drop cleanly. **Only constraint-altering migration.** |
| 12 | `0012_observation_events.sql` | Observation events | Create `app.observation_events` (`confidence numeric(6,4)`, `score numeric(8,4)`, **unique** `(fingerprint, bucket_hour)` dedupe) and `app.observation_event_states` (unique `(event_id, user_id)`) + indexes | Easy — drop two tables. |
| 13 | `0013_alert_center.sql` | Alert center | Create `app.alerts` (**unique** `(dedupe_key, cooldown_bucket, dedupe_scope)`) and `app.alert_states` (unique `(alert_id, user_id)`) + indexes | Easy — drop two tables. |
| 14 | `0014_market_cache_perf_indexes.sql` | Performance | Adds composite indexes only on `market_quote_snapshots`, `market_daily_bars`, `observation_events`, `alerts`, `alert_states` | Easy & safe — index-only, `if not exists`. Drop the added indexes to revert. |
| 15 | `0015_news_intelligence_snapshots.sql` | News intelligence | Create `app.news_articles` (`content_hash` unique), `app.news_intelligence_snapshots` (`numeric(6,4)` scores, `risk/opportunity numeric(6,2)`), `app.news_asset_links` + B-tree and **GIN** indexes | Easy — drop three tables (FK order: links → snapshots → articles). |

---

## Reversibility Quick Reference

| Reversibility | Migrations |
|---|---|
| Easy (drop new tables / nullable columns / indexes) | 0001, 0002, 0003, 0004, 0005, 0006a, 0006b, 0007, 0008, 0010, 0012, 0013, 0014, 0015 |
| Medium (column `not null` promotion + backfill, or CHECK swap) | 0009, 0011 |
| Destructive | _none_ (no table/column drops in 0001–0015) |

> The only `drop constraint` is in `0011` (replacing the `base_currency` CHECK to widen `USD` → `USD`/`EUR`). It does not drop data or columns.

---

## Adding a New Migration (checklist)

1. Name it `00NN_short_description.sql` with the next sequence number; the runner orders by filename, so keep zero-padding consistent.
2. Prefer **additive** SQL: `create table if not exists`, `add column if not exists` (nullable or defaulted), `create index if not exists`.
3. Put **all** statements for the migration in the one file — the runner wraps each file in a single transaction.
4. Include an inline rollback comment at the top, e.g.
   `-- Rollback: drop table if exists app.<table>;` and flag any destructive step with a backup note (per the rollback-notes rule).
5. Make any backfill idempotent (`coalesce`, `where … is null`, `on conflict do update`).
6. Apply with `node packages/db/scripts/migrate.mjs` against a direct/unpooled connection, then `pnpm --filter @repo/db typecheck`.
7. If the migration changes a table's shape, update `docs/database/schema.md` in the same change.

---

## Notes & Surprising Findings

- **Two `0006` files** share the prefix; both apply (ordering: `account` before `provider`).
- **Mixed schemas:** most tables are in `app`, but the legacy operational set (`assets`, `observations`, `forecasts`, `ingestion_runs`, `provider_sync` from 0002) and `market_intelligence_insights` (0004) live in the **default/`public`** schema, not `app`.
- **Two parallel news models exist:** legacy `app.news_items` (0011, FUTURE/no active reader) and the current `app.news_articles` + `app.news_intelligence_snapshots` + `app.news_asset_links` pipeline (0015).
- **`schema_migrations` is created by the runner**, not by a `.sql` file, so it will not appear in the migrations directory.
- No migration ever enables live trading; `simulation_agent_decisions.simulation_only = true` is enforced at the table level (0008).
