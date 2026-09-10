# `@repo/providers` — External Data Providers Reference

> Source: [`packages/providers/src`](../../packages/providers/src)
> Status: **CURRENT** unless explicitly marked FUTURE.

## 1. Purpose & Boundary

`@repo/providers` is the **only** place external market/macro/news/banking/AI data APIs
are called. It owns transport, normalization, provider routing, fallback chaining, health
tracking, and rate-limit/retry behavior.

Boundary rules (see [`provider-boundary.md`](../../.claude/rules/provider-boundary.md),
[`market-provider-rules.md`](../../.claude/rules/market-provider-rules.md)):

- No `fetch()` to provider APIs from `apps/web/app/**`, components, or services.
- Provider API keys are read **server-side only**, via the validated config module
  ([`config.ts`](../../packages/providers/src/config.ts)) — never in client bundles.
- All provider responses are normalized to canonical types before leaving the package.
- Missing data is surfaced as a typed failure or degraded state — **never fabricated**
  (see [`no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md)).

Public surface: [`src/index.ts`](../../packages/providers/src/index.ts).

## 2. Directory Map

| Path | Responsibility |
| --- | --- |
| [`market/client.ts`](../../packages/providers/src/market/client.ts) | Read orchestrators: `readMarketQuote`, `readMarketHistory`, `readAssetMetadata`, `readCryptoGlobalMetrics`, batch `fetchMarketSnapshot`, fallback loop. |
| [`market/routing.ts`](../../packages/providers/src/market/routing.ts) | Builds the per-read provider chain (`getQuoteProviderChain`, `getHistoryProviderChain`, `getMetadataProviderChain`, `getCryptoGlobalProviderChain`). |
| [`market/provider-registry.ts`](../../packages/providers/src/market/provider-registry.ts) | Registry of REST providers: priority, supported read kinds, capability matrix, `isConfigured`, and runtime health scoring. |
| [`market/provider-capabilities.ts`](../../packages/providers/src/market/provider-capabilities.ts) | Unified capability registry (auth mode, ws/rest support, intervals, reliability tier) used for monitoring/streaming. |
| [`market/provider-symbols.ts`](../../packages/providers/src/market/provider-symbols.ts) | Canonical symbol normalization + per-provider symbol resolvers. |
| [`market/providers/`](../../packages/providers/src/market/providers) | Per-provider adapters (polygon, twelve-data, tiingo, coingecko, binance, legacy=finnhub+eodhd). |
| [`market/types.ts`](../../packages/providers/src/market/types.ts) | Canonical `MarketQuote`, `HistoricalBar`, `AssetMetadata`, `CryptoGlobalMetrics`, `ProviderHealthStatus`, error types. |
| [`market/errors.ts`](../../packages/providers/src/market/errors.ts) | `MarketProviderError`, normalization to typed `ProviderError`. |
| [`shared/`](../../packages/providers/src/shared) | `http-client.ts` (`HttpError`, `buildUrl`), `rate-limit.ts` (`createRateLimitGuard`), `retry.ts`. |
| [`macro/`](../../packages/providers/src/macro) | Macro data client + mappers/schemas (FRED, ECB, World Bank). |
| [`news/`](../../packages/providers/src/news) | News client + types/mappers (RSS / API providers). |
| [`ai/`](../../packages/providers/src/ai) | `claude-finance.ts` — simulation-only AI provider client. |
| [`banking/`](../../packages/providers/src/banking) | `sparkasse-george.ts` — Erste/George sandbox banking adapter. |
| [`config.ts`](../../packages/providers/src/config.ts) | Zod-validated env loader (`getProviderEnv`, `MarketDataProvider` type). |

## 3. Supported Market Providers

From [`provider-registry.ts`](../../packages/providers/src/market/provider-registry.ts)
(`PROVIDER_REGISTRY`). Priority is the base score; runtime health and per-read preference
boosts adjust ordering dynamically.

| Provider | Base priority | Read kinds | Assets | Quote mode | Configured by |
| --- | --- | --- | --- | --- | --- |
| `polygon` | 100 | quote, history, metadata | stock, etf, index | — | `POLYGON_API_KEY` |
| `binance` | 95 | quote, history | crypto | live | always (public REST) |
| `coingecko` | 88 | quote, history, metadata, crypto-global | crypto | cached | `COINGECKO_API_KEY` |
| `twelve-data` | 86 | quote, history | stock, etf, crypto, fx, index | — | `TWELVE_DATA_API_KEY` |
| `tiingo` | 76 | metadata | stock, etf | — | `TIINGO_API_KEY` |
| `finnhub` | 72 | quote, history | stock, etf, fx, crypto, index | — | `FINNHUB_API_KEY` |
| `eodhd` | 68 | quote, history | stock, etf, fx, crypto, index | delayed | `EODHD_API_KEY` |

Notes:
- `tiingo` is **metadata-only** in this routing; the client throws if asked for a tiingo
  quote/history read.
- `coingecko` crypto history is `1d`-only; `eodhd` history is `1d`-only across assets.
- `binance.isConfigured()` returns `true` (public endpoints), so it always participates in
  the crypto chain.

The streaming side (see [`@repo/ingestion`](./ingestion.md)) additionally references
`bybit`, `okx`, and `coinbase` public providers via `UnifiedProviderId`.

## 4. Key Contracts

From [`market/types.ts`](../../packages/providers/src/market/types.ts):

```ts
export interface MarketQuote {
  symbol: string;
  assetKind: MarketAssetKind;     // 'stock' | 'etf' | 'crypto' | 'fx' | 'index'
  price: number;
  timestamp: string;              // ISO 8601 — required
  source: MarketDataProvider;
  currency: 'USD';
  change?: number;
  changePercent?: number;
  previousClose?: number;
}

export interface HistoricalBar {
  symbol: string;
  assetKind: MarketAssetKind;
  timestamp: string;              // ISO 8601, ascending series
  open: number; high: number; low: number; close: number;
  source: MarketDataProvider;
  volume?: number;
}
```

The provider-selection result carries explicit fallback/health metadata:

```ts
export interface ProviderSelectionResult {
  kind: MarketReadKind;            // 'quote' | 'history' | 'metadata' | 'crypto-global'
  symbol: string | null;
  attemptedProviders: MarketDataProvider[];
  selectedProvider: MarketDataProvider | null;
  fallbackUsed: boolean;          // true when selected !== first attempted
  staleCacheEligible: boolean;
  errors: ProviderError[];
}
```

`ProviderHealthStatus` exposes `configured`, `healthScore`, `successCount`,
`failureCount`, `errorRate`, `lastLatencyMs`, and the `capabilityMatrix` for monitoring.

## 5. The Read / Fallback Flow

Every read goes through `readWithFallback` in
[`client.ts`](../../packages/providers/src/market/client.ts):

1. `routing.ts` builds an ordered chain via `resolveProvidersForRead(kind, assetKind, symbol)`:
   - filter to **configured** providers,
   - filter to providers that support the **read kind** and **asset kind**,
   - sort by `healthScore + readPreferenceBoost` (descending).
2. The loop tries each provider in order; `timedRead` records success/failure latency.
3. First success returns `{ data, selection }`, with `fallbackUsed` set if it was not the
   primary.
4. If **all** providers fail, it throws an error carrying the `selection` (with the typed
   `errors` array) — no synthetic data is returned.

There is **no single hardcoded chain** — the chain is computed per read from the registry,
asset kind, and live health. An optional `preferred` provider is hoisted to the front.

## 6. Invariants & Rules

- **API keys server-only**, loaded through the Zod schema in
  [`config.ts`](../../packages/providers/src/config.ts); empty strings normalize to
  `undefined`.
- **Normalization before exit.** Each adapter (e.g.
  [`polygon.ts`](../../packages/providers/src/market/providers/polygon.ts)) maps raw
  responses to `MarketQuote`/`HistoricalBar` with ISO timestamps, `source`, and `assetKind`.
- **Timestamps required.** Every `MarketQuote`/`HistoricalBar` carries an ISO `timestamp`
  for downstream staleness checks (see [`quote-snapshot-rule.md`](../../.claude/rules/quote-snapshot-rule.md)).
- **No fabricated data.** All-provider failure → typed throw, never a placeholder price
  (see [`no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md)).
