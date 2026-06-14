# Competitive Scan — AI-Analysis Multi-Asset Trading Platform vs. Aurox Intelligence

**Date:** 2026-06-13
**Market:** AI-driven analysis + execution fintech platforms for equities, ETFs, and crypto (with strategy/portfolio segmentation)
**Compare-against:** Aurox Intelligence (this project) — deterministic-first, simulation-first, explainable, lane-based multi-asset intelligence + trading platform
**Method:** Parallel research (competitor teardown + feature matrix; market landscape) via `sfos-research-council`, June 2026. Claims tagged `[V]` verified / `[CLAIMED]` marketing-only / `[UNVERIFIED]`.

> **Caveat:** Competitor facts below come from public docs, pricing pages, and press releases gathered by web research. Verify any figure before using it externally. Aurox-side claims are grounded in this repo's README, CLAUDE.md, and `.claude/rules/`.

---

## 0. TL;DR — Lead with the white space

The market is **bifurcated**, and the high-value quadrant is **empty**:

- **Analysis-only, good AI** (Danelfin, Trade Ideas, Kavout) — explainable/deterministic signals, **but zero execution**. The moment you want to act, you leave the app.
- **Execution platforms, shallow/black-box AI** (Robinhood, Public.com, Composer, eToro) — real brokerage, **but LLM-generated non-deterministic signals, no pre-trade risk gates, no simulation integrity, no audit trail.**

**No competitor in the set simultaneously delivers all three of:**
1. **Explainable / deterministic AI** (only Danelfin — no execution)
2. **Simulation-first paper engine with real accounting** (only IBKR — disconnected from AI, no lanes)
3. **Strategy lanes with enforced per-lane capital + risk caps** (nobody does this rigorously)

**That empty quadrant is exactly where Aurox Intelligence is architected to sit.** Aurox already implements — at the contract and rules level — the three things the market is missing: deterministic explainable signals, a simulation engine treated as a real ledger (orders/positions/transactions/snapshots, transactional accounting), and lanes with capital limits + asset scope + risk caps + kill switch + a gated live-readiness path.

**The strategic read:** Aurox's "constraints" (simulation-first, explainability, risk gates, gated autonomy) are turning into **regulatory and trust tailwinds** (EU AI Act Aug 2026, FINRA Reg BI, the post-crypto-bot trust deficit) at the exact moment incumbents are racing toward *opaque* agentic autonomy. The differentiation window is open now.

**Primary risk:** Robinhood-class distribution and zero-friction onboarding. If "agentic execution at your existing broker" commoditizes before Aurox builds signal depth + simulation realism + a user base, the standalone window narrows. **Execution priorities that matter most: signal depth/quality, simulation realism (slippage/partial-fill/fee fidelity), and a crisp "prove-it-in-sim → promote-to-live" workflow.**

---

## 1. Competitor Set (and why)

| Competitor | Why in set |
|---|---|
| **TrendSpider** | Strongest AI-native charting/automation; true multi-asset; broker execution via webhooks |
| **Trade Ideas (Holly AI)** | Deepest equities scan/signal engine; closest to autonomous signal generation |
| **Danelfin** | Best-in-class *explainable* AI scoring (decision trees, factor-level) — the XAI benchmark |
| **Composer** | Only no-code strategy automation **+** real brokerage in one product; multi-strategy |
| **Tickeron** | Broadest AI-robot ecosystem; explicit paper (Virtual) + live (Brokerage) agents |
| **Public.com** | Furthest-advanced AI agent integration inside a real retail broker |
| **Robinhood** | 27M users; launched agentic trading beta (May 2026) — sets market expectations |
| **Interactive Brokers** | Institutional-grade execution + best deterministic risk tools; Claude integration (Jun 2026) |
| **eToro** | Dominant social/copy; launched Alpha Portfolios (AI quant strategies, May 2025) |
| **3Commas** | Dominant crypto bot platform; per-bot capital allocation; paper engine |

