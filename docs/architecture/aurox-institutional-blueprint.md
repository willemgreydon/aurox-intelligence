# Aurox Institutional Architecture Blueprint

**Status:** Living blueprint · **Version:** 1.0 · **Owner:** Architecture
**Companion docs:** [overview.md](./overview.md), [current-state.md](./current-state.md),
[PACKAGES_AND_AGENTS_STATE.md](./PACKAGES_AND_AGENTS_STATE.md),
[../EXECUTION.md](../EXECUTION.md), [../RISK.md](../RISK.md),
[../SIMULATION_ENGINE.md](../SIMULATION_ENGINE.md), [../broker-infrastructure.md](../broker-infrastructure.md)

---

## 0. Mission & non-goals

Aurox's goal is **not** "what should I buy?". It is:

> How can capital be allocated under uncertainty better than the average market while risks
> remain controlled and every decision remains fully explainable?

### Absolute safety doctrine (non-negotiable)

- **Simulation-first.** Simulation is the default and only fillable execution target today.
- **Live trading is locked.** No real-money order is ever submitted. Live remains a documented,
  gated *future* path behind: kill switch → emergency stop → hard live lock → live-readiness gates
  → risk kernel → human approval → correct account routing → immutable audit.
- Every non-simulation broker adapter must return `LIVE_TRADING_LOCKED` unless **all** gates open
  (and even then the current build does not fill live — see `lib/governance-gate.ts`).
- Every order path is **fail-closed**: uncertainty ⇒ do not execute.
- Every decision is **explainable** and **journaled** immutably.

### What this blueprint is

A domain-by-domain map of the institutional target **and the current real state of the repo**, so
the build proceeds as small, guarded, reversible vertical slices that *extend existing packages*
rather than duplicate them. **Do not scaffold parallel kernels** for systems that already exist
(brokers, risk, simulation, agents) — extend them.

---

## 1. Repository reality check (what already exists)

| Capability | Already in repo | Path |
|---|---|---|
| Broker abstraction + adapters | ✅ `BrokerAdapter`, `BrokerInterface`, `SimulatedBroker`, registry, coinbase/binance/stock adapters, supervisor | `packages/agents/src/broker/*`, `packages/agents/src/adapters/*` |
| Broker capability/decision intelligence | ✅ `evaluateBrokerDecision`, `BrokerDecision` (`simulationOnly`, `liveAllowed:false`) | `packages/agents/src/broker/broker-intelligence.ts` |
| Live readiness gate | ✅ `assertLiveReadinessGate` / `checkLiveReadiness` | `packages/agents/src/readiness/live-readiness-gate.ts` |
| Risk engine + guards | ✅ `risk-engine`, `trade-risk-engine`, capital/drawdown/position guards | `packages/agents/src/risk/*` |
| Trade workflows | ✅ simulation + unified (mode-gated) workflows | `packages/agents/src/workflows/*` |
| AI simulation agent (autonomy modes) | ✅ suggest_only / human_confirmed / autonomous_simulation | `packages/agents/src/ai-simulation-agent/*` |
| Simulation ledger (accounts/orders/positions/txns/snapshots/agent-decisions) | ✅ transactional, audited, append-only archive | `packages/db/src/repositories/simulated-trading-repository.ts` |
| Shared contracts | ✅ Zod-first | `packages/api-contracts/src/*` (simulation, market, signals, ai-agent, …) |
| Signals / forecasting (pure) | ✅ | `packages/signals/*`, `packages/forecasting/*` |
| Providers + fallback routing + health | ✅ polygon/finnhub/twelve-data/tiingo/coingecko/eodhd/binance | `packages/providers/*` |
| Intelligence composition / recommendations | ✅ | `packages/ai-market-intelligence/*` |
| Observability | ✅ | `packages/observability/*` |
| Account / dashboard / portfolio intelligence UIs | ✅ | `apps/web/app/*`, `apps/web/components/*` |
| **Immutable journal hash-chain** | ✅ **new (this pass)** | `apps/web/lib/immutable-journal.ts` |
| **Governance execution gate + approval state machine** | ✅ **new (this pass)** | `apps/web/lib/governance-gate.ts` |

