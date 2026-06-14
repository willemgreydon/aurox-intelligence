# Aurox Intelligence — Product Requirements Document

**Status:** Draft
**Date:** 2026-06-13
**Owner:** Product
**Source:** Synthesized from repository docs, source structure, competitive scan (2026-06-13), UX heuristic evaluation (2026-06-13), and feature-gap audit (2026-05-08).
**Product phase:** Pre-live. The system runs in **simulation** today for development and testing. The committed product destination is **live real-money trading** — with bank-account funding connectivity and Claude Finance — reached through a staged, safety-gated rollout. Throughout this document, "simulation-first" denotes the *current phase and the permanent safety on-ramp*, not a permanent product boundary. Live capabilities are marked **[Roadmap / Gated]**; they are sequenced behind the readiness gate, not deprioritized.

---

## Summary

Aurox Intelligence is a deterministic-first, multi-asset financial intelligence and **real-money trading platform** targeting the serious self-directed investor and small systematic operator. The product's end-state is live execution with **real capital** — including connected **bank-account funding APIs** and **Claude Finance**-powered intelligence — across stocks, ETFs, and crypto. **Simulation is the current operating phase (for development and testing) and the permanent, mandatory safety on-ramp** — not the product's ceiling. Every account begins in simulation and is promoted to live only after passing an auditable readiness gate; once live, the same signal-to-fill logic moves real money. The platform combines provider-backed market data with explainable, reproducible signal and forecast computation, an accounting-grade trading ledger (which doubles as the live ledger), and a gated, staged path from simulation → guarded manual live → AI-suggested live → bounded autonomous live. AI augments human decision-making — it does not replace it. Every signal, forecast, and recommendation carries a human-readable explanation and a confidence score honestly derived from data quality. Risk gates are mandatory on every execution path, simulation and live alike. The product occupies a market quadrant that is currently empty: deep explainable AI combined with accounting-grade execution discipline on real capital.

---

## 1. Problem Statement

### 1.1 The Bifurcated Market

The retail systematic trading market is split into two camps that do not adequately serve the serious self-directed investor:

- **Analysis-only AI platforms** (Danelfin, Trade Ideas, Kavout): Strong explainable signals, reproducible scoring, and regulatory-grade traceability — but zero execution capability. A user must manually bridge the gap to a brokerage, losing auditability in the transfer.
- **Execution platforms with shallow AI** (Robinhood, Public, Composer, eToro): Real brokerage integration and frictionless onboarding, but AI is LLM-derived or black-box, confidence is never surfaced, pre-trade risk gates do not exist as a first-class concept, and simulation is either absent or a toy with no accounting integrity.

The high-value quadrant — deep explainable AI combined with accounting-grade execution — is unoccupied.

### 1.2 The Simulation-to-Live Trust Gap

Research indicates that approximately 62% of systematic retail traders abandon an algorithmic approach within three months of going live. The primary failure mode is not strategy weakness — it is that the transition from simulation to live trading is structurally unsafe: simulation results are not predictive of live outcomes because sim environments do not faithfully model slippage, partial fills, latency, fees, or data gaps. Users have no principled, auditable pathway to confirm their strategy is ready for live capital.

### 1.3 Black-Box AI Distrust

Consumer AI integrations in finance produce recommendations without explanations, confidence scores without honest derivation, and forecasts without uncertainty ranges. Investors who have been burned by unexplained drawdowns driven by algorithmic actions they did not understand are actively seeking systems that can show their work.

### 1.4 Regulatory Tailwinds Create Urgency

The EU AI Act's high-risk obligations become enforceable in August 2026. They require: traceability of automated decisions, explainability at the point of action, human oversight mechanisms, and auditable decision trails. FINRA Regulation Best Interest similarly requires that recommendations be in the client's best interest and documented. Platforms that can demonstrate EU AI Act-aligned explainability and audit trails gain a structural compliance advantage.

---

## 2. Goals

| # | Goal | Rationale |
|---|---|---|
| G0 | **Reach live real-money trading** across stocks, ETFs, and crypto — with connected bank-account funding and Claude Finance intelligence — via a staged, safety-gated rollout | The committed product destination; simulation is the on-ramp, not the endpoint |
| G1 | Enable serious self-directed investors to run strategy-driven trading with institutional-grade accounting discipline — proven in simulation, then carried unchanged into live | Differentiates from toy simulation; the same ledger serves sim and live |
| G2 | Make every signal, forecast, and recommendation explainable and traceable to its input data and computation | Directly addresses black-box distrust; EU AI Act traceability alignment |
| G3 | Provide a principled, auditable "Simulation → Live Promotion" workflow — including bank-account funding verification — that gives users evidence-backed confidence before real capital moves | Attacks the 62% systematic churn; the bridge from on-ramp to live |
| G4 | Make pre-trade risk gates visible, understandable, and user-facing — not only internal safety infrastructure | Converts an internal rule into a product differentiator |
| G5 | Occupy the empty quadrant: deep explainable AI + accounting-grade execution on real capital, accessible at retail cost | Competitive positioning |
| G6 | Provide configurable strategy lanes with enforced per-lane capital limits, risk caps, and kill-switch capability | Enables systematic portfolio discipline; roadmap toward bounded autonomy |
| G7 | Maintain a zero-tolerance policy on data fabrication and opaque AI authority — AI augments, never overrides | Safety and trust foundation |
| G8 | Integrate Claude Finance as an explainable side-input to deterministic intelligence — never as execution authority | Adds AI depth while preserving determinism and human-in-the-loop control |

---

## 3. Non-Goals

The following are out of scope **for the current (pre-live) product cycle**. Live real-money trading, bank-account funding, and bounded autonomy are committed product destinations (see G0) — the items below are *sequenced behind the safety-gated rollout*, not abandoned. Each is gated, not cancelled.

