# `@repo/ingestion` — Canonicalization & Stream Ingestion Reference

> Source: [`packages/ingestion/src`](../../packages/ingestion/src)
> Status: **CURRENT** unless explicitly marked FUTURE.

## 1. Purpose & Boundary

`@repo/ingestion` owns **canonical symbol mapping**, the **ingestion run lifecycle**, and
the **unified market-stream** websocket ingestion layer (normalization + health/fallback).
It is the one place where raw provider observations become canonical, deterministic records.

Boundary rules (see [`market-symbol-universe-rule.md`](../../.claude/rules/market-symbol-universe-rule.md),
[`architecture-boundaries.md`](../../.claude/rules/architecture-boundaries.md)):

- Canonicalization happens **once**, here — downstream packages consume canonical symbols.
- Normalized event contracts come from [`@repo/api-contracts`](./api-contracts.md) and are
  re-exported, not redefined.
- Ingestion does **not** persist directly — repository writes belong to
  [`@repo/db`](./db.md); it does not call providers for keys (those live in
  [`@repo/providers`](./providers.md)).
- No execution/private-account actions live in ingestion paths — market intelligence is
  isolated from execution surfaces.

Public surface: [`src/index.ts`](../../packages/ingestion/src/index.ts).

## 2. Directory Map

| Path | Responsibility |
| --- | --- |
| [`src/canonicalize.ts`](../../packages/ingestion/src/canonicalize.ts) | `canonicalizeSymbol`, `detectAssetKind`, `canonicalizeIngestionRecord` — raw observation → canonical `IngestionRecord`. |
| [`src/run-lifecycle.ts`](../../packages/ingestion/src/run-lifecycle.ts) | `startIngestionRun`, `finishIngestionRun`, `summarizeIngestionBatch`. |
| [`src/types.ts`](../../packages/ingestion/src/types.ts) | `IngestionAssetKind`, `IngestionRecord`, `IngestionError`, `IngestionBatchSummary`, `IngestionRunState`. |
| [`src/market-stream/types.ts`](../../packages/ingestion/src/market-stream/types.ts) | Stream status model, `MarketStreamAdapter`, manager config, priority profiles. |
| [`src/market-stream/contracts.ts`](../../packages/ingestion/src/market-stream/contracts.ts) | Re-exports normalized event contracts (`MarketTick`, `TradeEvent`, …) from `@repo/api-contracts`. |
| [`src/market-stream/capabilities.ts`](../../packages/ingestion/src/market-stream/capabilities.ts) | `UnifiedProviderId`, provider capability registry (auth/ws/rest/intervals/reliability). |
| [`src/market-stream/symbol-normalization.ts`](../../packages/ingestion/src/market-stream/symbol-normalization.ts) | Internal symbol ↔ per-provider symbol conversion; asset-class inference. |
| [`src/market-stream/mappers.ts`](../../packages/ingestion/src/market-stream/mappers.ts) | Raw provider frames → normalized stream events. |
| [`src/market-stream/adapters.ts`](../../packages/ingestion/src/market-stream/adapters.ts) | `BaseMarketStreamAdapter` + Binance/Bybit/OKX/Coinbase public adapters. |
| [`src/market-stream/event-bus.ts`](../../packages/ingestion/src/market-stream/event-bus.ts) | `MarketEventBus` — typed pub/sub with buffering. |
| [`src/market-stream/manager.ts`](../../packages/ingestion/src/market-stream/manager.ts) | `UnifiedMarketIngestionManager` — adapter registration, best-effort selection, lifecycle. |
| [`src/market-stream/rest-fallback.ts`](../../packages/ingestion/src/market-stream/rest-fallback.ts) | REST fallback snapshots (ticker, candles, funding, open interest). |
| [`src/market-stream/example-consumers.ts`](../../packages/ingestion/src/market-stream/example-consumers.ts) | Reference consumers for the event bus. |

## 3. Public API

### Canonicalization — [`canonicalize.ts`](../../packages/ingestion/src/canonicalize.ts)

| Function | Signature | Notes |
| --- | --- | --- |
| `canonicalizeSymbol` | `(symbol: string) => string` | Uppercases, normalizes crypto pairs to `BINANCE:<BASE>USDT`, FX to `OANDA:EUR_USD`, strips `.US`. |
| `detectAssetKind` | `(symbol: string) => IngestionAssetKind` | `'stock' \| 'etf' \| 'crypto' \| 'fx' \| 'index'`. |
| `canonicalizeIngestionRecord` | `(input) => IngestionRecord` | Produces a finite-validated, ISO-timestamped record. |

