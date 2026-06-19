# Configuration Reference — Aurox Intelligence

**Status:** Authoritative environment-variable reference. Grounded in
[`.env.example`](.env.example) and validated by
[`scripts/env-check.mjs`](scripts/env-check.mjs).

This document lists **only** variables that exist in `.env.example`. Do not invent new
environment variables — add them to `.env.example` first, then document them here.

---

## How configuration is loaded

- Env files are loaded from the **repository root** using `@next/env` `loadEnvConfig`
  (the same loader the apps and the worker use). Precedence is high → low across
  `.env.local`, `.env.<mode>`, `.env`.
- Validate your local setup with `pnpm env:check`. It prints **presence only** (never secret
  values), reports which env files were loaded, and exits non-zero if a required variable is
  missing or invalid.

### Enforced by `scripts/env-check.mjs`

| Class | Variables | Behaviour |
|---|---|---|
| **Required** | `AUTH_SECRET` (min length **32**) | Missing/short → check FAILS (non-zero exit) |
| **Recommended** | `DATABASE_URL`, `APP_BASE_URL`, `NODE_ENV` | Missing → warning only |

> **`NODE_ENV` is intentionally NOT set in `.env.example`.** It is managed by the tooling
> (`next dev` / worker dev → development; `next build` / `next start` → production). Setting
> it in an env file can corrupt a production build.

---

## Security rules

- **Secrets must never be committed.** `.env`, `.env.local`, `.env.production` are gitignored.
- **All API keys and broker credentials are server-side only.** Never reference a secret in a
  client component. The only client-exposed variables are those prefixed `NEXT_PUBLIC_`.
- Live and sandbox credentials must use distinct variables (e.g. testnet keys vs production).
- See [`.claude/rules/env-secret-rule.md`](.claude/rules/env-secret-rule.md) and
  [`docs/provider-secret-safety.md`](docs/provider-secret-safety.md).

**Legend:** _Secret_ = sensitive credential, never log/commit. _Server-only_ = must not reach
the client bundle. _Public_ = `NEXT_PUBLIC_*`, safe for the client.

---

## Database

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection string (pooled) | Recommended; system boots with a stub if absent | Secret, Server-only |
| `DATABASE_URL_UNPOOLED` | Direct (unpooled) connection for migrations/long ops | Optional (empty) | Secret, Server-only |
| `DIRECT_URL` | Direct connection URL (driver/migration use) | Optional (empty) | Secret, Server-only |
| `ENABLE_PRISMA_DB` | Toggle DB hard dependency; set `false` for UI-first dev | `true` | Server-only |
| `DB_READ_TIMEOUT_MS` | Guardrail for server DB reads (ms) | `2000` | Server-only |

## Auth

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `AUTH_SECRET` | Session signing secret | **Required**, ≥ 32 chars (`openssl rand -base64 32`) | Secret, Server-only |
| `AUTH_SESSION_DAYS` | Session lifetime in days | `30` | Server-only |

## App

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Display name of the app | `Aurox Intelligence` | Public |
| `NEXT_PUBLIC_APP_URL` | Public base URL (client) | `http://localhost:3000` | Public |
| `APP_BASE_URL` | Server-side base URL | `http://localhost:3000` (recommended) | Server-only |
| `HOME_WIDGET_TIMEOUT_MS` | Home-page widget timeout; prefers stale cache over blocking SSR (500–30000) | `3000` | Server-only |
| `NEWS_READ_TIMEOUT_MS` | News read guardrail (ms) | `3000` | Server-only |

## Worker / Logging

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `WORKER_CONCURRENCY` | Concurrent ingestion tasks in the worker | `2` | Server-only |
| `LOG_LEVEL` | Log verbosity for web (`apps/web/lib/env.ts`) and worker (`apps/worker/src/env.ts`) | `info` | Server-only |

See [`docs/observability/README.md`](docs/observability/README.md).

## Market Data Providers & Routing

Routing keys select which provider serves each capability and define fallback chains.
Routing logic lives in `packages/providers/src/market/routing.ts`. See
[`docs/market-data-provider-architecture.md`](docs/market-data-provider-architecture.md).

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `MARKET_DATA_PROVIDER` | Primary market-data provider | `finnhub` | Server-only |
| `MARKET_STREAM_PROVIDER` | Primary real-time stream provider | `finnhub` | Server-only |
| `MARKET_METADATA_PROVIDER` | Symbol metadata provider | `polygon` | Server-only |
| `MARKET_HISTORY_FALLBACK_PROVIDERS` | Ordered fallback chain for OHLCV history | `polygon,twelve-data,eodhd` | Server-only |
| `MARKET_QUOTE_FALLBACK_PROVIDERS` | Ordered fallback chain for quotes | `polygon,twelve-data,eodhd` | Server-only |
| `POLYGON_API_KEY` | Polygon API key (stocks/ETFs) | Optional (empty) | Secret, Server-only |
| `TWELVE_DATA_API_KEY` | Twelve Data API key | Optional (empty) | Secret, Server-only |
| `TIINGO_API_KEY` | Tiingo API key | Optional (empty) | Secret, Server-only |
| `COINGECKO_API_KEY` | CoinGecko API key | Optional (empty) | Secret, Server-only |
| `FINNHUB_API_KEY` | Finnhub API key | Optional (empty) | Secret, Server-only |
| `EODHD_API_KEY` | EODHD API key | Optional (empty) | Secret, Server-only |
| `FINNHUB_MARKET_SYMBOLS` | Finnhub symbol universe override (CSV) | Optional (empty) | Server-only |
| `EODHD_MARKET_SYMBOLS` | EODHD symbol universe override (CSV) | Optional (empty) | Server-only |
| `MARKET_SYMBOLS` | Global symbol universe override (CSV) | Optional (empty) | Server-only |