| Non-Goal (this cycle) | Reason / sequencing |
|---|---|
| Mass-market Robinhood-style onboarding (frictionless sign-up, instant live trading) | Aurox targets the serious operator, not the casual investor; trust requires friction — this remains a permanent positioning choice, not a phase |
| Live autonomy enabled by default or as a near-term general release | Bounded autonomous live (`ai_autonomous_live_limited`) IS the staged destination, but only per approved lane, behind the multi-step readiness gate and always-on kill switch — never a global/default toggle |
| LLM-based strategy generation (ask the AI to build your strategy) | AI (incl. Claude Finance) is a signal side-input and explainability engine, not a strategy author — permanent product contract |
| AI as execution authority (AI decides and trades real money without human confirmation) | AI is augmentation, not authority; human-in-the-loop is non-negotiable even in the live end-state (until/unless a lane is explicitly approved for bounded autonomy) |
| Opaque or black-box scoring (signals/forecasts without explanation and confidence) | Violates the core product contract and EU AI Act alignment — permanent |
| Immediate / ungated live order routing and bank-account fund movement in this cycle | Live brokerage + bank-funding APIs are the destination (G0/G3), but routing real money is unlocked only after `assertLiveReadinessGate` passes; broker adapters default to sandbox until then |
| Tax optimization, financial planning, or wealth management advice | Out of product scope; the system is explicitly not financial advice |
| Mobile-native application | Workstation-first design; mobile is not a current deliverable |

---

## 4. Personas Affected

### 4.1 Sione — The Serious Self-Directed Investor

**Role and Context:** Mid-career professional with 5–15 years of investing experience. Manages a personal portfolio of €25K–€250K across stocks, ETFs, and selective crypto. Intermediate-to-expert level. Uses a desktop or laptop workstation. Has tried algorithmic approaches before and been burned by black-box tools or the sim→live gap.

**Primary Goal:** Run a disciplined, systematic strategy in simulation, validate that it behaves as expected, and promote it to live execution with documented evidence — not hope.

**Pain Points:**
- Current simulation tools do not model real execution (slippage, partial fills, fees), so sim P&L is untrustworthy.
- AI recommendation tools cannot explain why they are recommending an action, making it impossible to evaluate signal quality.
- No principled audit trail when something goes wrong in live trading.
- Risk management is manual and post-hoc, not pre-trade and automated.

**Behaviors:** Reviews market data and signals daily. Runs strategy experiments in simulation for weeks before any capital commitment. Values reproducibility: wants to know a signal would have said the same thing with the same data yesterday. Uses ⌘K / keyboard-first navigation.

**What Success Looks Like:** Can show a 90-day simulation run with auditable order history, confidence-calibrated signals, and a clear risk gate summary — then promote to live with a documented readiness gate that feels defensible, not reckless.

**Quote:** "I don't need AI to trade for me. I need AI to tell me what it sees, why it sees it, and what could go wrong — and then let me decide."

---

### 4.2 Marta — The Small Systematic Operator

**Role and Context:** Runs a small personal fund or family office with systematic strategies across multiple asset classes. Expert level. Has programming background; comfortable reading technical documentation. Evaluates tools by their auditability and risk integrity, not their UI polish.

**Primary Goal:** Configure strategy lanes with enforced capital and risk limits, run parallel strategies in simulation simultaneously, and have a kill-switch mechanism that actually works under stress.

**Pain Points:**
- Consumer platforms offer no per-strategy capital isolation — one bad trade can affect the whole account.
- No audit-grade accounting: can't prove to herself (or an advisor) what happened and why.
- Signal platforms don't integrate with execution, so she has to manually implement what the signal says.
- No mechanism for testing whether a strategy change improves or degrades live performance.

**Behaviors:** Monitors multiple lane dashboards simultaneously. Reviews provider health status before opening. Exports order/transaction history for her own records. Uses admin monitoring to verify data pipeline health.

**What Success Looks Like:** Has three parallel strategy lanes running in simulation, each with a dedicated capital cap and risk envelope. Promoting one lane to live does not affect the others. Can see exactly which signals drove which orders and what the pre-trade risk gate said.

**Quote:** "A kill switch that lives in memory is not a kill switch. I need to know it survives a restart."

---

### 4.3 Theo — The Analytically Curious Trader

**Role and Context:** Active individual investor, intermediate level, 2–5 years of experience. Uses the platform primarily for market intelligence and signal discovery rather than systematic strategy execution. May or may not use simulation trading.

**Primary Goal:** Understand what signals are saying about specific assets, why, and how confident the system is — then make better-informed discretionary trades.

**Pain Points:**
- Most AI tools give a "buy/sell" without any indication of how reliable or fresh the underlying data is.
- News and macro context are disconnected from signal scores — no "why does this news matter for AAPL?"
- Data freshness is invisible: no way to know if a price shown is 5 seconds or 5 minutes old.

**Behaviors:** Starts on /market or /signals daily. Drills into individual asset pages. Uses command palette (⌘K) for fast navigation. Values confidence meters and explanation text over visual decoration.

**What Success Looks Like:** Looks at an asset card, understands the signal score and confidence in 3 seconds, reads a one-line explanation, sees whether the data is fresh, and decides whether to investigate further.

**Quote:** "Tell me the confidence. If you're 30% sure, I want to know that before I do anything with the recommendation."

---

### 4.4 Operator/Admin — The Platform Monitor

**Role and Context:** Internal team member or power-user admin who monitors provider health, live-readiness gate status, lane configurations, and system observability. Expert level. Technical background.

**Primary Goal:** Know at a glance whether the data pipeline is healthy, whether any provider is degraded, and whether a given account's live-readiness gate would pass right now.

**Pain Points:**
- Provider health status is partially implemented; some runtime health fields are missing.
- Live-readiness gate state is not exposed in a single dashboard view.
- Lane configurations are not easily inspectable without direct DB access.

**Behaviors:** Monitors /admin/monitoring daily. Checks broker health endpoints before any live-adjacent operation. Validates provider fallback behavior under degraded conditions.

**What Success Looks Like:** A single admin surface that shows provider health (with fallback chain status), live-readiness gate results per account, kill-switch states, and lane configurations — all without needing DB access.

---

## 5. User Journeys

### Journey A: Discover → Signal → Simulate → Audit

**Current State (pain):**
1. User navigates to /market, sees a list of assets with prices.
2. Clicks into /stocks/[symbol] for a specific asset.
3. Sees a signal score (a number), no explanation of what drove it, no confidence displayed with a legend.
4. Decides to paper-trade. Creates an order manually.
5. Order goes through — but pre-trade risk gate outcome is never shown; user doesn't know what was checked.
6. Post-fill, user has to manually reconstruct what happened from the orders list. No snapshot or audit view.