- **Explicit, observable fallback.** `fallbackUsed` + per-provider `errors` are returned to
  the caller (see [`provider-fallback-rule.md`](../../.claude/rules/provider-fallback-rule.md)).
- **Health tracking** is in-process via `recordProviderSuccess` / `recordProviderFailure`
  and feeds the next chain ordering.
- **Rate-limit / retry** helpers live in [`shared/`](../../packages/providers/src/shared)
  (`createRateLimitGuard`, retry) per [`rate-limit-rule.md`](../../.claude/rules/rate-limit-rule.md).
- **Batch reads.** `fetchMarketSnapshot` chunks symbols (`SNAPSHOT_BATCH_SIZE = 4`) to
  bound concurrent provider calls (see [`provider-call-budget-rule.md`](../../.claude/rules/provider-call-budget-rule.md)).

## 7. Failure Modes & Fallback

| Condition | Behavior |
| --- | --- |
| Provider key missing | `isConfigured()` false → provider excluded from the chain entirely. |
| Provider HTTP error / rate-limit | `normalizeProviderError` → typed `ProviderError` (`unauthorized`, `rate_limited`, `malformed_response`, `unavailable`, `unsupported_symbol`, `not_found`, `unknown`); the loop advances to the next provider. |
| Unsupported read kind/asset for provider | Filtered out by `resolveProvidersForRead` before any call. |
| Tiingo quote/history requested | Adapter throws "not configured for … reads"; next provider tried. |
| All providers fail | `readWithFallback` throws with attached `selection` (attempted providers + errors). Caller surfaces degraded state and lowers confidence. |
| Degraded resolution/asset | `MarketHistoryResponse.degradedReason` set (e.g. `unsupported_resolution`, `cache_only`). |