## Crypto Streams

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `CRYPTO_STREAM_PROVIDER` | Real-time crypto stream provider | `coinbase` | Server-only |
| `CRYPTO_HISTORY_PROVIDER` | Crypto OHLCV history provider | `coingecko` | Server-only |
| `ENABLE_BINANCE_STREAM` | Enable Binance public stream | `true` | Server-only |
| `ENABLE_BYBIT_PUBLIC_STREAM` | Enable Bybit public stream | `true` | Server-only |
| `ENABLE_OKX_PUBLIC_STREAM` | Enable OKX public stream | `true` | Server-only |
| `ENABLE_COINBASE_PUBLIC_STREAM` | Enable Coinbase public stream | `true` | Server-only |
| `MARKET_STREAM_RECONNECT_MAX_ATTEMPTS` | Max stream reconnect attempts | `20` | Server-only |
| `MARKET_STREAM_HEARTBEAT_INTERVAL_MS` | Heartbeat interval (ms) | `30000` | Server-only |
| `MARKET_STREAM_STALE_AFTER_MS` | Mark stream stale after (ms) | `45000` | Server-only |
| `MARKET_STREAM_EVENT_BUFFER_SIZE` | In-memory stream event buffer size | `5000` | Server-only |

## Macro Data

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `MACRO_DATA_PROVIDER` | Macro provider mode (`multi` = aggregate sources) | `multi` | Server-only |
| `MACRO_CACHE_TTL_SECONDS` | Macro cache TTL (seconds) | `21600` | Server-only |
| `ENABLE_WORLD_BANK_MACRO` | Enable World Bank macro source | `true` | Server-only |
| `ENABLE_ECB_MACRO` | Enable ECB macro source | `true` | Server-only |
| `ENABLE_FRED_MACRO` | Enable FRED macro source | `true` | Server-only |
| `FRED_API_KEY` | FRED API key (required if FRED enabled) | Optional (empty) | Secret, Server-only |

See [`docs/macro-data-integration.md`](docs/macro-data-integration.md).

## News / RSS Feeds

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `NEXT_PUBLIC_ENABLE_MARKET_NEWS` | Enable homepage market news section | `true` | Public |
| `NEWS_DATA_PROVIDER` | News data provider id | Optional (empty) | Server-only |
| `MARKET_NEWS_MODE` | News mode: `rss` (free feeds), `api`, or `mock` | `rss` | Server-only |
| `MARKET_NEWS_RSS_FEEDS` | Comma-separated RSS feed URLs | MarketWatch, Nasdaq, CoinDesk | Server-only |
| `NEWS_API_KEY` | News API key (when `api` mode) | Optional (empty) | Secret, Server-only |
| `ALPHAVANTAGE_API_KEY` | Alpha Vantage API key | Optional (empty) | Secret, Server-only |
| `FMP_API_KEY` | Financial Modeling Prep API key | Optional (empty) | Secret, Server-only |
| `MARKET_NEWS_CACHE_TTL_SECONDS` | News fetch cache TTL (seconds) | `900` | Server-only |
| `MARKET_NEWS_ITEMS_PER_SOURCE` | Max items per source on homepage | `6` | Server-only |

## Broker / Execution Runtime

Safety-critical. Defaults are simulation-first and dry-run. See
[`docs/EXECUTION.md`](docs/EXECUTION.md),
[`.claude/rules/simulation-first-rule.md`](.claude/rules/simulation-first-rule.md), and
[`.claude/rules/broker-sandbox-rule.md`](.claude/rules/broker-sandbox-rule.md).

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `BROKER_EXECUTION_PROVIDER` | Execution target: `simulation` \| `binance` \| `coinbase` | `simulation` | Server-only |
| `BROKER_DRY_RUN` | Keep `true` until the pipeline is fully validated | `true` | Server-only |
| `BROKER_SANDBOX_MODE` | Global execution safety gate (sandbox) | `true` | Server-only |
| `BROKER_ALLOWED_LIVE_MODE_IDS` | Restrict which broker mode IDs may use live execution (CSV) | Optional (empty) | Server-only |
| `BROKER_ORDER_TIMEOUT_MS` | Broker order timeout (ms) | `10000` | Server-only |

