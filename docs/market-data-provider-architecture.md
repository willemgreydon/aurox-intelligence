# Market Data Provider Architecture

## Core principle

Broker authentication is not the bottleneck.  
The bottleneck is high-quality normalized market intelligence:

- clean symbol normalization
- deterministic event contracts
- resilient stream health/fallback behavior
- explainable downstream signal inputs

Execution remains simulation-first and isolated.

## Provider roles

### Authenticated providers

- Binance: primary authenticated crypto provider
- Finnhub: stocks/ETFs quote provider
- Polygon: historical OHLCV aggregation provider

### Public-only providers

- Bybit: derivatives/orderflow/futures intelligence
- OKX: derivatives/orderbook/funding/futures intelligence
- Coinbase: US spot reference pricing

## Priority model

- Crypto live: Binance -> Bybit -> OKX -> Coinbase
- Derivatives/orderflow: Bybit -> OKX -> Binance
- US spot reference: Coinbase -> Binance
- Stocks/ETFs: Finnhub -> Polygon -> Twelve Data
- Historical: Polygon -> Binance -> Twelve Data -> Local cache

## Normalized event contracts

Shared contracts are defined in `@repo/api-contracts`:

- `MarketTick`
- `TradeEvent`
- `OrderBookUpdate`
- `FundingRateEvent`
- `LiquidationEvent`

These contracts include provider/source metadata, event timestamps, normalized symbols, and raw payload attachment for traceability.

## Websocket ingestion layer

Implemented in `@repo/ingestion`:

- adapter interface (`MarketStreamAdapter`)
- status model (`idle`, `connecting`, `connected`, `reconnecting`, `degraded`, `disconnected`, `failed`)
- typed event bus channels:
  - `market.tick`
  - `market.trade`
  - `market.orderbook`
  - `market.funding`
  - `market.liquidation`
  - `provider.status`
  - `provider.error`
- unified manager (`UnifiedMarketIngestionManager`) with:
  - provider registration
  - best-effort provider/channel selection
  - duplicate event suppression
  - graceful shutdown

## Fallback behavior

REST fallback helpers are provided for:

- latest ticker snapshots
- historical candles
- funding rate/open interest placeholders for staged rollout

If stream/feature support is missing, the system degrades explicitly instead of inventing synthetic data.

## Provider capability registry

Provider capabilities are centralized in `@repo/providers` (`market/provider-capabilities.ts`) and include:

- auth mode
- websocket/rest support
- derivatives/funding/liquidation support
- intervals
- freshness and reliability profiles

This registry feeds monitoring and future routing decisions.

## Future execution isolation

This architecture intentionally does **not** include:

- autonomous live trading
- withdrawals/transfers
- leverage execution
- private account actions in ingestion paths

Market intelligence ingestion is isolated from execution surfaces so simulation/risk layers can remain deterministic and auditable.

## Safety boundaries

- no live autonomous trading
- no private key logging
- no secrets in client bundles
- public streams usable without auth
- execution remains gated and simulation-first