**Implication:** the "create `packages/brokers`, `packages/execution`, `packages/risk-kernel`,
`packages/simulation-engine`, `packages/governance` …" instructions are mostly **already satisfied**
by `packages/agents` + `packages/db` + `packages/api-contracts`. The institutional build is therefore
about **hardening, extending, and formalising** these into the domains below — not re-creating them.

---

## 2. Domain map (20 domains)

Each domain: **purpose · inputs · outputs · contracts · DB tables · services · UI · risks · tests ·
current state · priority**. Priority: **P0** (now/active), **P1** (next slices), **P2** (later), **P3** (research).

### 1. Data Lake — P2
- **Purpose:** durable raw provider observations + canonical market history for backtests.
- **Inputs:** provider responses, ingestion runs. **Outputs:** canonical OHLCV, quote snapshots.
- **Contracts:** `OHLCV`, `MarketQuote` (`packages/providers`, `api-contracts/market`).
- **DB:** `market_quote_snapshots`, `market_daily_bars` (exist); target: partitioned long-history store.
- **Services:** `packages/ingestion`, `packages/providers`. **UI:** provider monitoring.
- **Risks:** gaps, survivorship bias, vendor drift. **Tests:** gap detection, canonicalization.
- **Current:** partial (cache + daily bars). **Gap:** 10y+ durable history.

### 2. Market Data Layer — P0 (exists)
- **Purpose:** normalized quotes/history with fallback + freshness. **I/O:** symbol → `Quote`/`OHLCV` + `isStale`.
- **Contracts:** `Quote`, `OHLCV`, `FreshnessState`. **Services:** `providers/src/market/routing.ts`.
- **Risks:** stale/fake data (forbidden), rate limits. **Tests:** fallback chain, staleness. **Current:** ✅.

### 3. Event Bus — P2
- **Purpose:** decouple signal→risk→execution→journal as events. **Today:** synchronous orchestration in workflows.
- **Target contract:** typed domain events feeding the immutable journal (see Domain 17/19).
- **Risk:** ordering/at-least-once. **Test:** event replay determinism. **Current:** implicit (workflow calls).

### 4. Asset Taxonomy — P1 (partial)
- **Purpose:** canonical asset identity + class/sector/country/currency. **Contracts:** `AssetKind`, `CatalogAsset`.
- **DB:** `market_assets`, investment universe. **Risk:** symbol drift. **Test:** canonical symbol mapping.
- **Current:** stock/etf/crypto classes; **Gap:** sector/country/alt taxonomy for portfolio kernel.

### 5. Feature Engineering — P1
- **Purpose:** pure derived features/indicators. **Contracts:** indicator outputs. **Pkg:** `packages/signals` (pure).
- **Risk:** NaN/insufficient-data leakage. **Test:** fixed-input/known-output. **Current:** ✅ indicators exist.

### 6. Signal Kernel — P0 (exists)
- **Purpose:** deterministic `{score,confidence,explanation}`. **Pkg:** `packages/signals`. **Current:** ✅.

### 7. Factor Model Kernel — P1
- **Purpose:** normalized factor stack feeding ranking/recommendation. **Pkg:** `ai-market-intelligence` (factor/ranking).
- **Test:** composite-score determinism. **Current:** partial (recommendation/ranking exist).

### 8. Portfolio Kernel — P1 (extend, do not duplicate)
- **Purpose:** holdings, multi-currency cash, exposures (asset/sector/country/currency), allocation targets, rebalance plans.
- **Inputs:** positions, quotes, FX. **Outputs:** exposure breakdown, `RebalancePlan`, risk contribution.
- **Contracts (target):** `Portfolio`, `Position`, `CashBalance`, `CurrencyExposure`, `AssetExposure`,
  `SectorExposure`, `CountryExposure`, `AllocationTarget`, `RebalancePlan`. **Reuse** existing
  simulation account/position read models + `account-intelligence-service` exposures.
