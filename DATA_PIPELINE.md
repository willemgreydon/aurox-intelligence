# DATA_PIPELINE.md — AUROX INTELLIGENCE

**Version:** 1.0
**Role:** Market Data Ingestion, Canonicalization, Persistence & Streaming Architecture

---

## 1. Purpose

The Data Pipeline provides reliable market, macro, crypto, ETF, and portfolio data to the Aurox Intelligence system.

It is responsible for:

* Fetching external data
* Normalizing provider responses
* Canonicalizing symbols
* Persisting market observations
* Building read models
* Supporting historical analysis
* Supporting future real-time streams

---

## 2. Core Principles

### 2.1 Canonical First

All external data must be converted into Aurox canonical formats before use.

---

### 2.2 Provider Isolation

Provider-specific response shapes must never leak into:

* UI
* signals
* forecasting
* agents
* execution
* market intelligence

---

### 2.3 Deterministic Transformation

Same raw provider payload should always produce the same canonical output.

---

### 2.4 Graceful Degradation

If a provider fails:

* Try fallback provider
* Return partial data if safe
* Mark quality/confidence clearly
* Never fake data

---

## 3. Pipeline Overview

```text
Provider API
  ↓
Raw Provider Client
  ↓
Provider Mapper
  ↓
Canonical Market Model
  ↓
Validation
  ↓
Persistence
  ↓
Read Models
  ↓
Signals / Forecasting / UI
```

---

## 4. Supported Provider Types

```text
Market Data:
- Polygon
- Twelve Data
- Tiingo
- Finnhub
- EODHD

Crypto:
- CoinGecko
- Coinbase
- Binance

Macro:
- FRED
- ECB
- World Bank

News / Sentiment:
- News API
- Provider-specific feeds
```

---

## 5. Canonical Asset Model

```ts
export type CanonicalAsset = {
  symbol: string
  displaySymbol: string
  name: string
  assetKind: "stock" | "etf" | "crypto" | "commodity" | "bond"
  exchange?: string
  currency: string
  sector?: string
  industry?: string
  country?: string
  isTradable: boolean
  providerSymbols: ProviderSymbolMap
  createdAt: string
  updatedAt: string
}
```

---

## 6. Provider Symbol Map

```ts
export type ProviderSymbolMap = {
  polygon?: string
  twelveData?: string
  tiingo?: string
  finnhub?: string
  eodhd?: string
  coingecko?: string
  coinbase?: string
  binance?: string
}
```

---

## 7. Canonical Quote

```ts
export type CanonicalQuote = {
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  price: number
  change: number
  changePercent: number
  previousClose?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  currency: string
  marketState: "open" | "closed" | "extended" | "unknown"
  provider: string
  providerTimestamp?: string
  observedAt: string
  quality: DataQuality
}
```

---

## 8. Canonical OHLCV Bar

```ts
export type CanonicalOhlcvBar = {
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  interval: "1m" | "5m" | "15m" | "1h" | "1d" | "1w" | "1mo"
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  provider: string
  quality: DataQuality
}
```

---

## 9. Data Quality

```ts
export type DataQuality = {
  completeness: number
  freshness: number
  providerReliability: number
  isDelayed: boolean
  warnings: string[]
}
```

Score range:

```text
0.0 = unusable
1.0 = excellent
```

---

## 10. Provider Routing

Provider routing resolves the best available provider by:

* Read type
* Asset kind
* Provider health
* API key availability
* Cost
* Rate limits
* Historical coverage

Read types:

```text
quote
history
metadata
news
macro
crypto_onchain
```

---

## 11. Fallback Chain

Example:

```text
quote / stock:
Polygon → Twelve Data → Tiingo → Finnhub → EODHD

history / stock:
Polygon → EODHD → Twelve Data → Tiingo

quote / crypto:
CoinGecko → Coinbase → Binance
```

---

## 12. Raw Data Persistence

Recommended raw storage:

```text
app.raw_provider_observations
```

Fields:

```ts
export type RawProviderObservation = {
  id: string
  provider: string
  readType: string
  providerSymbol: string
  canonicalSymbol?: string
  payload: unknown
  receivedAt: string
  hash: string
}
```

Raw storage is useful for:

* Debugging
* Reprocessing
* Auditing
* Provider comparison

---

## 13. Canonical Persistence

Recommended tables:

```text
app.assets
app.market_quotes
app.market_ohlcv_bars
app.market_provider_health
app.market_data_quality_events
app.market_ingestion_runs
```

