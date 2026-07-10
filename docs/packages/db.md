# `@repo/db` — Persistence Package Reference

> Source: [`packages/db/src`](../../packages/db/src)
> Status: **CURRENT** unless explicitly marked FUTURE.

## 1. Purpose & Boundary

`@repo/db` is the **only** place in the monorepo where SQL, repositories, migrations, and
transactions may live. The raw `postgres` driver is imported here and nowhere else.

Boundary rules (see [`.claude/rules/db-boundary.md`](../../.claude/rules/db-boundary.md) and
[`architecture-boundaries.md`](../../.claude/rules/architecture-boundaries.md)):

- All `SELECT` / `INSERT` / `UPDATE` / `DELETE` strings live in `packages/db`.
- Routes (`apps/web/app/**`), components, services, signals, forecasting, and agents
  must call exported repository functions — never query Postgres directly.
- All app tables live in the Postgres `app` schema (the migrate script runs
  `create schema if not exists app`).
- If `DATABASE_URL` is missing, the system **still boots** with a stub client
  (see [§5 Invariants](#5-invariants--rules)).

Consumers import typed repository functions via `@repo/db` (re-exported from
[`src/index.ts`](../../packages/db/src/index.ts)).

## 2. Directory Map

| Path | Responsibility |
| --- | --- |
| [`src/client.ts`](../../packages/db/src/client.ts) | Connection factory, `DatabaseClient` interface, transaction wrapper, **stub-client-when-no-DATABASE_URL** behavior. |
| [`src/index.ts`](../../packages/db/src/index.ts) | Public surface — re-exports client, queries, and all repositories. |
| [`src/repositories/`](../../packages/db/src/repositories) | Typed read/write repositories. One file per domain; each owns specific `app.*` tables. |
| [`src/queries/`](../../packages/db/src/queries) | Composite read-model assembly (`asset-detail-query.ts`, `dashboard-query.ts`). |
| [`src/schema/`](../../packages/db/src/schema) | Table-name constants + row type definitions (e.g. `app.users`, `app.sessions`). |
| [`src/migrations/`](../../packages/db/src/migrations) | Plain-SQL migrations, applied in lexical order. |
| [`scripts/migrate.mjs`](../../packages/db/scripts/migrate.mjs) | Idempotent migration runner (records applied files in `app.schema_migrations`). |

## 3. Public API — Repositories & Tables Owned

Repositories are exported from [`src/index.ts`](../../packages/db/src/index.ts). The table
ownership below was extracted directly from each repository's SQL.

| Repository file | `app.*` tables owned / touched | Uses transaction (`db.begin` / `client.transaction`) |
| --- | --- | --- |
| [`auth-repository.ts`](../../packages/db/src/repositories/auth-repository.ts) | `app.users`, `app.sessions`, `app.auth_accounts`, `app.verification_tokens` (via [`schema/`](../../packages/db/src/schema)) | Yes |
| [`asset-repository.ts`](../../packages/db/src/repositories/asset-repository.ts) | `app.market_assets` | No |
| [`market-data-repository.ts`](../../packages/db/src/repositories/market-data-repository.ts) | `app.market_quote_snapshots`, `app.market_daily_bars`, `app.market_asset_profiles`, `app.crypto_global_metrics` | Yes |
| [`market-intelligence-repository.ts`](../../packages/db/src/repositories/market-intelligence-repository.ts) | `market_intelligence_insights` | Yes |
| [`news-intelligence-repository.ts`](../../packages/db/src/repositories/news-intelligence-repository.ts) | `app.news_articles`, `app.news_asset_links`, `app.news_intelligence_snapshots` | Yes |
| [`intelligence-memory-repository.ts`](../../packages/db/src/repositories/intelligence-memory-repository.ts) | `app.intelligence_memory_chunks`, `app.asset_snapshots`, `app.lane_snapshots`, `app.signal_decision_traces`, `app.broker_decision_traces`, `app.news_impact_traces`, `app.report_artifacts` | No |
| [`simulated-trading-repository.ts`](../../packages/db/src/repositories/simulated-trading-repository.ts) | `app.simulation_accounts`, `app.simulation_portfolios`, `app.simulation_positions`, `app.simulation_orders`, `app.simulation_transactions`, `app.simulation_snapshots`, `app.simulation_sessions`, `app.simulation_agent_decisions`, `app.simulation_agent_order_links`, `app.market_quote_snapshots` | Yes |
| [`simulation-session-repository.ts`](../../packages/db/src/repositories/simulation-session-repository.ts) | `app.simulation_sessions`, `app.market_quote_snapshots` | Yes |
| [`alerts-repository.ts`](../../packages/db/src/repositories/alerts-repository.ts) | `app.alerts`, `app.alert_states` | Yes |
| [`observation-events-repository.ts`](../../packages/db/src/repositories/observation-events-repository.ts) | `app.observation_events`, `app.observation_event_states` | Yes |
| [`provider-monitor-config-repository.ts`](../../packages/db/src/repositories/provider-monitor-config-repository.ts) | `app.provider_monitor_configs` | Yes |
| [`user-preferences-repository.ts`](../../packages/db/src/repositories/user-preferences-repository.ts) | `app.user_dashboard_presets`, `app.user_watchlist_items` | Yes |
| [`investment-universe-repository.ts`](../../packages/db/src/repositories/investment-universe-repository.ts) | **No DB** — static/in-memory canonical investment universe metadata. | No |
| [`linked-investment-accounts-repository.ts`](../../packages/db/src/repositories/linked-investment-accounts-repository.ts) | **No DB** — static stub of connected investment accounts. | No |

Composite read queries:

| Query file | Returns |
| --- | --- |
| [`asset-detail-query.ts`](../../packages/db/src/queries/asset-detail-query.ts) | `getAssetDetail(symbol)` → `AssetDetailReadModel \| null` |
| [`dashboard-query.ts`](../../packages/db/src/queries/dashboard-query.ts) | `getDashboardReadModel()` → `DashboardOperationalReadModel` |

## 4. Key Contracts — `DatabaseClient`

From [`src/client.ts`](../../packages/db/src/client.ts):

```ts
export interface DatabaseClient {
  readonly isConfigured: boolean;           // false in stub mode
  readonly mode: 'postgres' | 'stub';
  readonly databaseUrl: string | null;
  query<T>(statement: string, params?: readonly QueryParam[]): Promise<T[]>;
  execute(statement: string, params?: readonly QueryParam[]): Promise<void>;
  transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T>;
}

export type QueryParam = string | number | boolean | Date | Uint8Array | null;
```

Factory functions:

| Function | Use |
| --- | --- |
| `createDatabaseClient()` | Runtime client (memoized). Returns stub when `DATABASE_URL` absent/invalid. |
| `getDatabase()` | Raw `postgres` `Sql` instance, or `null` when unconfigured. |
| `createMigrationClient()` | Migration-only connection using `DIRECT_URL`/`DATABASE_URL_UNPOOLED`. |
| `resolveMigrationDatabaseUrl()` | Resolves the unpooled URL preference order for migrations. |

The connection pool is created with `max: 1`, `prepare: false`, `idle_timeout: 20`,
`connect_timeout: 30`. Transactions delegate to `postgres`'s `begin`, exposing the same
`DatabaseClient` shape inside the callback.

## 5. Invariants & Rules

- **Schema isolation:** every app table is under `app.` (e.g. `app.simulation_orders`). The
  migrate runner creates the schema and an `app.schema_migrations` ledger.
- **Stub safety:** when `DATABASE_URL` is unset or not a `postgres(ql)://` URL,
  `createDatabaseClient()` returns a `mode: 'stub'` client whose `query`/`execute`/
  `transaction` throw a descriptive error. Repositories check `client.isConfigured` and
  degrade gracefully (UI-first local development without a DB). See
  [`market-intelligence-repository.ts`](../../packages/db/src/repositories/market-intelligence-repository.ts)
  for the `isConfigured` guard pattern.
- **NUMERIC precision:** financial values are stored as Postgres `NUMERIC`, never JS floats.
  Observed precisions in migrations: `numeric(18,2)` (cash/notional), `numeric(18,8)`
  (crypto quantity/price), `numeric(6,4)` / `numeric(5,4)` (percentages/ratios). All
  arithmetic for PnL/value happens in SQL, not in the application layer
  (see [`portfolio-accounting-rule.md`](../../.claude/rules/portfolio-accounting-rule.md)).
- **Multi-table atomicity:** order + transaction + position + balance writes must run inside
  one transaction (see [`repository-transaction-rule.md`](../../.claude/rules/repository-transaction-rule.md)).
  `simulated-trading-repository.ts` uses transactions for these write paths.
- **Order state machine:** `app.simulation_orders.status` is constrained by a CHECK
  (`status in ('filled','rejected','cancelled')`) in
  [`0003_simulation_trading_schema.sql`](../../packages/db/src/migrations/0003_simulation_trading_schema.sql).
- **Auditability:** simulation orders, transactions, snapshots, and agent decisions are
  written as durable records for later attribution
  (see [`simulation-auditability-rule.md`](../../.claude/rules/simulation-auditability-rule.md)).
- **Migrations are append-only & idempotent:** the runner skips files already present in
  `app.schema_migrations`. Migrations run in lexical filename order.

## 6. Failure Modes & Fallback

| Condition | Behavior |
| --- | --- |
| `DATABASE_URL` missing/invalid | `createDatabaseClient()` → stub; repositories return empty/typed-default results, callers render degraded UI. Process still boots. |
| Migration URL missing | `resolveMigrationDatabaseUrl()` throws with a clear setup message. |
| Missing schema/table (e.g. intelligence not yet migrated) | Repositories such as `market-intelligence-repository.ts` detect the missing-schema error and degrade rather than crash. |
| Transaction body throws | `postgres` rolls back the whole transaction; no partial multi-table writes persist. |
| Postgres notices | Silently ignored (`onnotice` no-op) to keep runtime logs clean. |

## 7. How to Extend — Add a Repository

1. Confirm/extend the shared contract in
   [`@repo/api-contracts`](../../packages/api-contracts) (no local duplicate types).
2. Add a migration in [`src/migrations/`](../../packages/db/src/migrations) with the next
   numeric prefix; create tables under `app.`; include a rollback comment
   (see [`rollback-notes-rule.md`](../../.claude/rules/rollback-notes-rule.md)).
3. Create `src/repositories/<domain>-repository.ts`:
   - import `createDatabaseClient` from `../client`;
   - guard on `client.isConfigured` and return a safe default when stubbed;
   - wrap any multi-table write in `client.transaction(...)`;
   - parse/return values typed against the shared contract.
4. Re-export from [`src/index.ts`](../../packages/db/src/index.ts).
5. Run migrations and typecheck:

   ```bash
   node packages/db/scripts/migrate.mjs
   pnpm --filter @repo/db typecheck
   pnpm --filter @repo/db test
   ```

## 8. Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime (pooled) Postgres connection. Absence → stub client. |
| `DATABASE_URL_UNPOOLED` | Preferred unpooled URL for migrations. |
| `DIRECT_URL` | Fallback unpooled URL for migrations. |
| `ENABLE_PRISMA_DB` | Local guardrail toggle (`false` for UI-first, no hard DB dependency). |
| `DB_READ_TIMEOUT_MS` | Optional server read guardrail (default 2000). |

Migration runner URL preference: `DATABASE_URL_UNPOOLED` → `DIRECT_URL` → `DATABASE_URL`.

## Related Docs

- [Simulation Engine](../SIMULATION_ENGINE.md)
- [Database / Intelligence Memory](../database/intelligence-memory.md)
- [Risk](../RISK.md) · [Execution](../EXECUTION.md)