- **DB (target):** `portfolios`, `portfolio_positions`, `portfolio_cash_balances` (extend simulation tables).
- **FX rule:** **no fake FX rates** — degrade if a provider rate is unavailable.
- **Risk:** multi-currency valuation errors. **Test:** exposure math, FX-missing degraded state.
- **Current:** simulation positions + account analytics (concentration, contributions) exist; **Gap:** sector/country/FX exposure, rebalance planner.

### 9. Risk Kernel — P0 (exists, extend)
- **Purpose:** pre-trade + portfolio risk; block on breach (fail-closed). **Pkg:** `packages/agents/src/risk/*`.
- **Contracts (target):** `RiskCheckResult { passed, severity, ruleId, ruleName, currentValue, limitValue, explanation, recommendedAction, blocksExecution }`.
- **Rules:** max % per position/sector/country/asset-class/crypto/illiquid; drawdown/volatility/liquidity/correlation/concentration stops.
- **Metrics (target):** VaR approx, Expected Shortfall (placeholder), max drawdown, vol, correlation matrix, diversification/liquidity scores.
- **Test:** each limit boundary; stop triggers. **Current:** ✅ capital/drawdown/position guards + engine; **Gap:** sector/country rules, VaR/ES, correlation matrix.

### 10. Execution Kernel — P0 (exists, extend)
- **Purpose:** order lifecycle, mode-gated routing, simulation fills. **Pkg:** `packages/agents/src/workflows/*`, `db simulated-trading-repository`.
- **Order types (target):** Market, Limit, Stop, StopLimit, TrailingStop, TWAP, VWAP, Iceberg, Bracket.
- **Contracts (target):** unified `Order` + `OrderPreview` + `OrderEvent` (validator/preview/planner).
- **Rules:** validate broker/asset-class/precision/min-notional/liquidity/stale-quote; **never submit without risk approval + governance gate**.
- **Test:** unsupported-order-type rejection, validation, lifecycle. **Current:** ✅ market/limit + risk-gated sim fills; **Gap:** advanced order types, TWAP/VWAP planner.

### 11. Broker Abstraction — P0 (exists, extend)
- **Purpose:** uniform adapter contract; simulation real, all live preview-only/locked.
- **Contracts:** `BrokerAdapter`, `BrokerInterface`, `SimulatedBroker` (✅). Target capability surface:
  `supportedAssetClasses/OrderTypes/Currencies`, `supportsPaper/Live/Fractional/Shorting/Options/CryptoTransfer`,
  `getAccount/Balances/Positions/Quote/previewOrder/submitOrder/cancelOrder/getOrderStatus/listOrders/listTrades/healthCheck`.