**Desired State:**
1. User navigates to /market. Every asset card shows a signal label (Bullish/Bearish/Neutral), confidence indicator with threshold legend, and a data-freshness marker.
2. Clicks into /stocks/[symbol] — the asset detail shows: current price (with staleness indicator), signal explanation ("EMA(20) crossed above EMA(50), volume confirms, RSI at 58"), confidence interval on any forecast, relevant news with "why this matters for [symbol]" annotation.
3. Taps "Simulate Trade" — pre-populated with position sizing based on the active lane's risk config. The risk gate results are shown pre-submit: "Cash: OK (€8,400 available) | Max position: OK (≤10%) | Slippage estimate: 0.12% | Signal confidence: 71%."
4. Submits. Order fills deterministically in simulation. A snapshot is taken.
5. User navigates to /invest/orders — sees the full order history with fill price, pre-trade risk gate summary, and the signal that informed the decision.
6. Navigates to /invest/simulation — sees running P&L, position values (computed in DB), and a link to the audit export.

---

### Journey B: Prove It In Sim → Promote to Live

**Current State (pain):**
1. No principled workflow exists to evaluate sim readiness for live promotion.
2. /invest/live-readiness exists but the gate checks are not fully surfaced to the user as a structured checklist.
3. User has no exportable audit trail to review before committing capital.
4. Live execution is locked, but the path to unlocking it is opaque.

**Desired State (partially roadmap):**
1. User has been running a lane in simulation for N days (configurable minimum).
2. Navigates to /invest/live-readiness — sees a structured readiness checklist: broker connected and validated (sandbox passing), risk gate active for this lane, signal confidence meets minimum threshold (≥0.6), kill switch tested, capital in live broker account verified, data freshness confirmed, observability active.
3. Each check shows its current status and the evidence: "Broker sandbox passed 47/47 test orders | Kill switch last tested 2026-06-10 | Average signal confidence this lane: 0.74."
4. User reviews and downloads an audit export: simulation run summary, signal history with explanations, risk gate outcomes, P&L attribution.
5. User confirms promotion — a privileged server action sets the lane's execution mode to live in the DB. Live is never enabled by a URL parameter or form field.
6. First live order routes through the same risk gate. A confirmation dialog shows: "This is a LIVE order. Estimated notional: €2,340. Risk gate: PASSED. Slippage estimate: 0.09%." User confirms.
7. Post-fill, the live order appears in the audit trail alongside all simulation history.

---

### Journey C: Operator Monitors Provider Health + Live Readiness

**Current State (pain):**
1. /admin/monitoring exists but provider runtime health fields are partially implemented.
2. No single view shows live-readiness gate status per account.
3. Kill-switch states are not inspectable through the UI.
4. Provider fallback chain status is not surfaced.

**Desired State:**
1. Operator navigates to /admin/monitoring — sees a provider health matrix: each configured provider (polygon, tiingo, coingecko, etc.) with last-successful-call timestamp, current health status (healthy/degraded/rate-limited), and fallback chain position.
2. A live-readiness panel shows each account with a live-capable lane: readiness gate current status, last gate check time, which checks are failing and why.
3. Kill-switch panel shows: global halt state, per-account halt state, last activation timestamp if any, and a test-fire capability (sandbox only).
4. Operator can trigger a manual provider health check from the UI without touching the DB.

---

## 6. Functional Requirements

### 6.1 Market Data

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| MD-01 | System must support multi-provider fallback routing for all market data (quotes, OHLCV, fundamentals, news). Supported providers: polygon (default stock/ETF), twelve-data, tiingo, coingecko (crypto), finnhub, eodhd. | Must | Shipped |
| MD-02 | Every quote must carry a `timestamp`, `provider`, and `isStale` flag. Staleness thresholds: stocks/ETFs (market hours) 60s; crypto 30s; any quote >15 min always stale. | Must | Shipped |
| MD-03 | When a provider fails, the system must attempt all fallback providers in configured priority order before returning a typed failure. Fallback must be logged; `isFallback: true` must propagate to callers. | Must | Shipped |
| MD-04 | System must never fabricate, interpolate, or substitute market data. Missing data must return `null` or a typed `DataUnavailable` state with `confidence: 0`. | Must | Shipped |
| MD-05 | Provider health status (last-call time, HTTP status, rate-limit state) must be recorded and observable via /admin/monitoring. | Must | Partial |
| MD-06 | OHLCV data must be returned sorted ascending (oldest-first), with `hasGaps` flag when bars are missing in a range. Signal computations must respect a declared minimum-bars constant and return `confidence: 0` if unmet. | Must | Shipped |
| MD-07 | All symbols must be canonical (e.g., `AAPL`, `BTC-USD`). Normalization happens once, at the provider/ingestion boundary. Asset kind must always accompany symbol. | Must | Shipped |
| MD-08 | Provider API keys must never appear in client-accessible code. All keys accessed server-side via validated config helpers. | Must | Shipped |
| MD-09 | Rate-limit responses (HTTP 429) must trigger exponential backoff with jitter. Provider must be marked rate-limited in health state; fallback chain must skip it during cooldown. | Must | Shipped |
| MD-10 | Provider batch-fetch must be used when loading quotes for multiple symbols (portfolio page, rankings). Maximum provider calls per page render: 1 batch for portfolio, 1 batch for market overview, 2 for asset detail. | Must | Shipped |

### 6.2 Analytics, Signals, and Forecasting

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| AN-01 | All signal functions must be pure and deterministic: same input → same output, no I/O, no `Math.random()`, no `Date.now()` internally. Located in `packages/signals`. | Must | Shipped |
| AN-02 | Signal output contract: `{ score: number (-1..+1), confidence: number (0..1), explanation: string (non-empty) }`. Insufficient data must return `{ score: 0, confidence: 0, explanation: "insufficient_data: ..." }` — never NaN. | Must | Shipped |
| AN-03 | Confidence must be honestly derived from data quality. Mandatory reductions: stale quote (≥30% reduction), below-ideal bar count (proportional reduction), fallback provider used (≥20% reduction), conflicting signals (≥15% reduction), data gaps (≥25% reduction). Hardcoded confidence values are forbidden. | Must | Shipped |
| AN-04 | Minimum confidence thresholds for execution: assisted suggestion display ≥0.3; lane promotion to live ≥0.6 (roadmap); live execution (configurable, default ≥0.7). | Must | Shipped (sim); Roadmap (live) |
| AN-05 | Forecasting output must include: predictions with upper/lower confidence bounds per bar, aggregate confidence (0..1), explanation, modelName, and a caller-provided `generatedAt` timestamp (not `Date.now()` internally). Located in `packages/forecasting` (pure, no I/O). | Must | Shipped |
| AN-06 | Technical indicators (RSI, EMA, MACD, Bollinger Bands) must declare a `MIN_BARS` constant, validate for NaN/Infinity inputs, and throw a typed `InsufficientDataError` when inputs are below minimum. | Must | Shipped |
| AN-07 | Signal aggregation: `FinalScore = Σ(weight_i × score_i) / Σ(weight_i)` applied only to validated `SignalOutput` objects with `confidence > 0`. | Must | Shipped |
| AN-08 | Signal history, accuracy metrics, and news-impact correlation views should be exposed on asset detail pages (signal history tab, accuracy/ROI tracking, news-to-signal-impact). | Should | Partial |
| AN-09 | **Claude Finance** integration must serve as an explainable AI side-input for signal context and recommendation generation, scoped such that its output is: (a) clearly labeled as AI-generated, (b) treated as one signal input carrying its own confidence, (c) accompanied by a human-readable rationale, and (d) **never** allowed to override or bypass deterministic risk gates or move real capital on its own authority. Degraded/unavailable Claude Finance responses must fall back safely (deterministic signals continue unaffected). | Must | Partial |