**Excluded:** Magnifi/TIFIN (analysis-only copilot), Kavout (analysis-only), TokenMetrics (crypto signals only), Capitalise.ai (acquired by Kraken Aug 2025), Pionex (crypto-only), Boosted.ai (institutional API), Numerai (tournament).

---

## 2. Positioning Map

**Y = AI depth / explainability · X = execution completeness (signal → order → accounting integrity)**

```
HIGH AI DEPTH
        │
Danelfin│            TrendSpider
        │   ▲ AUROX        │
        │   (target)   Trade Ideas
        │                        Tickeron
        │                              Composer
        │────────────────────────────────────────►
        │        IBKR        Public.com   EXECUTION
        │             Robinhood           COMPLETENESS
        │     eToro
        │  3Commas (crypto only)
LOW AI DEPTH
```

The **top-right** (high AI depth **and** full, accounting-grade execution with explainability) is unoccupied by competitors. Aurox targets it from the explainability side (Danelfin-grade transparency) **plus** the simulation-ledger + lane side that nobody combines.

---

## 3. Per-Competitor Teardowns (positioning · assets · AI · execution · pricing · moat · weakness)

### TrendSpider
- **ICP:** Active self-directed day/swing traders wanting chart automation without code.
- **Assets:** Stocks, ETFs, crypto, futures, options, forex `[V]` — true multi-asset.
- **AI:** ML pattern detection, AI Strategy Lab, NL indicator/condition builder, Sidekick chat. Backtests deterministic; pattern AI probabilistic, **model internals opaque**.
- **Execution:** No native broker — webhook/SignalStack to 30+ brokers. **No paper engine, no ledger, no audit trail.**
- **Pricing:** $52–$154/mo (annual) + Sidekick AI $49–$349/mo + data add-ons.
- **Moat:** Automation depth, data breadth, user-trained models → stickiness.
- **Weakness to attack:** No simulation, no position accounting, no enforced risk gates, no strategy segmentation.

### Trade Ideas (Holly AI)
- **ICP:** Day traders / prop operators wanting institutional-grade screening.
- **Assets:** US equities + ETFs only. **No crypto.**
- **AI:** Holly runs 70+ rule-based strategies nightly over 8,000+ stocks → 3–8 daily ideas with entry/target/stop. Explainability partial (shows triggering strategy + win rate, not weights).
- **Execution:** Scan/alert only; launches order tickets to IBKR/E*TRADE; **no automated submission.** OddsMaker paper sim is P&L-level, not ledger-grade.
- **Pricing:** $178–$254/mo (Holly at Premium).
- **Moat:** Proprietary nightly backtest engine (millions of backtests/night); day-trading brand.
- **Weakness:** Equity-only, signal-only, no crypto, no automation, no per-strategy capital, no auditable trail.

### Danelfin — *the explainability benchmark*
- **ICP:** Retail investors who distrust black-box recommendations.
- **Assets:** US stocks, US-listed ETFs, EU main-market stocks. **No crypto.**
- **AI:** AI Score 1–10 from ML over 10,000 features/stock/day (technical/fundamental/sentiment). **Genuine XAI** — decision-tree architecture, factor-level color-coded contributions, "no black boxes." 3-month probability-of-outperformance forecast.
- **Execution:** **None.** Broker sync is read-only monitoring (US, Plus tier).
- **Pricing:** Free · €22 · €59 · €134/mo.
- **Moat:** Real XAI (not LLM optics) + validated multi-year track record + EU coverage.
- **Weakness:** Pure analysis — no execution, no simulation, no lanes, no risk gating. **A strong signal layer waiting for an execution layer** (≈ what Aurox bolts execution onto).

### Composer
- **ICP:** Self-directed/quant-curious investors wanting algo strategies without Python.
- **Assets:** US stocks, ETFs, crypto, options (via Alpaca).
- **AI:** "Trade With AI" = **LLM-generated** strategies from plain English; sub-second backtests; Symphony DSL + community library. **Non-deterministic** (same prompt → different strategy); no factor-level signal explanation.
- **Execution:** Real brokerage (Alpaca, FINRA/SIPC), commission-free, fully automated. **One Alpaca account → no true per-strategy capital isolation.** No documented paper mode.
- **Pricing:** ~$24/mo (annual), commission-free trading included.
- **Moat:** Alpaca partnership + Symphony DSL + community-strategy flywheel.
- **Weakness:** No simulation-first, LLM non-determinism, **no enforced risk gates**, no signal/order audit trail, no formal lanes.

