# Aurox Intelligence

Production-oriented monorepo for market intelligence, signals/forecasting, and simulation-first investing workflows.

This repository uses Turborepo + pnpm with a Next.js web app and a TypeScript worker, backed by Postgres and shared domain contracts.

## Production URLs

- Production: `https://aurox.mitterbergerlab.at`
- Vercel project should also include the subdomain as a verified custom domain.

## Table of Contents

1. [What This Repo Contains](#what-this-repo-contains)
2. [Core Principles](#core-principles)
3. [Monorepo Structure](#monorepo-structure)
4. [Architecture Boundaries](#architecture-boundaries)
5. [Tech Stack](#tech-stack)
6. [Prerequisites](#prerequisites)
7. [Quick Start](#quick-start)
8. [Environment Variables](#environment-variables)
9. [Database and Migrations](#database-and-migrations)
10. [Runbook: Local Development](#runbook-local-development)
11. [Build, Test, and Typecheck](#build-test-and-typecheck)
12. [Simulation and Live-Execution Safety](#simulation-and-live-execution-safety)
13. [Worker Scheduling and Data Pipeline](#worker-scheduling-and-data-pipeline)
14. [Deployment](#deployment)
15. [Domain and DNS](#domain-and-dns)
16. [Troubleshooting](#troubleshooting)
17. [Contribution Guidance](#contribution-guidance)

## What This Repo Contains

Aurox Intelligence includes:

- `apps/web`: Next.js App Router application for dashboard, market, forecast, signals, and investing/simulation UX.
- `apps/worker`: background scheduler and jobs for ingestion and periodic recomputation.
- `packages/api-contracts`: shared Zod schemas and inferred TypeScript types.
- `packages/db`: Postgres client, repositories, queries/read-models, and migrations.
- `packages/providers`: provider routing/integration for market, macro, news, and banking connectors.
- `packages/signals`: pure signal derivation/scoring logic.
- `packages/forecasting`: pure forecasting models/horizon/explainability logic.
- `packages/agents`: agent orchestration for simulation/order workflows.
- `packages/ai-market-intelligence`: higher-level intelligence aggregation.
- `packages/observability`: logging/tracing/metrics helpers.
- `packages/design-tokens`: shared tokens/styles.

## Core Principles

- Simulation-first investing workflow.
- Explicit safety gates for any live broker path.
- Shared Zod-validated contracts across boundaries.
- Monorepo boundaries are intentional and should be preserved.
- Prefer small coherent vertical slices over speculative broad rewrites.

## Monorepo Structure

```text
.
|- apps/
|  |- web/                 # Next.js App Router application
|  `- worker/              # Scheduled background jobs
|- packages/
|  |- agents/
|  |- ai-market-intelligence/
|  |- api-contracts/
|  |- db/
|  |- design-tokens/
|  |- forecasting/
|  |- observability/
|  |- providers/
|  `- signals/
|- turbo.json
|- pnpm-workspace.yaml
`- package.json
```

## Architecture Boundaries

Repository-level rules (from `AGENTS.md`):

- Preserve monorepo boundaries.
- Do not move provider logic into UI layers.
- Do not move forecasting logic into route handlers/components.
- Keep DB access inside `packages/db`.
- Keep canonicalization responsibilities out of UI (historically referenced as `packages/ingestion`; current ingestion orchestration lives in worker + provider layers).
- Keep analytics logic pure in `packages/signals` and `packages/forecasting`.
- Use shared contracts from `packages/api-contracts`.
- Validate boundaries with Zod.
- Prefer smaller, coherent vertical slices over fake enterprise filler.

## Tech Stack

- Monorepo: Turborepo
- Package manager: pnpm (`pnpm@10.0.0`)
- Language: TypeScript
- Frontend: Next.js 16, React 19
- Database: Postgres (`postgres` driver)
- Validation/contracts: Zod
- Testing: Vitest

## Prerequisites

- Node.js 20+
- pnpm 10+
- Postgres instance for full functionality (`DATABASE_URL`)

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Create environment file:

```bash
cp .env.example .env
# PowerShell alternative:
# Copy-Item .env.example .env
```

3. Set at minimum:

- `DATABASE_URL`
- `AUTH_SECRET`

4. Apply DB migrations:

```bash
node packages/db/scripts/migrate.mjs
```

5. Start local development:

```bash
pnpm dev
```

`pnpm dev` runs web + worker in parallel via Turbo.

## Environment Variables

Canonical template: [`.env.example`](./.env.example)

### Core Runtime

- `NODE_ENV`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` / `DIRECT_URL` (migration/direct connection)
- `AUTH_SECRET`
- `AUTH_SESSION_DAYS`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`

### Worker Runtime

- `WORKER_CONCURRENCY`
- `LOG_LEVEL`

### Market Provider Routing

- `MARKET_DATA_PROVIDER`
- `MARKET_STREAM_PROVIDER`
- `MARKET_METADATA_PROVIDER`
- `MARKET_HISTORY_FALLBACK_PROVIDERS`
- `MARKET_QUOTE_FALLBACK_PROVIDERS`
- `CRYPTO_STREAM_PROVIDER`
- `CRYPTO_HISTORY_PROVIDER`

### Provider Credentials

- `POLYGON_API_KEY`
- `TWELVE_DATA_API_KEY`
- `TIINGO_API_KEY`
- `COINGECKO_API_KEY`
- `FINNHUB_API_KEY`
- `EODHD_API_KEY`

### Symbol Lists

- `MARKET_SYMBOLS`
- `FINNHUB_MARKET_SYMBOLS`
- `EODHD_MARKET_SYMBOLS`

Notes:

- Leave `MARKET_SYMBOLS` empty to use the expanded in-code default market universe.
- Setting `MARKET_SYMBOLS` in Vercel overrides defaults. If this is set to a short list (for example ~32 symbols), frontend coverage will also be short.

### Broker Safety + Execution

- `BROKER_EXECUTION_PROVIDER` (`simulation | binance | coinbase`)
- `BROKER_DRY_RUN` (safe baseline: `true`)
- `BROKER_SANDBOX_MODE` (safe baseline: `true`)
- `BROKER_ALLOWED_LIVE_MODE_IDS`
- `BROKER_ORDER_TIMEOUT_MS`

### Binance

- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
- `BINANCE_API_BASE_URL`
- `BINANCE_RECV_WINDOW_MS`
- `BINANCE_ALLOWED_SYMBOLS`

### Coinbase

- `COINBASE_API_KEY_ID`
- `COINBASE_API_KEY_SECRET`
- `COINBASE_API_BASE_URL`
- `COINBASE_ALLOWED_PRODUCT_IDS`
- `COINBASE_JWT_EXPIRES_IN_SEC`
- `COINBASE_BEARER_TOKEN` (optional override)
- `COINBASE_PORTFOLIO_UUID`

### Banking Connector Flags

- `ERSTE_CONNECT_CLIENT_ID`
- `ERSTE_CONNECT_CLIENT_SECRET`
- `ERSTE_CONNECT_REDIRECT_URI`
- `ERSTE_CONNECT_AUTH_URL`
- `ERSTE_CONNECT_TOKEN_URL`
- `ERSTE_CONNECT_API_BASE_URL`
- `ENABLE_SPARKASSE_GEORGE_SANDBOX`

## Database and Migrations

Database package: [`packages/db`](./packages/db)

- Runtime client: `packages/db/src/client.ts`
- Repositories: `packages/db/src/repositories/*`
- Queries/read models: `packages/db/src/queries/*`
- SQL migrations: `packages/db/src/migrations/*`
- Migration runner: `packages/db/scripts/migrate.mjs`

Run migrations from repo root:

```bash
node packages/db/scripts/migrate.mjs
```

Notes:

- Runtime access expects `DATABASE_URL`.
- Migrations prefer `DATABASE_URL_UNPOOLED` or `DIRECT_URL`, fallback to `DATABASE_URL`.

## Runbook: Local Development

### Start everything

```bash
pnpm dev
```

### Start only web

```bash
pnpm dev:web
```

### Start only worker

```bash
pnpm dev:worker
```

### Common package-targeted runs

```bash
pnpm --filter @repo/web dev
pnpm --filter @repo/web build
pnpm --filter @repo/worker dev
pnpm --filter @repo/db build
```

## Build, Test, and Typecheck

From repository root:

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm lint
```

Targeted:

```bash
pnpm --filter @repo/web build
pnpm --filter @repo/db build
pnpm --filter @repo/worker typecheck
```

## Simulation and Live-Execution Safety

The system is designed to be simulation-first.

Key guardrails:

- Execution provider defaults to simulation.
- `BROKER_DRY_RUN=true` and `BROKER_SANDBOX_MODE=true` are the safe baseline.
- Mode-level allow-listing (`BROKER_ALLOWED_LIVE_MODE_IDS`) can restrict live paths.
- Simulation tradability is limited by repository logic (`stock`, `etf`, `crypto` classes when configured as simulated + tradable).

Keep autonomous live execution disabled unless an explicit controlled rollout is intended.

## Worker Scheduling and Data Pipeline

Worker entrypoint: [`apps/worker/src/index.ts`](./apps/worker/src/index.ts)

Scheduler: [`apps/worker/src/schedulers/scheduler.ts`](./apps/worker/src/schedulers/scheduler.ts)

Current recurring jobs:

- `ingest-market-data` every 5 minutes
- `extract-market-intelligence` every 10 minutes
- `recompute-signals` every 15 minutes
- `recompute-forecasts` every 20 minutes
- `ingest-macro-data` every 30 minutes

Market ingestion job (`apps/worker/src/jobs/ingest-market-data.ts`) performs:

- fallback market asset seeding
- quote snapshot upserts
- history bar replacement
- metadata/profile enrichment
- crypto global metrics refresh
- simulation snapshot/session observation refresh

## Deployment

### Vercel (Web App)

Web project config: [`apps/web/vercel.json`](./apps/web/vercel.json)

- install command: `cd ../.. && pnpm install --frozen-lockfile`
- build command: `cd ../.. && pnpm turbo run build --filter=@repo/web`

Important:

- Commit `package.json` and `pnpm-lock.yaml` changes together.
- If lockfile and manifest diverge, CI with `--frozen-lockfile` fails.
- Redeploying an old failed Vercel deployment keeps the old commit SHA; trigger a fresh deployment from latest `main`.

Recommended production env values (Vercel):

- `NEXT_PUBLIC_APP_URL=https://aurox.mitterbergerlab.at`
- `APP_BASE_URL=https://aurox.mitterbergerlab.at`

## Domain and DNS

For `aurox.mitterbergerlab.at` via World4You + Vercel:

1. Add `aurox.mitterbergerlab.at` in Vercel project Domains.
2. In World4You DNS, set:
   - Type: `CNAME`
   - Host/Name: `aurox`
   - Value/Target: `cname.vercel-dns.com`
3. Remove conflicting records for `aurox` (`A`, `AAAA`, or extra `CNAME`).
4. Wait for DNS propagation, then recheck Vercel domain status.

## Troubleshooting

### `ERR_PNPM_OUTDATED_LOCKFILE` in CI/Vercel

Cause:

- `pnpm-lock.yaml` does not match one or more workspace `package.json` files.

Fix:

```bash
pnpm install
git add pnpm-lock.yaml
git add apps/*/package.json packages/*/package.json package.json
git commit -m "sync lockfile"
git push
```

Then trigger a new deployment from the latest commit.

### Migration connection errors

- Ensure `DIRECT_URL` or `DATABASE_URL_UNPOOLED` is set for migration runner.
- Validate connection string prefix is `postgres://` or `postgresql://`.

### No data in market/simulation views

- Confirm provider keys are set for selected provider.
- Run worker and check logs.
- Verify DB migrations are applied.

## Contribution Guidance

- Keep package boundaries intact.
- Use `@repo/api-contracts` for shared shape definitions.
- Keep repository/data-access logic in `packages/db`.
- Keep signal/forecast logic pure and reusable.
- Avoid moving provider fetch logic into route handlers/components.
- Prefer small coherent patches and validate with package-targeted builds.

---

For deeper context, see:

- [`DOCUMENTATION.md`](./DOCUMENTATION.md)
- [`CURRENT_STATE_SUMMARY.md`](./CURRENT_STATE_SUMMARY.md)
- [`AGENTS.md`](./AGENTS.md)