### 6.3 Explainability

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| EX-01 | Every signal, forecast, and recommendation must carry a non-empty `explanation` field — no placeholder text (e.g., "signal computed" is forbidden). | Must | Shipped |
| EX-02 | Explanations must state: what the signal detected, direction and magnitude, and any caveats (stale data, low bar count, fallback provider). | Must | Shipped |
| EX-03 | Recommendation output must include: `action` (Buy/Watch/Hold/Reduce/Avoid), `score`, `confidence`, `explanation`, `factors[]` (contributing factors), `risks[]`, and `generatedAt`. | Must | Shipped |
| EX-04 | The UI must display explanations at the point of action — on signal cards, on trade ticket pre-submit, and in order history. Never hide explanations for low-confidence outputs. | Must | Partial |
| EX-05 | The ConfidenceMeter component must include a threshold legend (e.g., ≥0.7 = high, 0.4–0.7 = moderate, <0.4 = low, 0 = no signal) visible to users — not just a raw percentage. | Must | Gap (UX finding) |
| EX-06 | Knowledge-graph-backed explainability should surface asset-entity relationships (e.g., "AAPL is affected by this news because: supply chain exposure"). | Should | Partial |

### 6.4 Simulation Execution Engine

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| SE-01 | Simulation is the default and mandatory execution target. The system must never default to live execution. Execution mode is read from the DB per account/lane — never from user-supplied request parameters. | Must | Shipped |
| SE-02 | Simulation must maintain a real persisted ledger: `simulation_accounts`, `simulation_portfolios`, `simulation_positions`, `simulation_orders`, `simulation_transactions`, `simulation_snapshots`. No in-memory portfolio state. | Must | Shipped |
| SE-03 | All multi-table writes (order + transaction + position + account balance) must be atomic within a single DB transaction. Partial writes are forbidden. | Must | Shipped |
| SE-04 | Order lifecycle state machine must be enforced: `PENDING → SUBMITTED → FILLED`, `PENDING/SUBMITTED → REJECTED`, `PENDING/SUBMITTED → CANCELLED`. No terminal state may transition further. | Must | Shipped |
| SE-05 | Every order fill must produce a matching `simulation_transactions` record and update `simulation_positions` atomically. | Must | Shipped |
| SE-06 | Portfolio snapshots must be taken: after every order fill, on a configurable schedule (default daily), and before any account reset. Snapshots must be taken within a single DB transaction (consistent read of account + positions + prices). Prices used must be recorded. | Must | Shipped |
| SE-07 | Simulation records are append-only. Archive pattern only — no `DELETE FROM simulation_orders`. Account reset archives, never truncates. | Must | Shipped |
| SE-08 | Portfolio P&L (unrealized PnL, realized PnL, cost basis, position value) must be computed in the DB using `NUMERIC` arithmetic — not recomputed in application layer or UI components. | Must | Shipped |
| SE-09 | Fee, slippage, and latency metadata hooks must be present in the simulation execution model (fields on order/transaction records). Values may be estimated/configurable, but the model must be structurally present for sim-to-live fidelity. | Must | Shipped (model); Partial (UI) |
| SE-10 | The simulation engine must apply the same risk gate (`runPreTradeRiskCheck`) as the live execution path. No dev-bypass, no simulation-only shortcut through risk. | Must | Shipped |
| SE-11 | Simulation account cash currency should be configurable (target: EUR default, with USD fallback). FX conversion methodology must be documented and applied consistently. | Should | Gap |

### 6.5 Strategy Lanes

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| SL-01 | Lanes must define: per-lane capital limit, asset scope (stocks/ETFs/crypto), execution policy (manual/assisted/autonomous-roadmap), and micro-trading ratio. | Must | Shipped |
| SL-02 | Per-lane capital caps must be enforced at the risk-gate level — not just configured. Exceeding a lane's capital limit must reject the order. | Must | Shipped |
| SL-03 | Per-lane kill switch must be DB-backed and checked at the entry of every execution workflow. Kill switch state must survive process restarts. | Must | Roadmap |
| SL-04 | Autonomy level must be a lane-level setting. A global autonomous mode toggle is forbidden. Each lane must independently specify its permitted automation level. | Must | Roadmap |
| SL-05 | Lane IDs must be displayed in human-readable form in the UI (e.g., "AI Copilot Lane" not "ai_copilot_lane"). | Should | Gap (UX finding) |
| SL-06 | Lane KPIs (current P&L, drawdown, capital utilization, order count) should be surfaced on per-lane dashboard views. | Should | Partial |

### 6.6 Risk Gates and Kill Switch

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| RG-01 | `runPreTradeRiskCheck` must execute before any order submission (simulation or live). The following checks are mandatory: cash availability (from DB, not cache), max position size, max drawdown, liquidity threshold, slippage threshold, instrument constraints (min_qty/min_notional/tick_size/step_size), stop-loss/exit policy, anomaly/confidence threshold (configurable minimum), lane permissions, data freshness. | Must | Shipped |
| RG-02 | On any failed risk check: reject order, preserve all state, log failure reason with order context, return a typed error to the caller. Never proceed past a failed risk check. | Must | Shipped |
| RG-03 | No dev-bypass patterns are permitted: no `skipRiskForDev`, no `if (NODE_ENV === "development")` risk skip, no feature flags that disable risk in production or simulation. | Must | Shipped (rule) |
| RG-04 | Kill switch must exist in every execution workflow as an entry-point check. Must be stored in the DB (not in-memory). Must be activatable via a privileged server action without a code deploy. Must log a system event when activated. | Must | Shipped (pattern); Partial (UI) |
| RG-05 | Re-enabling execution after a kill-switch halt must require explicit confirmation — not passive expiry. | Must | Roadmap |
| RG-06 | Pre-trade risk gate results must be surfaced to the user in the UI at the point of trade submission: which checks passed, which failed, and why. This is a product differentiator, not only internal safety infrastructure. | Must | Gap |
| RG-07 | Position sizing must respect: `min_quantity`, `min_notional`, `tick_size`, `step_size`, `max_position_pct`, `lane_capital_cap`, and available cash — all server-side. User-submitted quantity must be re-validated server-side before execution. | Must | Shipped |