---

## 14. Ingestion Run

```ts
export type IngestionRun = {
  id: string
  provider: string
  readType: string
  status: "started" | "completed" | "failed" | "partial"
  requestedSymbols: string[]
  successfulSymbols: string[]
  failedSymbols: string[]
  startedAt: string
  completedAt?: string
  errorMessage?: string
}
```

---

## 15. Provider Health

```ts
export type ProviderHealth = {
  provider: string
  status: "healthy" | "degraded" | "down"
  latencyMs: number
  successRate: number
  rateLimitRemaining?: number
  lastSuccessfulReadAt?: string
  lastFailureAt?: string
  message?: string
}
```

---

## 16. Freshness Rules

Suggested freshness thresholds:

```text
crypto quote: <= 60 seconds
stock quote: <= 15 minutes if delayed provider
daily OHLCV: current or previous market day
macro: provider-dependent
metadata: <= 30 days
```

---

## 17. Data Validation Rules

Reject or downgrade data if:

* Price <= 0
* High < Low
* Close outside High/Low range
* Volume < 0
* Timestamp missing
* Provider symbol cannot be canonicalized
* Currency missing
* Data stale beyond threshold

---

## 18. Canonicalization Rules

Symbol canonicalization must handle:

* Provider-specific suffixes
* Exchange suffixes
* Crypto pair formats
* Stablecoin quote pairs
* ETF tickers
* Delisted or unsupported assets

Examples:

```text
AAPL.US → AAPL
BINANCE:BTCUSDT → BTC-USD
XNAS:MSFT → MSFT
```

---

## 19. Read Model Generation

Read models should be created for:

* Dashboard market cards
* Invest overview
* Asset detail pages
* Portfolio screens
* Simulation views
* Admin provider status
* Intelligence rankings

Rules:

* UI consumes read models only
* Read models are route-specific
* No raw provider payload in UI

---

## 20. Streaming Architecture Future

Future streaming pipeline:

```text
WebSocket Provider
  ↓
Stream Consumer
  ↓
Canonical Tick Mapper
  ↓
In-Memory Buffer
  ↓
Aggregation Window
  ↓
DB Write
  ↓
Realtime UI / Signals
```

---

## 21. Canonical Tick

```ts
export type CanonicalTick = {
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  price: number
  size?: number
  bid?: number
  ask?: number
  timestamp: string
  provider: string
}
```

---

## 22. Aggregation Windows

Ticks may aggregate into:

```text
1m
5m
15m
1h
1d
```

Aggregation must be deterministic:

```text
open = first price
high = max price
low = min price
close = last price
volume = sum size
```

---

## 23. Backfill Pipeline

Backfill supports:

* New asset onboarding
* Missing historical ranges
* Provider migration
* Feature recalculation

Backfill rules:

* Must be idempotent
* Must not duplicate bars
* Must preserve provider attribution
* Must record ingestion run

---

## 24. Anomaly Detection Feed

The pipeline should flag:

* Price gaps
* Volume spikes
* Missing candles
* Provider disagreement
* Stale data
* Correlation breakdown inputs

---

## 25. Provider Disagreement

If providers disagree beyond threshold:

```text
mark data_quality warning
lower confidence
prefer no execution
```

Example:

```text
Polygon price differs from Tiingo price by > 2%
```

---

## 26. Observability

Pipeline must log:

* Provider
* Read type
* Symbols requested
* Symbols failed
* Latency
* Error code
* Data quality score
* Fallback used

---

## 27. Failure Modes

Common failures:

```text
Missing API key
Provider timeout
Rate limit exceeded
Malformed response
Symbol unsupported
Stale data
Partial response
DB unavailable
```

Default behavior:

```text
degrade safely
never fabricate values
```

---

## 28. Testing Requirements

Minimum tests:

* Provider response mapping
* Canonical quote validation
* OHLCV validation
* Symbol canonicalization
* Provider fallback
* Data quality downgrade
* Freshness scoring
* Backfill idempotency
* Duplicate prevention
* Read model generation

---

## 29. Security Rules

Never expose:

* Provider API keys
* Raw secrets
* Internal provider credentials
* Broker credentials

Provider keys must remain server-side only.

---

## 30. Final Directive

The pipeline is the bloodstream of Aurox Intelligence.

Bad data creates bad signals.

Bad signals create bad trades.

If data quality is uncertain:

```text
LOWER CONFIDENCE OR DO NOT TRADE
```