### Run lifecycle — [`run-lifecycle.ts`](../../packages/ingestion/src/run-lifecycle.ts)

| Function | Purpose |
| --- | --- |
| `startIngestionRun({ id, source, startedAt? })` | Returns an `IngestionRun` with `status: 'running'`. |
| `finishIngestionRun(run, 'succeeded' \| 'failed', completedAt?)` | Terminal transition; **no-op if already terminal** (states are immutable once `succeeded`/`failed`). |
| `summarizeIngestionBatch(records, errors)` | `IngestionBatchSummary` with total/canonicalized/dropped/failed counts. |

### Stream ingestion

| Export | Kind | Purpose |
| --- | --- | --- |
| `UnifiedMarketIngestionManager` | class | Register adapters, `start()`, `shutdown()`, `subscribeBestEffort()`, `onEvent()`, `markDegraded()`. |
| `MarketEventBus` | class | Typed event pub/sub with bounded buffer. |
| `BaseMarketStreamAdapter` | abstract class | Reconnect/heartbeat/stale handling base. |
| `BinanceStreamAdapter`, `BybitPublicStreamAdapter`, `OkxPublicStreamAdapter`, `CoinbasePublicStreamAdapter` | classes | Public crypto stream adapters. |
| `fetchLatestTickerSnapshot`, `fetchHistoricalCandles`, `fetchFundingRateFallback`, `fetchOpenInterestFallback` | functions | REST fallback helpers. |

## 4. Key Contracts

### `IngestionRecord` — [`types.ts`](../../packages/ingestion/src/types.ts)

```ts
export type IngestionRecord = {
  readonly sourceSymbol: string;     // raw, upper-cased
  readonly canonicalSymbol: string;  // normalized
  readonly assetKind: IngestionAssetKind;
  readonly provider: string;         // lower-cased
  readonly observedAt: string | null; // ISO, or null if unparseable
  readonly price: number | null;      // finite, or null
  readonly change: number | null;
  readonly changePercent: number | null;
};
```

### `MarketStreamAdapter` — [`market-stream/types.ts`](../../packages/ingestion/src/market-stream/types.ts)

```ts
export type MarketStreamAdapter = {
  providerId: UnifiedProviderId;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[], channels: MarketStreamChannel[]): Promise<void>;
  unsubscribe(symbols: string[], channels: MarketStreamChannel[]): Promise<void>;
  onEvent(callback: (event: NormalizedMarketStreamEvent) => void): () => void;
  onStatus(callback: (status: MarketStreamStatus) => void): () => void;
  getStatus(): MarketStreamStatus;
  getCapabilities(): ProviderCapabilities;
};
```

Stream status model (`StreamStatus`): `idle | connecting | connected | reconnecting |
degraded | disconnected | failed`.

Channels (`MarketStreamChannel`): `ticker | trades | orderbook | funding | liquidation |
candles | heartbeat`.

Normalized events (`NormalizedMarketStreamEvent`) are a discriminated union:
`market.tick`, `market.trade`, `market.orderbook`, `market.funding`,
`market.liquidation`, `provider.status`, `provider.error`. The payload contracts
(`MarketTick`, `TradeEvent`, …) are owned by
[`@repo/api-contracts`](./api-contracts.md).

## 5. Canonicalization Rules (deterministic)

From [`canonicalize.ts`](../../packages/ingestion/src/canonicalize.ts):

| Input | Canonical output |
| --- | --- |
| `btc/usd`, `BTCUSDT`, `BTC-USD` | `BINANCE:BTCUSDT` (USD → USDT) |
| `BINANCE:ETHUSDT` | `BINANCE:ETHUSDT` |
| `EUR/USD`, `OANDA:EUR/USD` | `OANDA:EUR_USD` (FX) |
| `AAPL.US` | `AAPL` |
| `SPY`, `QQQ`, … | `SPY` → `etf` |
| `SPX`, `NDX`, `VIX`, … | `SPX` → `index` |
| everything else | upper-cased → `stock` |

Asset-kind precedence: `BINANCE:` → crypto · `OANDA:` / `XXX_YYY` → fx · ETF set → etf ·
index set → index · otherwise stock.

## 6. Invariants & Rules

- **One canonicalization point.** Crypto/FX/stock/ETF/index normalization is centralized;
  downstream packages must not re-normalize (see [`market-symbol-universe-rule.md`](../../.claude/rules/market-symbol-universe-rule.md)).
- **Deterministic & finite.** `canonicalizeIngestionRecord` coerces non-finite numbers to
  `null` and unparseable timestamps to `null` — never NaN/Infinity into the pipeline.