- **Brokers (target):** IBKR, Alpaca, Binance, Coinbase, Kraken, Bybit, OKX — **stub/preview-only**;
  `submitOrder` returns `LIVE_TRADING_LOCKED` until governance opens (and the build still won't fill live).
- **Test:** live-locked-by-default; sim preview; capability matrix. **Current:** ✅ sim + coinbase/binance/stock stubs; **Gap:** IBKR/Alpaca/Kraken/Bybit/OKX stubs, full capability surface.

### 12. Simulation Cluster — P0 (exists)
- **Purpose:** deterministic, transactional, auditable simulation accounting. **Pkg:** `db simulated-trading-repository`.
- **Risk:** accounting integrity. **Test:** order lifecycle, snapshot consistency. **Current:** ✅.

### 13. Backtesting / Sim Engine — P1/P3
- **Purpose:** historical backtest (10y+ where data exists, degrade otherwise), walk-forward, Monte Carlo (100k+ paths, **worker/background**, seeded reproducibility), crisis replay (dot-com / GFC / COVID).
- **Contracts (target):** `SimulationRun`, `SimulationResult { return, Sharpe, maxDrawdown, winRate, volatility, VaR, turnover, exposure, tradeCount, failureReasons, chartsData }`.
- **DB (target):** `simulation_runs`, `simulation_results`. **Worker:** `apps/worker` background jobs.
- **Rule:** no fake history; degraded state on insufficient data; seeded RNG for reproducibility.
- **Test:** deterministic backtest, Monte-Carlo seed reproducibility. **Current:** event-driven snapshots + sim accounting; **Gap:** dedicated backtest/MC/walk-forward engine.

### 14. AI Agent Mesh — P0 (exists)
- **Purpose:** suggest/confirm/autonomous-simulation agents under governance. **Pkg:** `packages/agents/src/ai-simulation-agent`.
- **Rule:** AI confidence is **not** execution permission; autonomy never reaches live. **Current:** ✅.

### 15. Knowledge Graph — P3
- **Purpose:** cross-asset relationships/narratives (dashboard already surfaces a relationship engine). **Current:** partial (observe/relationships).

### 16. Explainability Layer — P1 (formalise)
- **Purpose:** every decision answers why/which-data/factors/risks/alternatives/agent/score/evidence.
- **Contract (target):** `DecisionExplanation { decisionId, action, summary, evidence[], factorContributions[], signalContributions[], riskContributions[], newsContributions[], rejectedAlternatives[], agentId, score, confidence, limitations[], replayUrl }`.
- **Rule:** every **order preview must carry an explanation before execution**.
- **Current:** `BrokerDecision.explanation`, signal explanations, account review suggestions exist; **Gap:** unified `DecisionExplanation` + replay URL wiring.

### 17. Governance Layer — P0 (new primitive added)
- **Purpose:** kill switch, emergency stop, live lock, human approval, autonomy ceiling.
- **Contract:** `GovernanceState { killSwitchEnabled, emergencyStopEnabled, liveTradingLocked, humanApprovalRequired, maxAutonomyLevel }`;
  approval states `DRAFT|NEEDS_REVIEW|APPROVED|REJECTED|EXPIRED|BLOCKED_BY_RISK|BLOCKED_BY_KILL_SWITCH`.
- **Engine:** `resolveExecutionGate()` (pure, fail-closed; precedence kill-switch → emergency → live-lock → risk → approval → account) and `transitionApproval()` — **`apps/web/lib/governance-gate.ts` (new, 10 tests)**.
- **DB (target):** `governance_state`, `approval_requests`. **UI:** governance badges (Domain 20).
- **Test:** ✅ kill switch blocks all; live never permitted; risk/approval gates; state machine legality.
- **Current:** ✅ pure kernel + tests; **Gap:** persistence + server action + UI wiring; reconcile with existing `live-readiness-gate`.

### 18. Compliance Layer — P2
- **Purpose:** disclaimers ("simulation only · not financial advice"), jurisdiction guards, secret safety. **Current:** disclaimers pervasive; secret rules enforced.

### 19. Immutable Journal + Decision Replay — P0 (new primitive added)
- **Purpose:** append-only, tamper-evident event chain for full decision traceability.
- **Events:** `SIGNAL_CREATED, RISK_CHECKED, ORDER_PREVIEWED, ORDER_APPROVED, ORDER_REJECTED, SIM_ORDER_EXECUTED, BROKER_ORDER_BLOCKED, PORTFOLIO_REBALANCED_SIM, KILL_SWITCH_ENABLED, MANUAL_OVERRIDE`.
- **Event shape:** `{ eventId, eventType, aggregateId, actorType, actorId, payloadHash, previousHash, sequence, createdAt, payload }`.
- **Engine:** `appendJournalEvent` / `verifyJournalChain` (FNV-1a content hash chained with previousHash) — **`apps/web/lib/immutable-journal.ts` (new, 9 tests)**. Honest limitation: tamper-EVIDENCE, not crypto non-repudiation — substitute SHA-256 at the DB boundary for production.
- **DB (target):** `immutable_journal_events` (append-only, `previous_hash`), `decision_replays`.
- **Replay (target):** reconstruct inputs → alternatives → risk gates → outcome.
- **Test:** ✅ append/verify, tamper detection, broken link, reorder detection.
- **Current:** ✅ pure chain + tests; existing `simulation_agent_decisions` audit table is the persistence seam; **Gap:** generic journal table + replay UI.

### 20. Enterprise Dashboard Layer — P1 (extend existing)
- **Purpose:** executive / risk / portfolio / market / research dashboards. **Reuse** existing `/dashboard`
  (Mission Control band already added), `account-intelligence-service`, `portfolio-intelligence-service`.
- **Routes (target):** integrate into existing `/dashboard` + `/portfolio/intelligence` first; only add
  `/enterprise/*` if a clear route strategy demands it (avoid duplicate route systems).
- **Safety UI rule:** always show simulation-only / live-locked / human-approval / preview-only / risk-gates-active; never render "Execute Live Trade".
- **Current:** executive + account Mission Control + portfolio intelligence exist; **Gap:** dedicated risk/research surfaces.

---

## 3. Database migration plan (additive, reversible)

Use existing conventions (schema `app`, `NNNN_*.sql`, `create table if not exists`, rollback comment).
Target tables, in dependency order (each its own additive migration; backfills idempotent):

`broker_accounts`, `broker_capabilities`, `order_previews`, `orders`, `order_events`,
`portfolios`, `portfolio_positions`, `portfolio_cash_balances`,
`risk_rules`, `risk_check_results`, `simulation_runs`, `simulation_results`,
`governance_state`, `approval_requests`, `immutable_journal_events`, `decision_replays`.

Several already have a seam: simulation accounts/orders/positions/snapshots and
`simulation_agent_decisions` exist — extend rather than duplicate.

---

## 4. Guarded rollout (recommended slice order)

Each slice is small, build-clean, reversible, simulation-only, and ships with tests:

- **Slice 1 (this pass):** Governance gate + immutable journal **pure primitives + tests**; this blueprint. ✅
- **Slice 2:** Persist `governance_state` + `immutable_journal_events` (migrations + repository); write
  journal events from the existing simulation order path; governance badges in trade UI.
- **Slice 3:** Unified `Order`/`OrderPreview` contracts + validator + `resolveExecutionGate` wired into the
  simulation workflow (still simulation-only); explainability `DecisionExplanation` on every preview.
- **Slice 4:** Risk kernel extension — sector/country/asset-class limits + `RiskCheckResult` contract + VaR approx.
- **Slice 5:** Portfolio kernel — sector/country/currency exposure + FX-degraded state + rebalance planner (read-only).
- **Slice 6:** Backtest engine MVP (historical, degraded-on-insufficient-data) in `apps/worker`; `simulation_runs`/`results`.
- **Slice 7:** Broker capability surface + preview-only stubs for IBKR/Alpaca/Kraken/Bybit/OKX (all `LIVE_TRADING_LOCKED`).
- **Slice 8+:** Walk-forward, Monte-Carlo (seeded, background), crisis replay, decision-replay UI, enterprise risk/research dashboards.

**Never** combine a live-path change with other work; live changes require risk + readiness + rollback + observability + tests, and remain disabled by default.

---

## 5. Cross-cutting invariants

- Pure domain math in `signals`/`forecasting`/kernels; no I/O, deterministic, seeded RNG only.
- Contracts originate in `packages/api-contracts` (Zod-first); no duplicate contracts in `apps/web`.
- SQL only in `packages/db`; provider calls only in `packages/providers`.
- Multi-table writes transactional; simulation records append-only/auditable.
- No fabricated market data, FX, history, signals, or provider status — degrade instead.
- Every order path: **risk check → governance gate → (sim fill only) → journal event**, fail-closed.
- Accessibility, simulation-safe non-advisory language, and premium empty states everywhere.