### Tickeron
- **ICP:** Active retail traders wanting pre-built automated robots.
- **Assets:** Stocks, ETFs, crypto, forex.
- **AI:** Neural-net robots (Signal/Virtual/Brokerage agents), 85%+ confidence gating, trend/pattern engines. Explainability partial; **self-published 150–360% return claims `[UNVERIFIED]`** → credibility risk.
- **Execution:** Virtual (paper) + Brokerage (live via IBKR/Tradier/TD) agents. Paper P&L tracked but **ledger integrity not documented** `[UNVERIFIED]`.
- **Pricing:** Free · $80 · $90 · $250/mo + robot add-ons.
- **Moat:** Robot marketplace + genuine live automation + multi-agent concurrency.
- **Weakness:** Self-published performance hurts trust; sim not ledger-grade; no enforced per-robot caps at broker; black-box neural nets.

### Public.com
- **ICP:** Retail wanting set-and-forget management without app-switching.
- **Assets:** Stocks, ETFs, crypto, options, bonds, alts — broadest retail coverage.
- **AI:** Alpha (GPT-4 analysis of 9,000+ stocks); **AI Agents (Mar/May 2026)** = plain-English rule triggers. **LLM, non-deterministic.**
- **Execution:** Full broker (FINRA), commission-free; agents auto-execute within rules. **No sandbox/paper mode.**
- **Pricing:** Base free; premium tiers `[UNVERIFIED]`.
- **Moat:** Integrated analysis+execution+banking; younger-retail brand; agentic first-mover.
- **Weakness:** No simulation, non-deterministic AI, no per-strategy lanes, no enforced risk gate, no formal audit trail.

### Robinhood
- **ICP:** Mass-market retail (27M+); pushing into active trading.
- **Assets:** Stocks, ETFs, crypto, options, futures, event contracts.
- **AI:** Cortex (research assistant, Digests); **Agentic Trading beta (May 2026)** — third-party agents (Claude/ChatGPT via MCP) on an isolated **live-capital** account. Signals LLM-based, **non-deterministic.**
- **Execution:** Full broker; agents auto-execute within spending limits. **No paper mode — "sandbox" is real money.**
- **Pricing:** Free; Gold $5/mo (Cortex); agentic beta free.
- **Moat:** 27M users, ~zero switching cost, ecosystem lock-in (banking + prediction markets + crypto), agentic first-mover.
- **Weakness:** No simulation, non-deterministic AI, no per-strategy capital lanes, agent "sandbox" risks real capital, no AI-decision audit trail. **This is the distribution threat, not the safety/quality threat.**

### Interactive Brokers (IBKR) — *the execution/paper benchmark*
- **ICP:** Active/sophisticated/institutional traders.
- **Assets:** 170+ global markets — broadest by far.
- **AI:** GlobalAnalyst, PortfolioAnalyst (35+ risk metrics, VaR), Risk Navigator (scenario/CAPM) — **deterministic & transparent.** AI assistant via **third-party Claude (Jun 2026)** — non-deterministic, bolted on.
- **Execution:** Full institutional broker; algo orders (TWAP/VWAP/Adaptive); **best-in-class paper account** ($1M virtual, all assets, mirrors live, persistent ledger).
- **Pricing:** Commission-based or $0 (Lite); no core subscription.
- **Moat:** Regulatory infra, global access, SmartRouting, institutional risk tools, high switching cost.
- **Weakness:** **No proprietary AI signal engine**; paper and AI are **separate experiences**, not a unified "sim → promote" workflow; **no strategy-lane segmentation**; Risk Navigator is manual analytics, **not a pre-trade blocking gate.**