## 8. How to Extend — Add a Provider Adapter

1. Create `market/providers/<name>.ts` exporting `fetch<Name>Quote` / `fetch<Name>History`
   / `fetch<Name>Metadata` that **normalize** raw responses to `MarketQuote` /
   `HistoricalBar` / `AssetMetadata` (ISO timestamps, `source`, `assetKind`).
2. Add symbol resolution in
   [`provider-symbols.ts`](../../packages/providers/src/market/provider-symbols.ts).
3. Register the provider in `PROVIDER_REGISTRY`
   ([`provider-registry.ts`](../../packages/providers/src/market/provider-registry.ts)):
   priority, `supportedKinds`, capability matrix, and an `isConfigured()` keyed to its
   env var.
4. Wire the `switch` cases in
   [`client.ts`](../../packages/providers/src/market/client.ts)
   (`fetchQuoteFromProvider` / `fetchHistoryFromProvider` / `fetchMetadataFromProvider`).
5. Add the env var to the Zod schema in
   [`config.ts`](../../packages/providers/src/config.ts), update `.env.example`, and use
   `createRateLimitGuard` / retry from [`shared/`](../../packages/providers/src/shared).
6. Validate:

   ```bash
   pnpm --filter @repo/providers typecheck
   pnpm --filter @repo/providers test
   ```

## 9. Environment Variables

| Variable | Purpose |
| --- | --- |
| `MARKET_DATA_PROVIDER` | Default/primary market provider (enum: polygon, twelve-data, tiingo, coingecko, finnhub, eodhd, binance; default `polygon`). |
| `MARKET_METADATA_PROVIDER` | Preferred metadata provider. |
| `MARKET_HISTORY_FALLBACK_PROVIDERS` | Ordered history fallback hints (e.g. `polygon,twelve-data,eodhd`). |
| `MARKET_QUOTE_FALLBACK_PROVIDERS` | Ordered quote fallback hints. |
| `MARKET_STREAM_PROVIDER` / `CRYPTO_STREAM_PROVIDER` / `CRYPTO_HISTORY_PROVIDER` | Streaming/crypto routing hints (see [`@repo/ingestion`](./ingestion.md)). |
| `POLYGON_API_KEY`, `TWELVE_DATA_API_KEY`, `TIINGO_API_KEY`, `COINGECKO_API_KEY`, `FINNHUB_API_KEY`, `EODHD_API_KEY` | Per-provider market keys (server-only). |
| `MACRO_DATA_PROVIDER`, `ENABLE_FRED_MACRO`, `FRED_API_KEY`, `ENABLE_ECB_MACRO`, `ENABLE_WORLD_BANK_MACRO`, `MACRO_CACHE_TTL_SECONDS` | Macro provider config. |
| `MARKET_NEWS_MODE`, `MARKET_NEWS_RSS_FEEDS`, `NEWS_API_KEY`, `ALPHAVANTAGE_API_KEY`, `FMP_API_KEY` | News provider config. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER` | Simulation-only AI provider config (never enables live trading). |
| `ERSTE_CONNECT_*`, `ENABLE_SPARKASSE_GEORGE_SANDBOX` | Banking (Sparkasse/George) sandbox adapter. |

> **FUTURE:** broker execution providers (`BROKER_EXECUTION_PROVIDER`, Binance/Coinbase
> trade keys) live in `@repo/agents`, not here — `@repo/providers` reads market data only.

## Related Docs

- [Market Data Provider Architecture](../market-data-provider-architecture.md)
- [Provider Secret Safety](../provider-secret-safety.md)
- [`@repo/ingestion` reference](./ingestion.md) · [`@repo/api-contracts` reference](./api-contracts.md)