## Binance (Spot)

Default base URL targets the **testnet** (`https://testnet.binance.vision`).

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `BINANCE_API_KEY` | Binance API key | Optional (empty) | Secret, Server-only |
| `BINANCE_API_SECRET` | Binance API secret | Optional (empty) | Secret, Server-only |
| `BINANCE_API_BASE_URL` | Binance REST base URL (testnet by default) | `https://testnet.binance.vision` | Server-only |
| `BINANCE_RECV_WINDOW_MS` | Binance `recvWindow` (ms) | `5000` | Server-only |
| `BINANCE_ALLOWED_SYMBOLS` | Allowlist of tradable Binance symbols (CSV) | `BTCUSDT,ETHUSDT,…` | Server-only |

## Coinbase (Advanced Trade)

The API key secret is an EC private key. Keep it on one line using `\n` escapes.

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `COINBASE_API_KEY_ID` | Coinbase API key ID | Optional (empty) | Secret, Server-only |
| `COINBASE_API_KEY_SECRET` | Coinbase EC private key (single-line, `\n`-escaped) | Optional (empty) | Secret, Server-only |
| `COINBASE_API_BASE_URL` | Coinbase API host | `https://api.coinbase.com` | Server-only |
| `COINBASE_ALLOWED_PRODUCT_IDS` | Allowlist of tradable product IDs (CSV) | `BTC-USD,ETH-USD,…` | Server-only |
| `COINBASE_JWT_EXPIRES_IN_SEC` | Generated JWT expiry (seconds) | `120` | Server-only |
| `COINBASE_BEARER_TOKEN` | Optional pre-generated bearer token override | Optional (empty) | Secret, Server-only |
| `COINBASE_PORTFOLIO_UUID` | Target Coinbase portfolio UUID | Optional (empty) | Server-only |

## AI Providers (Simulation-only)

AI providers support the simulation broker agent. **They do not enable live trading.**
Server-side only; never exposed to the client.

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (preferred) | Optional (empty) | Secret, Server-only |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | Optional (empty) | Secret, Server-only |
| `OPENAI_SIM_AGENT_MODEL` | OpenAI model for the sim agent | `gpt-4o-mini` | Server-only |
| `ANTHROPIC_PROVIDER_ENABLED` | Enable Anthropic provider | `true` | Server-only |
| `OPENAI_PROVIDER_ENABLED` | Enable OpenAI provider | `true` | Server-only |
| `AI_PRIMARY_PROVIDER` | Primary AI provider | `anthropic` | Server-only |
| `AI_FALLBACK_PROVIDER` | Fallback AI provider | `openai` | Server-only |
| `CLAUDE_FINANCE_API_KEY` | **Deprecated** alias for `ANTHROPIC_API_KEY` | Optional (empty) | Secret, Server-only |
| `CLAUDE_FINANCE_PROVIDER_ENABLED` | Enable the deprecated Claude finance provider | `true` | Server-only |

> Prefer `ANTHROPIC_API_KEY` going forward; `CLAUDE_FINANCE_API_KEY` is retained for backward
> compatibility only.

## Simulation

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `SIMULATION_DEFAULT_CASH_CURRENCY` | Default simulation cash currency: `EUR` or `USD` | `EUR` | Server-only |
| `FEATURE_SIM_MICRO_TRADING` | Micro-trading simulation mode (strictly simulation-only) | `false` | Server-only |

See [`docs/SIMULATION_ENGINE.md`](docs/SIMULATION_ENGINE.md) and
[`docs/live-microtrading/`](docs/live-microtrading/).

## Erste / Sparkasse Connect (FUTURE — banking integration)

Sandbox-gated banking connectivity. Empty/disabled by default.

| Variable | Purpose | Default / Required | Flags |
|---|---|---|---|
| `ERSTE_CONNECT_CLIENT_ID` | Erste Connect OAuth client ID | Optional (empty) | Secret, Server-only |
| `ERSTE_CONNECT_CLIENT_SECRET` | Erste Connect OAuth client secret | Optional (empty) | Secret, Server-only |
| `ERSTE_CONNECT_REDIRECT_URI` | OAuth redirect URI | Optional (empty) | Server-only |
| `ERSTE_CONNECT_AUTH_URL` | OAuth authorize URL | Optional (empty) | Server-only |
| `ERSTE_CONNECT_TOKEN_URL` | OAuth token URL | Optional (empty) | Server-only |
| `ERSTE_CONNECT_API_BASE_URL` | Erste Connect API base URL | Optional (empty) | Server-only |
| `ENABLE_SPARKASSE_GEORGE_SANDBOX` | Enable Sparkasse George sandbox | `false` | Server-only |

---

## Related Documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — setup and onboarding
- [`docs/provider-secret-safety.md`](docs/provider-secret-safety.md) — secret handling
- [`docs/production-deployment-checklist.md`](docs/production-deployment-checklist.md)
- [`.claude/rules/env-secret-rule.md`](.claude/rules/env-secret-rule.md)