### eToro
- **ICP:** Casual-to-intermediate investors + copy-traders.
- **Assets:** Stocks, ETFs, crypto (CFDs where eligible).
- **AI:** Alpha Portfolios (May 2025) — 7–11 AI quant strategies over 40M-user trading data; Tori assistant; patented CopyTrader. **Methodology opaque `[CLAIMED]`, non-deterministic (retrains on live data).**
- **Execution:** Full broker (FINRA); auto-rebalancing portfolios; auto copy-execution. Virtual $100K practice account **not integrated** with Alpha Portfolios.
- **Pricing:** $0 stock/ETF commission; spreads on crypto/CFD; Alpha min $10K; CopyTrader min $200.
- **Moat:** 40M-user proprietary dataset; CopyTrader patent; social network effects.
- **Weakness:** Black-box quant; no sim for quant strategies; no user-defined lanes; no user-configurable per-strategy risk caps.

### 3Commas
- **ICP:** Crypto investors wanting automation without code.
- **Assets:** **Crypto only** (23+ exchanges). No stocks/ETFs.
- **AI:** None — rule-based DCA/Grid/HODL/Arbitrage bots + third-party signal marketplace. **Deterministic** by virtue of explicit rules.
- **Execution:** Cloud execution via exchange API keys; demo account ($10K, Binance Spot, ~$350K practical cap).
- **Pricing:** `[UNVERIFIED]` current tiers (historically ~$29–$99/mo).
- **Moat:** 23+ exchange integrations, mature bot execution, signal marketplace.
- **Weakness:** Crypto-only, no AI signals, demo not accounting-grade, per-bot caps informal/unenforced.

---

## 4. Feature Matrix (incl. Aurox)

Legend: ● Present · ◐ Partial · ○ Absent. Aurox column reflects **architected/contracted capability in this repo** (simulation-first; live path gated), not market traction.

| Capability | TrendSpider | Trade Ideas | Danelfin | Composer | Tickeron | Public | Robinhood | IBKR | eToro | 3Commas | **Aurox** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Multi-asset (stocks+ETF+crypto) | ● | ○ | ◐ | ● | ● | ● | ● | ● | ◐ | ○ | **●** |
| AI signals | ● | ● | ● | ◐ | ● | ◐ | ◐ | ◐ | ◐ | ○ | **●** |
| Forecasting | ◐ | ◐ | ● | ○ | ◐ | ○ | ○ | ◐ | ○ | ○ | **●** |
| **Explainable / deterministic AI** | ◐ | ◐ | **●** | ○ | ◐ | ○ | ○ | ◐ | ○ | ●* | **●** |
| **Pre-trade risk gating** | ○ | ○ | ○ | ○ | ◐ | ○ | ◐ | ● | ○ | ◐ | **●** |
| **Simulation-first paper w/ real accounting** | ○ | ◐ | ○ | ○ | ◐ | ○ | ○ | ●† | ◐ | ◐ | **●** |
| **Strategy lanes / segmented capital+risk** | ○ | ○ | ○ | ◐ | ◐ | ○ | ◐ | ○ | ○ | ◐ | **●** |
| Automated execution | ● | ○ | ○ | ● | ● | ● | ● | ● | ● | ● | **◐ (sim now; live gated)** |
| Live brokerage | ○ | ○ | ○ | ● | ◐ | ● | ● | ● | ● | ○ | **○ (gated, broker-adapter stubs)** |
| Audit trail / traceability | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ●† | ◐ | ◐ | **●** |
| Multi-provider data fallback | ◐ | ◐ | ○ | ○ | ○ | ○ | ○ | ● | ◐ | ◐ | **●** |

\* 3Commas is deterministic only because it has **no AI** to explain. † IBKR's paper engine and audit logs exist but are **not linked to any AI signal layer or strategy lanes.**

**Reading the bolded rows:** the four differentiator rows (explainable/deterministic AI · pre-trade risk gating · simulation-first accounting · strategy lanes) are where the field is weakest and where Aurox is strongest by design. **No competitor has ● across all four. Aurox does (by architecture).**