- **Immutable run states.** A `succeeded`/`failed` run cannot transition again.
- **No synthetic data.** When a stream/feature is unsupported, the system degrades
  explicitly (`markDegraded`, `degradedReason`, `provider.error`) rather than inventing
  values (see [`no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md)).
- **Traceability.** Every normalized event carries `provider`, `normalizedSymbol`, and
  timestamps; reconnect/heartbeat/stale config defaults: `reconnectMaxAttempts: 20`,
  `heartbeatIntervalMs: 30_000`, `staleAfterMs: 45_000`.
- **Public-only streams.** Adapters use public endpoints — no private keys, no execution.

## 7. Provider Priority Profiles

The streaming side groups providers by intent (`IngestionProviderPriorityProfile`), aligned
with the [Market Data Provider Architecture](../market-data-provider-architecture.md):

| Profile | Order (intent) |
| --- | --- |
| Crypto live | Binance → Bybit → OKX → Coinbase |
| Derivatives / orderflow | Bybit → OKX → Binance |
| US spot reference | Coinbase → Binance |
| Stocks / ETFs | Finnhub → Polygon → Twelve Data |
| Historical | Polygon → Binance → Twelve Data → local cache |

`UnifiedProviderId` spans: `binance`, `bybit`, `okx`, `coinbase`, `finnhub`, `polygon`,
`twelve-data`, `coingecko`.

## 8. Failure Modes & Fallback

| Condition | Behavior |
| --- | --- |
| Unparseable symbol/price/timestamp | Field coerced to `null`; record can be counted as dropped in the batch summary (`price === null`). |
| Stream disconnect | Adapter transitions `connected → reconnecting` and retries up to `reconnectMaxAttempts`; exceeding it → `failed`. |
| No data within `staleAfterMs` | Status moves to `degraded` with a `degradedReason`. |
| Unsupported channel/feature | REST fallback helpers provide ticker/candle snapshots; funding/open-interest are staged-rollout placeholders. |
| Adapter error | Emits `provider.error` event; manager can `markDegraded(providerId, reason)` and route to the next provider profile. |

## 9. How to Extend — Add a Stream Adapter

1. Subclass `BaseMarketStreamAdapter`
   ([`adapters.ts`](../../packages/ingestion/src/market-stream/adapters.ts)) and implement
   `connect`/`disconnect`/`subscribe`/`unsubscribe`.
2. Add the provider to `UnifiedProviderId` and the capability registry in
   [`capabilities.ts`](../../packages/ingestion/src/market-stream/capabilities.ts).
3. Add symbol conversion in
   [`symbol-normalization.ts`](../../packages/ingestion/src/market-stream/symbol-normalization.ts)
   and frame→event mapping in
   [`mappers.ts`](../../packages/ingestion/src/market-stream/mappers.ts) (normalize to
   `@repo/api-contracts` event shapes).
4. Register via `UnifiedMarketIngestionManager.registerAdapter(...)`.
5. Validate:

   ```bash
   pnpm --filter @repo/ingestion test
   pnpm --filter @repo/ingestion typecheck
   ```

## 10. Environment Variables

| Variable | Purpose |
| --- | --- |
| `MARKET_STREAM_PROVIDER` | Default stream provider hint. |
| `CRYPTO_STREAM_PROVIDER` | Crypto live stream provider. |
| `CRYPTO_HISTORY_PROVIDER` | Crypto historical provider. |
| `ENABLE_BINANCE_STREAM`, `ENABLE_BYBIT_PUBLIC_STREAM`, `ENABLE_OKX_PUBLIC_STREAM`, `ENABLE_COINBASE_PUBLIC_STREAM` | Toggle public stream adapters. |
| `MARKET_STREAM_RECONNECT_MAX_ATTEMPTS` | Reconnect cap (default 20). |
| `MARKET_STREAM_HEARTBEAT_INTERVAL_MS` | Heartbeat interval (default 30000). |
| `MARKET_STREAM_STALE_AFTER_MS` | Staleness threshold (default 45000). |
| `MARKET_STREAM_EVENT_BUFFER_SIZE` | Event bus buffer size (default 5000). |
| `FINNHUB_MARKET_SYMBOLS`, `EODHD_MARKET_SYMBOLS`, `MARKET_SYMBOLS` | Symbol universe inputs (canonicalized on ingest). |

> Provider API keys themselves (`POLYGON_API_KEY`, etc.) are consumed by
> [`@repo/providers`](./providers.md), not configured here.

## Related Docs

- [Market Data Provider Architecture](../market-data-provider-architecture.md)
- [`@repo/providers` reference](./providers.md) · [`@repo/api-contracts` reference](./api-contracts.md) · [`@repo/db` reference](./db.md)
