# Glossary — Aurox Intelligence

Domain terms used across the Aurox Intelligence codebase, alphabetical. Each entry links to
the package, doc, or rule where the concept is implemented or enforced.

---

### Asset kind

The classification of a tradable instrument: `stock`, `etf`, `crypto`, `forex`, or
`commodity`. Asset kind always accompanies a symbol in signal and execution contexts and
drives provider selection, staleness thresholds, and tradability. See
[`docs/asset-taxonomy.md`](docs/asset-taxonomy.md) and
[`.claude/rules/market-symbol-universe-rule.md`](.claude/rules/market-symbol-universe-rule.md).

### Canonical symbol

The single normalized form of a symbol used everywhere downstream (e.g. `AAPL`, `BRK.B`,
`BTC-USD`). Normalization happens once at the provider/ingestion boundary so that signals,
the database, and execution all join on identical identifiers. Implemented in
[`packages/ingestion`](packages/ingestion/) and `packages/providers`.

### Confidence

A value in `[0, 1]` attached to every signal, forecast, and recommendation expressing how much
the system trusts the output. It must be honestly derived from data quality (reduced for stale
data, sparse bars, fallback providers, conflicting signals) — never hardcoded. Low confidence
propagates to execution as a block or confirmation requirement. See
[`.claude/rules/confidence-score-rule.md`](.claude/rules/confidence-score-rule.md).

### Cost basis

The acquisition cost of a position, `avg_cost × quantity`, where `avg_cost` uses a consistent
FIFO/VWAP method. It is the baseline against which unrealized PnL is measured. Computed once in
[`packages/db`](packages/db/) repositories using Postgres `NUMERIC` arithmetic — never re-derived
in UI. See [`.claude/rules/portfolio-accounting-rule.md`](.claude/rules/portfolio-accounting-rule.md).

### Drawdown

The decline of portfolio value from its peak, expressed as a percentage. A maximum drawdown
threshold is one of the mandatory pre-trade risk gates; breaching it rejects new orders.
Enforced in [`packages/agents`](packages/agents/) (see `drawdown-guard.test.ts`) and
documented in [`docs/RISK.md`](docs/RISK.md).

### Execution mode

Where a trade is executed: `simulation` (default), `paper` (against a connected live broker
without real capital), or `live` (gated). Mode is resolved from the account/DB context, never
from raw user input, and defaults to `simulation` when ambiguous. See
[`docs/EXECUTION.md`](docs/EXECUTION.md) and
[`.claude/rules/simulation-first-rule.md`](.claude/rules/simulation-first-rule.md).

### Factor model

A method for explaining and ranking assets by exposure to systematic factors (e.g. momentum,
value, volatility). Used by the intelligence/ranking layer to score and screen the universe.
See [`docs/factor-models.md`](docs/factor-models.md) and
[`packages/ai-market-intelligence`](packages/ai-market-intelligence/) (`ranking-engine`).

### Fallback chain

The explicit, ordered list of providers tried when the primary fails (e.g.
`polygon,twelve-data,eodhd`). Each attempt is logged; if all fail the system returns a typed
failure and lowers confidence — it never fabricates data. Configured in
`packages/providers/src/market/routing.ts`. See
[`.claude/rules/provider-fallback-rule.md`](.claude/rules/provider-fallback-rule.md).

### ForecastOutput

The canonical, deterministic result of a forecasting model: predictions with confidence
intervals, an aggregate `confidence`, a human-readable `explanation`, model name, and a
caller-supplied `generatedAt` timestamp. Forecasting is a pure package — no I/O,
no `Date.now()`/`Math.random()` internally. Implemented in
[`packages/forecasting/src/models/forecast-output.ts`](packages/forecasting/src/models/forecast-output.ts).
See [`.claude/rules/forecasting-purity-rule.md`](.claude/rules/forecasting-purity-rule.md).

### isStale

A boolean freshness flag on a quote, derived from its `timestamp` and an asset-kind staleness
threshold. When `true`, signal confidence is reduced, the UI shows a staleness indicator, and
execution must reject or require explicit confirmation. See
[`.claude/rules/quote-snapshot-rule.md`](.claude/rules/quote-snapshot-rule.md).

### Kill switch

An operational, DB-backed `halted` flag that immediately stops all execution (simulation and
live). Every execution workflow checks it at entry, activation is logged as a system event, and
re-enabling requires explicit confirmation. **(FUTURE / hardening)** — defined as a mandatory
invariant for all execution-capable workflows. See
[`.claude/rules/kill-switch-rule.md`](.claude/rules/kill-switch-rule.md).

### Lane

A configured execution context (a broker mode) that carries its own capital cap, risk caps,
allowed asset kinds, autonomy level, and approval requirements. Orders must respect their
lane's permissions before sizing or execution. Modeled as `BrokerModeConfig` in
[`packages/agents`](packages/agents/) and documented in [`docs/EXECUTION.md`](docs/EXECUTION.md).

### OHLCV