---

## 5. Market Landscape (condensed)

**Segments:** (A) AI-augmented brokerages [highest leverage — Robinhood/IBKR/Webull], (B) crypto bots [$22.2B 2025, ~14.8% CAGR — Grand View], (C) AI signal/analysis overlays [prosumer; Trade Ideas/TrendSpider/Tickeron/Danelfin/TradingView], (D) robo-advisory [$10–17B, 30–50% CAGR; estimates diverge — treat as directional], (E) social/copy trading [$3.8B 2025 → $11.7B 2035 — GM Insights].

**Sizing reality check:** Headline "AI trading platform ~$11B" figures blend in institutional algo. **Retail/prosumer AI-analysis software SAM is more like $3–8B (2025).** Bottom-up: ~100M US+EU retail accounts × 5–10% paying $50–150/yr ≈ **$250M–$1.5B SAM** for prosumer AI analysis tools (confidence: medium).

**Demand drivers (↑):** retail sophistication post-2020/21; 24/7 multi-asset; **distrust of black-box AI driving demand for explainability**; one-account multi-asset expectations; agentic-AI hype compressing competitive timelines.
**Headwinds (↓):** **62%+ of systematic retail traders abandon an algo within 3 months of going live** (sim↔live gap — Bloomberg Intelligence 2024); fee compression / free tools (TradingView); crypto regulatory uncertainty.

**Inflections (12–24 mo):**
1. **Agentic retail execution** arriving fast (Robinhood May 2026) — but **regulation/trust not ready for opaque autonomy.**
2. **Explainable AI becoming a *requirement*** — **EU AI Act high-risk obligations effective Aug 2026** (traceability, explainability, audit logging, human oversight); US SEC/FINRA exam posture shifting.
3. **Simulation/backtesting as a trust/credentialing layer** (70%+ use backtesting; sim↔live gap is the credibility crisis).
4. **Multi-asset convergence** (crypto venues adding equities; brokers adding crypto; Coinbase–Deribit, Ripple–Hidden Road).
5. **Copy-trading vs. systematic lanes bifurcating** — the **AI-assisted systematic middle (prosumer quant) is underserved.** ← Aurox's lane.

---

## 6. White Space → Opportunities (Aurox-specific)

1. **Explainability + execution, unified.** Be the platform that pairs **Danelfin-grade deterministic, factor-auditable signals** with a **real execution path** where the *same* signal-to-fill logic is traceable end to end. Every executing competitor today uses LLM/black-box AI; every explainable one can't execute. → *Leverage Aurox `packages/signals` purity + explainability layer + the knowledge graph; surface "why" at the point of action.*

2. **Simulation as a first-class trust layer (not a toggle).** Ship a **"prove it in simulation → audit every decision → promote to live"** gated workflow with **double-entry accounting integrity** (cash/positions/transactions/snapshots). This directly answers the 62% sim→live churn crisis and the EU AI Act traceability requirement. → *Aurox already has the ledger tables + transactional repos + snapshot consistency + `/invest/live-readiness`. Productize the promotion workflow and make sim **realism** (slippage/partial fills/fees/data gaps) a marketed feature.*

3. **Strategy lanes with *enforced* capital + risk isolation.** Per-lane capital cap, max drawdown, asset scope, **per-lane kill switch**, lane-level PnL. Nobody offers this with integrity (Composer = one Alpaca account; 3Commas = informal; IBKR = none). → *Aurox lanes already define capital limits + asset scope + execution policy + micro-trading ratio; make per-lane enforced risk caps and kill switch a headline differentiator.*

4. **Deterministic pre-trade risk gate as a product feature.** A transparent, auditable OMS-style gate (cash, max position, drawdown, slippage, liquidity, instrument constraints, data freshness) that **blocks** orders and **logs** the reason — standard institutionally, **absent from retail AI platforms.** → *Aurox `risk-gates-required` rule + `runPreTradeRiskCheck` pattern already mandate this; expose it in the UI as a visible trust feature ("order blocked: drawdown limit").*