### 6.7 Live Readiness and Promotion [Roadmap]

> **Note:** The following requirements describe the target state for the live execution pathway. This pathway is gated and NOT currently shipped for production use. Items are included here to establish the design contract for staged implementation.

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| LR-01 | Live execution may only be enabled by passing `assertLiveReadinessGate`. This gate requires all of: broker adapter validated (sandbox confirmed), risk gates active for the target lane, execution mode set in DB by a privileged server action, capital in live broker account verified, kill switch armed and tested, data freshness confirmed, observability active. | Must | Roadmap |
| LR-02 | Live execution mode is set in the DB by a privileged server action — never from a URL parameter, form field, or environment variable alone. | Must | Roadmap |
| LR-03 | `/invest/live-readiness` must display a structured readiness checklist with per-check status, evidence, and last-check timestamp. | Must | Partial |
| LR-04 | A "Simulation → Live Promotion" workflow must produce a downloadable audit export: simulation run summary, signal history with explanations, risk gate outcomes per order, P&L attribution, and lane configuration at time of promotion. | Must | Roadmap |
| LR-05 | The staged live execution model is: (1) `manual_live_guarded` — user-triggered, no autonomy; (2) `ai_suggested_live` — AI proposes, human confirms per-order or within a bounded session; (3) `ai_autonomous_live_limited` — autonomous for approved lanes within strict per-lane capital and risk envelope, always-on kill switch required. Stages must be gated sequentially. | Must | Roadmap |
| LR-06 | Broker adapters must default to sandbox endpoint. Live endpoint activation requires explicit configuration AND readiness gate passage. Sandbox and live credentials must be distinct environment variables. | Must | Shipped (pattern) |
| LR-07 | Micro-order feasibility must be validated per broker and instrument (min notional, min qty, tick size, step size) before order routing. | Must | Roadmap |
| LR-08 | Daily micro-trading guardrails for autonomous lanes should include: daily trade cap, minimum signal confidence threshold per trade, maximum spread tolerance, maximum volatility threshold. | Should | Roadmap |
| LR-09 | Live promotion of an account must require verified funding: a connected, authenticated bank-account / funding source (see §6.7.1) with confirmed available balance, before any live order may route. | Must | Roadmap |
| LR-10 | The audit export (LR-04) must include the funding-source verification record (provider, masked account reference, verification timestamp) for the promoted account. | Must | Roadmap |

### 6.7.1 Banking and Funding Connectivity [Roadmap / Gated]

> **Note:** Real-money funding is a committed destination (G0) and a hard prerequisite for live execution. It is gated behind the same readiness and safety discipline as live order routing, and is NOT shipped. All requirements below are sandbox-first.

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| BK-01 | The system must integrate bank-account / funding-source connectivity through a dedicated provider-adapter abstraction (analogous to broker adapters) so all banking API calls are normalized, server-side, and isolated from UI and domain logic. | Must | Roadmap |
| BK-02 | Banking adapters must default to sandbox endpoints. Live/production banking credentials must be distinct environment variables and must never activate funding by default. | Must | Roadmap |
| BK-03 | Account funding (deposit), withdrawal, and balance verification must each be transactional, auditable, and append-only — recorded with pre/post balance and a stable external reference, mirroring the simulation ledger's accounting discipline. | Must | Roadmap |
| BK-04 | Fund movement must be a privileged, human-authorized action — never AI-initiated and never autonomous. Real-money transfers always require explicit user confirmation. | Must | Roadmap |
| BK-05 | Funding-source connection must be verified (e.g., authentication + balance check) before contributing to live-readiness (LR-09). Stale or unverified funding sources must block promotion. | Must | Roadmap |
| BK-06 | Banking credentials, tokens, and account identifiers must never appear in client-accessible code or logs; access only via validated server-side config helpers (extends the existing secrets rule to banking). | Must | Roadmap |
| BK-07 | Currency of the funding source must reconcile with account cash currency (see AC-01); FX handling between funding currency and trading currency must be explicit and documented. | Should | Roadmap |