A historical price bar: Open, High, Low, Close, Volume — plus `timestamp`, `symbol`,
`assetKind`, `interval`, and `provider`. OHLCV series are sorted oldest-first, gap-aware, and
the foundation of all signal/forecast computation. See
[`.claude/rules/history-data-rule.md`](.claude/rules/history-data-rule.md).

### Paper trading

Execution against a connected live broker's sandbox/paper endpoint using no real capital. It
sits between `simulation` and `live` in the execution hierarchy and is preferred before any
live activation. See [`docs/EXECUTION.md`](docs/EXECUTION.md).

### Position sizing

Server-side computation of order quantity that respects instrument constraints and risk caps:
`min_qty` (minimum quantity), `min_notional` (minimum order value), `tick_size` (price
precision), `step_size` (quantity precision), plus `max_position_pct`, lane capital cap,
available cash, and signal confidence. Lives in [`packages/agents`](packages/agents/), never in
UI forms. See [`.claude/rules/position-sizing-rule.md`](.claude/rules/position-sizing-rule.md).

### Quote

A point-in-time price snapshot with required freshness metadata: `price`, optional
`bid`/`ask`/`volume`, `timestamp`, `provider`, `isStale`, and `assetKind`. A quote without a
timestamp is never acceptable. Normalized in [`packages/providers`](packages/providers/). See
[`.claude/rules/quote-snapshot-rule.md`](.claude/rules/quote-snapshot-rule.md).

### Readiness gate

The multi-step assertion that must fully pass before any **live** execution: broker validated,
risk gates active, execution mode explicitly live, capital verified, kill switch armed, data
fresh, observability active. Until all checks pass the system routes to simulation. Implemented
in `packages/agents/src/readiness/live-readiness-gate.ts` (see `live-readiness-gate.test.ts`).
See [`.claude/rules/live-trading-lock.md`](.claude/rules/live-trading-lock.md).

### Realized PnL

Profit or loss locked in by closed transactions, accumulated from the transaction ledger.
Distinct from unrealized PnL (open positions). Computed in [`packages/db`](packages/db/)
repositories. See [`.claude/rules/portfolio-accounting-rule.md`](.claude/rules/portfolio-accounting-rule.md).

### Recommendation actions

The discrete action a recommendation can express: **Buy**, **Watch**, **Hold**, **Reduce**, or
**Avoid**. Every recommendation must include `confidence`, an `explanation`, contributing
`factors`, and identified `risks`. Produced by
[`packages/ai-market-intelligence`](packages/ai-market-intelligence/) (`recommendation-engine`).
See [`.claude/rules/explainability-rule.md`](.claude/rules/explainability-rule.md).

### Regime

The prevailing macro/market state (e.g. risk-on vs risk-off, expansion vs contraction) inferred
from macro indicators, used to bias rankings and recommendations. Implemented by the
`macro-regime-engine` in
[`packages/ai-market-intelligence`](packages/ai-market-intelligence/). See
[`docs/macro-data-integration.md`](docs/macro-data-integration.md).

### SignalOutput

The canonical output of a signal function: `score` in `[-1, +1]`, `confidence` in `[0, 1]`, and
a required human-readable `explanation`. Signals are pure, deterministic functions with no I/O.
Aggregation is a weighted sum of validated signal outputs. Implemented in
[`packages/signals`](packages/signals/) (see `derive-signal-snapshot.ts`). See
[`.claude/rules/signal-purity-rule.md`](.claude/rules/signal-purity-rule.md).

### Slippage

The difference between the expected execution price and the actual fill price. An estimated
slippage threshold is a mandatory pre-trade risk check; orders exceeding acceptable bounds are
rejected. See [`docs/RISK.md`](docs/RISK.md) and
[`.claude/rules/risk-gates-required.md`](.claude/rules/risk-gates-required.md).

### Snapshot

An immutable, point-in-time capture of portfolio state — cash, total position value, total
value, realized/unrealized PnL, position count, the prices used, and a `source` reason. Taken
within a single DB transaction for consistency and stored append-only for audit/backtesting.
Implemented in [`packages/db`](packages/db/). See
[`.claude/rules/snapshot-consistency-rule.md`](.claude/rules/snapshot-consistency-rule.md).

### Unrealized PnL

The mark-to-market profit/loss on open positions: `(current_price − avg_cost) × quantity`.
Computed in [`packages/db`](packages/db/) using Postgres arithmetic and surfaced via read
models — never recomputed in React components. See
[`.claude/rules/portfolio-accounting-rule.md`](.claude/rules/portfolio-accounting-rule.md).

### VaR (Value at Risk)

A statistical estimate of the maximum expected loss over a horizon at a given confidence level.
One of the core portfolio risk metrics (alongside drawdown, volatility, expected shortfall). See
[`docs/risk-management.md`](docs/risk-management.md) and [`docs/RISK.md`](docs/RISK.md).

---

## Related Documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — onboarding and conventions
- [`docs/finance-system-overview.md`](docs/finance-system-overview.md) — system layers
- [`docs/signal-framework.md`](docs/signal-framework.md) — signal architecture
- [`.claude/rules/index.md`](.claude/rules/index.md) — full rule index