5. **Compliance-as-tailwind positioning.** Market simulation-first + explainability + human-in-the-loop gating as **the EU AI Act / FINRA Reg BI-aligned** answer to agentic risk — the same axis IBKR uses to differentiate from Robinhood, but extended to AI signals + lanes.

---

## 7. Where Aurox is genuinely ahead vs. where it must catch up

**Ahead (architecture/design):**
- Deterministic, pure, explainable signal/forecast packages (vs. LLM black boxes everywhere).
- Simulation engine as a real ledger with transactional integrity + append-only auditability + consistent snapshots (only IBKR is comparable, and it's not AI-linked).
- Lanes with capital/asset-scope/risk policy + gated live-readiness + kill switch.
- Multi-provider fallback with freshness/confidence propagation (most competitors don't publish any).
- Risk-priority doctrine (`Risk > Policy > Agent > User > UI`) baked into rules.

**Must catch up (traction/product surface — not yet competitive strengths):**
- **Live brokerage** is gated/stubbed (by design) — competitors execute real orders today. Promotion path needs to ship.
- **Automated execution** today is simulation-lane; agentic/auto live is intentionally locked.
- **Signal depth/breadth** vs. Holly AI's nightly backtest library and Danelfin's 10K-feature scoring — needs measurable, benchmarked signal quality.
- **Distribution / onboarding friction** vs. Robinhood-class reach — the dominant commercial risk.
- **Simulation realism** (slippage/partial-fill/fee fidelity) must be demonstrably live-representative to be a trust asset rather than a flattering demo.

---

## 8. Recommended next moves

1. **Name and ship the "Simulation → Live promotion" workflow** as the flagship trust feature (gate + audit export). Map it explicitly to EU AI Act traceability + FINRA Reg BI in marketing/compliance docs.
2. **Make the pre-trade risk gate *visible*** in the UI (blocked-order reasons, lane caps, drawdown) — turn an internal rule into a user-facing differentiator.
3. **Benchmark signal quality publicly** (deterministic, reproducible, with confidence intervals) to compete with Holly/Danelfin on substance, not marketing.
4. **Productize per-lane enforced risk caps + per-lane kill switch** as the headline that no competitor matches.
5. **Invest in simulation realism** (slippage/partial fills/fees/data-gap modeling) so sim performance predicts live — directly attacking the 62% sim→live churn pain.
6. **Pick the wedge ICP:** the **serious self-directed investor / small systematic operator** who wants institutional execution discipline at retail cost — the underserved "AI-assisted systematic middle," not the mass-market Robinhood user.

---

## Appendix — Source notes & confidence

- Competitor specifics: vendor pricing pages, docs, and 2025–2026 press (TrendSpider, Trade Ideas, Danelfin, Composer, Tickeron, Public, Robinhood, IBKR, eToro, 3Commas). Treat `[CLAIMED]`/`[UNVERIFIED]` items as marketing until independently confirmed.
- Market data (medium/low confidence, directional): Grand View Research (automated crypto $22.2B), GM Insights (social trading $3.8B), Fortune Business Insights / Mordor (robo-advisory ranges), Market.us / Precedence (AI trading platform ~$11B — includes institutional).
- Regulatory (high confidence): EU AI Act high-risk obligations effective **Aug 2026**; FINRA AI key-challenges report; SEC exam posture (Sidley Austin, Feb 2025).
- Behavioral (medium): sim→live abandonment 62% within 3 months (Bloomberg Intelligence 2024); backtesting adoption 70%+ (Forex Tester 2025, single-source).
- **Aurox-side claims** grounded in this repo: `README.md` (product surfaces, lanes, monorepo, knowledge graph), `CLAUDE.md`, and `.claude/rules/` (risk gates, simulation auditability, repository transactions, snapshot consistency, live-trading lock, kill switch, provider fallback, explainability).

*Generated by `sfos-research-council:competitive-scan` (competitive-analyst + market-researcher agents) and synthesized against the Aurox Intelligence codebase.*