### 6.8 Workstation UX

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| UX-01 | Every page or section with trade-adjacent actions must display an execution mode badge (SIMULATION / LIVE) — consistently and visibly. | Must | Partial (UX finding: inconsistent) |
| UX-02 | Every price or data point must display a staleness indicator when `isStale: true`. Data freshness must be visible at the point of action. | Must | Partial |
| UX-03 | Every data section must handle all four states: loading (skeleton/spinner), empty (designed empty state with message), error (friendly error + retry), degraded (data with staleness or partial-data indicator). | Must | Partial |
| UX-04 | Numeric values (prices, P&L, quantities) must use monospace (tabular-nums) font, right-aligned in tables, with consistent decimal places within a column. | Must | Shipped (design tokens) |
| UX-05 | Color must not be the only indicator of meaning for P&L (green/red). Text labels (Gain/Loss, ▲/▼) or `aria-label` must accompany color. | Must | Partial |
| UX-06 | The "Forgot password" link must be present on the login form and route to the existing recovery endpoint. | Must | Gap (UX finding: critical) |
| UX-07 | The 404 page must not display the simulation legal disclaimer as its error text. 404 must show a designed not-found state with navigation options. | Must | Gap (UX finding: high) |
| UX-08 | Dashboard news items must not display "No source URL" development placeholder copy in production. | Must | Gap (UX finding: high) |
| UX-09 | Lane IDs must be displayed as human-readable labels in all UI surfaces (no raw underscored identifiers visible to users). | Should | Gap (UX finding) |
| UX-10 | Command palette (⌘K) must remain functional across all workstation routes. | Must | Shipped |
| UX-11 | Navigation should not expose more than approximately 10 top-level destinations to reduce cognitive load (Hick's Law). Secondary destinations should be grouped or accessible via command palette. | Should | Gap (UX finding: medium) |
| UX-12 | Signal recommendation language must never imply guaranteed returns. Forbidden: "will", "guaranteed", "certain", "risk-free", "AI predicts" (as certainty). Required where applicable: "Indicative only", "Not financial advice", "Past performance does not guarantee future results". | Must | Shipped (rule); Partial (implementation) |
| UX-13 | The ConfidenceMeter must display a threshold legend (≥0.7 high / 0.4–0.7 moderate / <0.4 low / 0 no signal) alongside any confidence value. | Must | Gap (UX finding) |

### 6.9 Admin and Observability

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| AO-01 | `/admin/monitoring` must display provider health for all configured providers: last-call timestamp, current status (healthy/degraded/rate-limited), fallback chain position. | Must | Partial |
| AO-02 | Admin must be able to trigger a manual provider health check from the UI for each provider, without direct DB access. | Should | Gap |
| AO-03 | Live-readiness gate status per account must be inspectable from the admin interface. | Should | Gap |
| AO-04 | Kill-switch states (global and per-account) must be visible in the admin interface with last-activation timestamp. | Must | Partial |
| AO-05 | All execution decisions (order submitted, order rejected with reason, risk gate outcome, kill-switch activation) must be logged as observable system events. | Must | Shipped (pattern) |

### 6.10 Accounts, i18n, and Legal

| REQ ID | Requirement | Priority | Status |
|---|---|---|---|
| AC-01 | Simulation account cash currency must be configurable (default EUR, USD fallback). FX conversion for position values must be applied consistently. | Should | Gap |
| AC-02 | i18n coverage must include all user-facing strings: empty states, loading states, error messages, risk disclaimers, and legal copy. Hardcoded English strings in shipped routes are a defect. | Must | Partial |
| AC-03 | i18n parity test must be run to catch missing translation keys before release. | Should | Gap |
| AC-04 | Legal/disclaimer pages must be complete with correct content — not placeholder content. Simulation legal disclaimer must not appear on unrelated pages (e.g., 404). | Must | Partial |
| AC-05 | Footer information architecture must be complete with links to legal pages, support, and applicable disclaimers. | Should | Partial |
| AC-06 | News stream ingestion must persist article entities with: asset identifiers, entity extraction (companies/tickers), risk tags, "why this matters for [asset]" annotation, and a stable article ID for deduplication. | Should | Partial |

---

## 7. Non-Functional Requirements

### 7.1 Determinism and Reproducibility

- All signal and forecasting computations must produce identical output given identical inputs and seed. No hidden randomness.
- `generatedAt` timestamps in forecasting outputs must be passed as parameters, not derived from `Date.now()` inside the computation.
- Test suites for `packages/signals` and `packages/forecasting` must use fixed, deterministic fixtures — no `Math.random()` in test data generation.
- Every output that informs an execution decision must be traceable to its exact inputs (OHLCV bars, quote, provider, model version).

### 7.2 Auditability and Traceability (EU AI Act Aligned)

- Every order record must carry: `created_at`, `account_id`, `execution_mode`, `source` (manual/assisted/autonomous), fill metadata, rejection reason if rejected.
- Every transaction record must carry: linked `order_id`, transaction type, pre/post cash balance, timestamp.
- Simulation records are append-only. Archival only — no hard deletes.
- Every AI suggestion, signal score, and recommendation surfaced to a user must have a traceable explanation that can be retrieved after the fact (for the decision made at that moment).
- The "Simulation → Live Promotion" audit export must be sufficient to satisfy EU AI Act Article 13 transparency requirements for high-risk AI system outputs (when applicable).

### 7.3 Safety and Fail-Closed

- Execution is fail-closed. Any uncertain, ambiguous, or partially failed state results in order rejection with state preserved.
- Risk gate failure: reject order, log reason, return typed error. Never proceed.
- Kill switch activation: all execution halted immediately, DB-persisted, log event. No in-memory-only state.
- Provider failure: return typed failure with `confidence: 0`, not fabricated data.
- DB absence at startup: system must boot with stub client. Execution must not proceed without DB.

### 7.4 Package Boundary Integrity

- `packages/signals` and `packages/forecasting`: no imports from `packages/db`, `packages/providers`, or `apps/web`. Pure functions only.
- `packages/db`: sole location for SQL, repositories, and transactions. No SQL in routes, components, or services.
- `packages/providers`: sole location for external API calls. No provider calls from `apps/web` routes or components.
- `packages/api-contracts`: sole source of shared Zod schemas and TypeScript types. No duplicate shared contracts elsewhere.
- `apps/web`: orchestration and presentation only. No domain math, no provider calls, no SQL.

### 7.5 Performance Targets (Workstation Routes)

| Route | Target P75 Load Time | Notes |
|---|---|---|
| /market (market overview) | <1,000ms | Batch fetch; parallel independent calls |
| /invest/portfolio | <800ms | Batch position price fetch; `force-dynamic` |
| /stocks/[symbol] | <1,200ms | 2 provider calls max (quote + history) |
| /invest/simulation (trade ticket) | <500ms | 1 quote fetch |
| /markets/rankings | <2,000ms | Batch rankings; parallel |
| /signals | <1,500ms | Signal computation cached ≤5 min |

Independent server fetches must use `Promise.all`. N+1 symbol queries are a performance defect.

### 7.6 Accessibility (WCAG 2.1 AA)

- All interactive elements reachable via keyboard Tab. Modals trap focus when open. Escape closes modals and dropdowns.
- All images have `alt` text or `aria-hidden="true"`. All inputs have `<label>` or `aria-label`.
- Data tables have `<th>` with `scope`. Status changes use `aria-live` regions.
- P&L values use both color and text indicators (Gain/Loss label or ▲/▼ symbol with aria-label).
- Minimum contrast: 4.5:1 for body text, 3:1 for large text.
- Trade forms fully operable without a mouse.
- Charts and signal visualizations must have text alternatives for screen-reader users.

### 7.7 Data Freshness and Staleness

- Staleness thresholds: stocks/ETFs market hours 60s; stocks/ETFs after-hours 5 min; crypto 30s; any quote >15 min always stale.
- Stale quotes: `isStale: true` must propagate to signal confidence (≥30% reduction) and must be visually indicated in the UI.
- Portfolio and simulation account routes: `export const dynamic = "force-dynamic"`. No shared cache for user-specific financial data.
- Market data routes: `revalidate` set explicitly (60s for quotes, 300s for rankings, 3600s for fundamentals). No implicit Next.js caching defaults on financial routes.

### 7.8 Security and Secrets

- Provider API keys, broker credentials, DB URLs, and auth secrets must never appear in source code or client-accessible bundles.
- All secrets accessed via validated server-side config helpers.
- `.env`, `.env.local`, and `.env.production` files are never committed.
- Broker live API credentials and sandbox credentials must be distinct environment variables.
- Live broker credentials must only be accessed within `packages/agents/src/brokers/`.

### 7.9 Localization

- All user-facing strings must be externalized for i18n. No hardcoded English strings in shipped components.
- Empty, loading, error, and risk disclaimer strings must have translation keys for all supported languages (including Chinese, per existing i18n setup).
- i18n parity must be validated before each release.

---

## 8. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|---|---|---|---|
| Simulation → Live promotion conversion | 0% (workflow not shipped) | ≥15% of active simulation users promote at least one lane to live within 90 days of workflow launch | Server-side event: `simulation_to_live_promotion` per user cohort |
| Post-promotion 90-day retention | Unknown (proxy: 62% systematic trader churn in market) | ≥60% of users who promote to live remain active at 90 days | Active session within 90 days post-promotion |
| Risk gate visibility engagement | 0% (not shown in UI today) | ≥70% of trade submissions that trigger a risk gate check result in user reading the gate outcome (click/hover on result) | UI interaction event on risk gate result component |
| Signal explainability coverage | Partial | 100% of signal/forecast/recommendation outputs displayed to users carry a non-empty, non-placeholder explanation | Automated test: no `explanation: ""` or placeholder text in production renders |
| Confidence display coverage | Partial | 100% of signal displays include a confidence value AND threshold legend | UI audit; automated regression |
| Time to first paper trade (onboarding) | Unknown | Median <10 minutes from signup to first simulation order submitted | `first_simulation_order` event timestamp minus `user_created` timestamp |
| Provider availability SLO | Unknown | ≥99.5% of market-data requests resolved (from primary or fallback) within 5 seconds | Provider routing metrics in observability package |
| Provider fallback activation rate | Unknown | Fallback used in <5% of requests (indicator of primary provider health) | `isFallback: true` rate in provider routing logs |
| Signal determinism verification | Not benchmarked | 100% of determinism tests pass: same inputs + same seed → same output, across 1,000 runs | `packages/signals` + `packages/forecasting` test suite, CI |
| SIM badge consistency | Inconsistent (UX finding) | SIM badge present on 100% of routes with trade-adjacent actions | UI audit checklist; automated screenshot regression |
| i18n coverage | Partial | 0 hardcoded English strings in shipped routes; 100% translation-key parity across all supported languages | i18n parity test in CI |

---

## 9. Open Questions

| Question | Assumption if Unresolved | Owner |
|---|---|---|
| Should the default simulation account currency be EUR or USD? The feature gap audit flags USD-only as a gap, and UX targets EUR as default. | Default to USD until EUR support is explicitly implemented with FX conversion. Surface "USD-only" as a known limitation in the UI. | Product + Engineering |
| How aggressively should the SIM badge be surfaced? On every page (including /market and /signals) or only on trade-adjacent routes (/invest/*)? | Apply SIM badge on all routes where a trade action is reachable within one click. | Product + Design |
| Which broker should be targeted first for sandbox → live integration? Alpaca adapter is referenced in codebase. Is this the committed first broker? | Alpaca sandbox is the reference implementation. No other broker is committed. | Engineering |
| How should signal quality be publicly benchmarked without implying guaranteed returns or creating regulatory exposure? | Do not publish signal benchmarks publicly until legal review is complete. Internal benchmark dashboard only. | Product + Legal |
| What is the permitted scope of **Claude Finance** as a signal side-input — including in the live, real-money end-state? Which outputs may it influence, and what guardrails prevent it from overriding deterministic risk gates or initiating fund movement? | Claude Finance outputs are labeled AI-generated, receive their own confidence score, and are treated as one signal input — in both simulation and live. They are never passed directly to risk-gate logic and never authorize real-money transfers or autonomous fills. | Engineering + Product |
| Which banking / funding-source provider(s) will be integrated first for real-money funding (deposit/withdrawal/balance verification), and through what API (e.g., open-banking aggregator vs. broker-cash vs. direct PSP)? | No banking provider is committed yet. Design the adapter abstraction (BK-01) provider-agnostic and sandbox-first; defer provider selection to a dedicated funding-integration spike. | Product + Engineering + Legal |
| What licensing / regulatory authorizations are required to move real customer money (e-money/PSP/broker-dealer/MiFID) in the target launch jurisdictions, and do they gate the live go-live date? | Treat real-money go-live as legally gated: live funding and order routing remain disabled until regulatory review confirms the required authorizations are in place. | Legal + Product |
| Should the "Simulation → Live Promotion" audit export be machine-readable (JSON) or human-readable (PDF/CSV), or both? EU AI Act traceability may require structured format. | Human-readable export (PDF/CSV) first. Structured JSON as follow-on for API consumers and compliance workflows. | Product + Legal |
| What is the minimum simulation run duration required before a lane is eligible for live promotion? 30 days? 90 days? Signal-quality-dependent? | 30-day minimum simulation period with at least 10 completed simulation orders. Configurable per operator. | Product |
| How should the command palette (⌘K) handle navigation to live-gated features that are not yet available? Show them as disabled with a "Coming soon" label, or hide them entirely? | Show as disabled with tooltip explaining the gate status. Hiding creates confusion about product roadmap. | Design |
| Is the existing `/invest/live-readiness` route the canonical home for the promotion workflow, or should it be a separate dedicated flow? | `/invest/live-readiness` is extended to host the full promotion workflow. | Product + Design |
| How is micro-trading defined for the purposes of autonomy guardrails? Maximum notional per trade? Maximum daily notional? Both? | Maximum notional per autonomous trade: configurable, default €500. Maximum daily autonomous notional per lane: configurable, default €2,000. Subject to risk gate enforcement. | Product + Engineering |

---

## 10. Appendix

### A. Source Map

| PRD Claim | Source |
|---|---|
| System purpose and priority doctrine | `/CLAUDE.md` §1–§2; `/.claude/CLAUDE.md` §1–§2 |
| Monorepo architecture and package boundaries | `/CLAUDE.md` §5; `/.claude/CLAUDE.md` §5–§6 |
| Simulation engine design and tables | `/CLAUDE.md` §10; `/.claude/CLAUDE.md` §10; `.claude/rules/simulation-auditability-rule.md` |
| Strategy lanes | `/.claude/CLAUDE.md` §5 (agents); `/.claude/rules/position-sizing-rule.md` |
| Risk gates and kill switch | `/.claude/rules/risk-gates-required.md`; `/.claude/rules/kill-switch-rule.md` |
| Signal/forecasting purity and output contracts | `/.claude/rules/signal-purity-rule.md`; `/.claude/rules/forecasting-purity-rule.md`; `/.claude/rules/confidence-score-rule.md` |
| Live execution gating and staged modes | `/.claude/rules/live-trading-lock.md`; `/.claude/rules/broker-sandbox-rule.md`; `/.claude/rules/simulation-first-rule.md` |
| Competitive positioning and market gap | `.docs/competitive-scan-ai-fintech.md` (2026-06-13) |
| UX findings (critical/high/medium) | `.docs/ux/` heuristic evaluation (2026-06-13) |
| Feature gaps | Feature-gap-audit (2026-05-08) referenced in task brief |
| Provider routing and staleness rules | `/.claude/rules/quote-snapshot-rule.md`; `/.claude/rules/market-provider-rules.md`; `/.claude/rules/provider-fallback-rule.md` |
| Order lifecycle state machine | `/.claude/rules/order-lifecycle-rule.md` |
| Portfolio accounting rules | `/.claude/rules/portfolio-accounting-rule.md`; `/.claude/rules/repository-transaction-rule.md` |
| Cache and performance rules | `/.claude/rules/next-cache-rule.md`; `/.claude/rules/slow-route-performance-rule.md`; `/.claude/rules/user-specific-cache-rule.md` |
| Accessibility requirements | `/.claude/rules/accessibility-rule.md` |
| Security and secrets | `/.claude/rules/env-secret-rule.md` |
| Explainability requirements | `/.claude/rules/explainability-rule.md`; `/.claude/rules/confidence-score-rule.md` |
| i18n and legal gaps | Feature-gap-audit; `/.claude/rules/readme-update-rule.md` |
| Live real-money go-live commitment, bank-account funding APIs, Claude Finance as the product destination | **Product-owner direction (2026-06-13).** The repository currently implements and documents a *simulation-first, live-gated* path (`simulation-first-rule.md`, `live-trading-lock.md`, `docs/live-microtrading/*`); this PRD frames that gated path as the on-ramp to a committed live end-state. Banking/funding connectivity and Claude Finance are not yet in the codebase — marked [Roadmap / Gated] throughout. |

### B. Glossary

| Term | Definition |
|---|---|
| **Lane** | A strategy configuration unit within an account that defines: capital limit, asset scope, execution policy, micro-trading ratio, and (roadmap) risk cap and autonomy level. Lanes are isolated — one lane's state does not affect another. |
| **Readiness Gate** | `assertLiveReadinessGate`: a function that must pass (all checks green) before any lane can be set to live execution mode. Checks include broker validation, risk gate active, kill switch armed, capital verified, data freshness, and observability active. Implemented in `packages/agents/src/readiness/`. |
| **Kill Switch** | A DB-backed halt flag that, when activated, stops all execution (simulation and live) for a given account or globally. Activated via a privileged server action; survives process restarts; logs a system event. Must be present in every execution workflow. |
| **Simulation Ledger** | The persistent, transactional, accounting-grade record of all simulation orders, transactions, positions, account balances, and snapshots. It is not a visual demo or a mock — it uses the same accounting logic as the live execution path. |
| **Deterministic Signal** | A signal function that produces the same `SignalOutput` (score, confidence, explanation) given the same input data, every time it is called. Achieved by having no I/O, no randomness, and no hidden state in `packages/signals`. |
| **Confidence** | A value `[0, 1]` attached to every signal, forecast, and recommendation that honestly represents how reliable the output is, derived from data quality factors (freshness, bar count, provider fallback, conflicts). Hardcoded confidence values are forbidden. |
| **Micro-Trading** | An execution mode where order sizes are small (sub-€500 notional per trade) and frequency may be higher. Requires additional guardrails: daily trade cap, minimum confidence, spread tolerance, volatility threshold. Currently a roadmap feature. |
| **Simulation → Live Promotion** | The formalized workflow by which a user reviews their simulation run evidence, passes the readiness gate checklist, downloads an audit export, and explicitly promotes a strategy lane to live execution via a privileged server action. |
| **Explainability** | The requirement that every AI output (signal, forecast, recommendation) carries a non-empty, human-readable `explanation` field describing what was detected, why, and any caveats. Not optional; required for EU AI Act alignment and user trust. |
| **Pre-Trade Risk Check** | `runPreTradeRiskCheck`: a function that runs mandatory checks (cash, position size, drawdown, liquidity, slippage, instrument constraints, confidence, lane permissions, data freshness) before any order is submitted. Failure always rejects the order. |
| **isFallback / isStale** | Flags on quote and provider results indicating whether a fallback provider was used (`isFallback: true`) or whether the data is older than the staleness threshold (`isStale: true`). Both reduce signal confidence and must be surfaced in the UI. |
| **Claude Finance** | The Claude-powered financial-intelligence integration used as an *explainable AI side-input* to deterministic signals and recommendations. It carries its own confidence and rationale, is always labeled AI-generated, and — in both simulation and the live end-state — may never override risk gates, authorize fund movement, or execute autonomously. |
| **Funding Source / Banking Adapter** | A connected real-money account (bank or funding provider) and the server-side adapter abstraction that normalizes deposit, withdrawal, and balance-verification calls. Sandbox-first, credentials server-only, every movement transactional/auditable and human-authorized. A verified funding source is a prerequisite for live promotion (LR-09). |
| **Pre-live / Live end-state** | *Pre-live* is the current phase: the system runs in simulation for development and testing. *Live end-state* is the committed destination: real-money execution with connected bank-account funding and Claude Finance, reached only after staged, gated rollout. Simulation remains the mandatory on-ramp for every account. |

### C. Engineering Known-Baseline Note

`apps/web/server/auth/service.test.ts` contains a pre-existing TypeScript typing inconsistency. This failure predates all features described in this PRD. It must not be treated as a regression caused by any implementation of these requirements. All verification of new features must be performed at the package level (`pnpm --filter @repo/<package> typecheck`) rather than relying on full `apps/web` typecheck as a baseline. See `CLAUDE.md §4` and `/.claude/rules/baseline-failure-rule.md` for the documented protocol.
