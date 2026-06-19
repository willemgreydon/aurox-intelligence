# Aurox Intelligence — Personas & Archetypes

**Status:** Living document
**Date:** 2026-06-19
**Owner:** Product
**Phase:** Simulation-first. Live real-money capabilities are **[Roadmap / Gated]** behind the readiness gate (see [`prd/aurox-intelligence.md`](./prd/aurox-intelligence.md) and [`roadmap.md`](./roadmap.md)).

> This document is **complementary** to the persona section in the master PRD
> ([`prd/aurox-intelligence.md` §4](./prd/aurox-intelligence.md)). The PRD defines the canonical
> persona names — **Sione, Marta, Theo, Operator/Admin**. Here we re-frame each as a working
> archetype, ground each one in the **actual app surfaces** they live in, and translate each into
> concrete **design implications** for the GODTIER UI epic
> ([`godtier-interface-upgrade-epic.md`](./godtier-interface-upgrade-epic.md)). Where the two
> documents disagree, the PRD is authoritative on naming and the codebase is authoritative on which
> surfaces exist.

---

## How to read this

Each persona is grounded in **real routes** under `apps/web/app/`. The current shipped surface map:

| Cluster | Routes |
|---|---|
| Discover | [`/market`](../apps/web/app/market/page.tsx), [`/markets/intelligence`](../apps/web/app/markets/intelligence/page.tsx), [`/markets/rankings`](../apps/web/app/markets/rankings/page.tsx), [`/macro`](../apps/web/app/macro/page.tsx), [`/news`](../apps/web/app/news/page.tsx), [`/watchlist`](../apps/web/app/watchlist/page.tsx) |
| Understand | [`/signals`](../apps/web/app/signals/page.tsx), [`/forecasts`](../apps/web/app/forecasts/page.tsx), [`/observe`](../apps/web/app/observe/page.tsx) |
| Simulate & Act | [`/invest/simulation`](../apps/web/app/invest/simulation/page.tsx), [`/invest/orders`](../apps/web/app/invest/orders/page.tsx), [`/invest/accounts`](../apps/web/app/invest/accounts/page.tsx), [`/portfolio`](../apps/web/app/portfolio/page.tsx), [`/portfolio/intelligence`](../apps/web/app/portfolio/intelligence/page.tsx) |
| Monitor & Trust | [`/dashboard`](../apps/web/app/dashboard/page.tsx), [`/alerts`](../apps/web/app/alerts/page.tsx), [`/account`](../apps/web/app/account/page.tsx) |
| Promote (gated) | [`/invest/live-readiness`](../apps/web/app/invest/live-readiness/page.tsx), [`/invest/broker-modes`](../apps/web/app/invest/broker-modes/page.tsx), [`/invest/broker-health`](../apps/web/app/invest/broker-health/page.tsx) |
| Operate | [`/admin`](../apps/web/app/admin/page.tsx), [`/admin/monitoring`](../apps/web/app/admin/monitoring/page.tsx), [`/admin/live-readiness`](../apps/web/app/admin/live-readiness/page.tsx) |

---

## Persona 1 — Sione · The Serious Self-Directed Simulator-Trader

**Primary persona.** Mid-career professional, 5–15 years investing experience, €25K–€250K personal portfolio across stocks, ETFs, and selective crypto. Workstation-first. Burned before by black-box tools and the sim→live trust gap.

### Goals
- Run a disciplined, systematic strategy in **simulation** and trust the results.
- Promote a proven strategy to live **with documented evidence**, not hope — when the gate opens.
- Keep a defensible, auditable record of every order, signal, and risk check.

### Jobs-to-be-done
- *When* I evaluate a position, *I want* to see the signal, its confidence, and a one-line reason, *so I can* decide without reverse-engineering a black box.
- *When* I place a simulated order, *I want* to see the pre-trade risk gate outcome before I submit, *so I can* trust that the same checks will hold under live capital.
- *When* I review a run, *I want* an auditable order + transaction history, *so I can* prove to myself what happened and why.

### Frustrations
- Simulation tools that don't model slippage, fees, or partial fills — making sim P&L untrustworthy.
- Recommendations with no explanation and no honestly-derived confidence.
- Risk management that is manual and post-hoc rather than pre-trade and automated.

### Surfaces they live in
[`/dashboard`](../apps/web/app/dashboard/page.tsx) (start of day) →
[`/market`](../apps/web/app/market/page.tsx) and [`/signals`](../apps/web/app/signals/page.tsx) (scan) →
[`/invest/simulation`](../apps/web/app/invest/simulation/page.tsx) (the cockpit) →
[`/invest/orders`](../apps/web/app/invest/orders/page.tsx) and [`/portfolio/intelligence`](../apps/web/app/portfolio/intelligence/page.tsx) (audit & P&L) →
[`/invest/live-readiness`](../apps/web/app/invest/live-readiness/page.tsx) (gated promotion, later).

### Design implications
- **Pre-trade risk gate must be visible before submit** — not an internal-only check. Maps to GODTIER **B3** (sim cockpit) and PRD G4.
- **Simulation badge + data-freshness age on every tile.** Never imply guaranteed returns (financial-ui-safety rule).
- **Explainability on every signal** rendered as read-model text, not raw scores (B4 signal guide tooltip, AUR-006).
- **Auditability surfaces** — order history and snapshots must be exportable and stable; this is the foundation of his eventual promotion confidence.
- Stories: Epic **C2** (Simulation Trade Flow), Epic **B1** (Confidence & Explainability), Epic **D1** (Live Readiness UI, gated) — see [`stories/aurox-backlog-stories.md`](./stories/aurox-backlog-stories.md).

---

## Persona 2 — Marta · The Small Systematic Operator (Quant-Curious Power User)

Runs a small personal fund / family office with **parallel systematic strategies** across asset classes. Expert, programming background. Evaluates tools by auditability and risk integrity, not UI polish.

### Goals
- Configure strategy **lanes** with enforced per-lane capital and risk caps.
- Run several lanes in simulation simultaneously without cross-contamination.
- Have a **kill switch that actually works under stress** (survives restart — DB-backed, not in-memory).

### Jobs-to-be-done
- *When* one lane takes a bad trade, *I want* its capital isolated, *so that* the rest of the book is unaffected.
- *When* I review performance, *I want* per-lane attribution of signals → orders → risk outcomes, *so I can* prove what drove each result.
- *When* a model looks like it's drifting, *I want* one instant action to halt all autonomy, *so I can* re-engage manually without navigating per-lane screens.

### Frustrations
- Consumer platforms with no per-strategy capital isolation.
- No audit-grade accounting; can't reconstruct what happened.
- Signal tools disconnected from execution; manual re-implementation of every call.

### Surfaces they live in
[`/invest/accounts`](../apps/web/app/invest/accounts/page.tsx) (lane configuration) →
multiple lane views in [`/invest/simulation`](../apps/web/app/invest/simulation/page.tsx) and [`/portfolio/intelligence`](../apps/web/app/portfolio/intelligence/page.tsx) →
[`/observe`](../apps/web/app/observe/page.tsx) and [`/alerts`](../apps/web/app/alerts/page.tsx) (cross-lane monitoring) →
[`/invest/broker-modes`](../apps/web/app/invest/broker-modes/page.tsx) and [`/invest/live-readiness`](../apps/web/app/invest/live-readiness/page.tsx) (gated, per-lane).

### Design implications
- **Lane is a first-class object** with visible capital cap, risk envelope, and a human-readable display name (AUR-008, AUR-017). Lane-level autonomy, never a global per-lane bypass — see [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md).
- **Kill switch is prominent and asymmetric**: turning autonomy OFF is instant and always permitted; turning it ON is gated and per-lane (autonomy asymmetry principle).
- **Per-lane attribution** in observe/alerts: every event ties back to a lane, signal, and risk outcome.
- Stories: Epic **D2** (AI Autonomy Control), Epic **F1** (Admin Monitoring), Epic **G3** (financial-safety test coverage).

---

## Persona 3 — Theo · The Analytically Curious Discretionary Trader (Cautious Learner)

Active individual investor, 2–5 years experience, intermediate. Uses Aurox primarily for **market intelligence and signal discovery** to inform discretionary trades. May not run systematic strategies at all.

### Goals
- Understand what the signals say about a specific asset, **why**, and **how confident** the system is.
- Learn to read confidence and freshness so he doesn't over-trust a weak or stale signal.
- Make better-informed discretionary decisions — fast.

### Jobs-to-be-done
- *When* I look at an asset card, *I want* a signal label, confidence indicator, and freshness marker in one glance, *so I can* triage in seconds.
- *When* news breaks, *I want* a "why this matters for [symbol]" annotation, *so I can* connect macro/news to the signal.
- *When* confidence is low, *I want* that surfaced visually, *so I* don't act on a 30%-confidence call thinking it's a strong buy.

### Frustrations
- "Buy/sell" verdicts with no reliability or freshness indication.
- News and macro disconnected from signal scores.
- Invisible data freshness — no way to tell a 5-second price from a 5-minute one.

### Surfaces they live in
[`/market`](../apps/web/app/market/page.tsx) and [`/signals`](../apps/web/app/signals/page.tsx) (daily entry points) →
[`/forecasts`](../apps/web/app/forecasts/page.tsx) and [`/macro`](../apps/web/app/macro/page.tsx) (context) →
[`/news`](../apps/web/app/news/page.tsx) and [`/watchlist`](../apps/web/app/watchlist/page.tsx) →
asset detail pages → optionally [`/invest/simulation`](../apps/web/app/invest/simulation/page.tsx) to try a paper trade.

### Design implications
- **Confidence legend + low-confidence visual state everywhere** (AUR-005 done; signal-visual-state rule). Low confidence must look different from high confidence, never a confident green badge on a 0.05 signal.
- **Data-freshness chips** on every price/signal (quote-snapshot rule). Stale = visible.
- **Signal guide & explainability copy** written for a learner (B4, AUR-006/AUR-007).
- **Safety language**: no "guaranteed", "will", "certain"; recommendations are "indicative only" (Epic **H2** Signal Safety Language).
- He is the persona most exposed to the **sparse-route rescue** (GODTIER **Phase C**: `/macro`, `/forecasts`, `/news` visual encoding).

---

## Persona 4 — Operator / Admin · The Platform Monitor

Internal team member or power-user admin. Expert, technical. Monitors provider health, readiness-gate status, lane configs, and observability.

### Goals
- Know at a glance whether the **data pipeline is healthy** and whether any provider is degraded.
- See whether a given account's **live-readiness gate** would pass right now — without DB access.
- Verify **kill-switch states** and **provider fallback** behavior under degraded conditions.

### Jobs-to-be-done
- *When* I start a shift, *I want* a single surface for provider health + fallback chain status, *so I* can spot degradation before users do.
- *When* a live-adjacent operation is requested, *I want* the readiness gate result per account, *so I* can confirm it's defensible.
- *When* a provider 429s or stalls, *I want* the degraded state surfaced (not silently swallowed), *so I* can act.

### Frustrations
- Provider runtime health fields partially implemented.
- Readiness gate state not exposed in one dashboard view.
- Lane configs not inspectable without direct DB access.

### Surfaces they live in
[`/admin`](../apps/web/app/admin/page.tsx) →
[`/admin/monitoring`](../apps/web/app/admin/monitoring/page.tsx) (provider health, observability) →
[`/admin/live-readiness`](../apps/web/app/admin/live-readiness/page.tsx) and [`/invest/broker-health`](../apps/web/app/invest/broker-health/page.tsx) →
[`/observe`](../apps/web/app/observe/page.tsx) and [`/alerts`](../apps/web/app/alerts/page.tsx) (degraded/anomaly stream).

### Design implications
- **Provider fallback + degraded state must be observable**, never silent (provider-fallback rule, no-fake-market-data rule).
- **Readiness gate as a structured, evidence-backed checklist** per account/lane (mirrors the user-facing D1).
- **Kill-switch state is inspectable** and survives restart (DB-backed, kill-switch rule).
- Stories: Epic **F1** (Admin Monitoring & Provider Health), Epic **F2** (Performance & Caching Safety), Epic **G1** (Security Hardening).

---

## Cross-persona design invariants

These hold for **every** persona and every surface (enforced by `.claude/rules/` and the GODTIER guardrails):

| Invariant | Why it matters per persona |
|---|---|
| Simulation badge always visible | Sione/Marta must never confuse sim with live; Theo must not mistake a paper result for real performance |
| Data-freshness age on every data tile | Theo's triage; Marta's lane monitoring; Operator's degradation watch |
| Confidence honestly derived + visually distinct at low values | Theo's core need; gates Sione's trade decisions |
| Explainability text on every signal/forecast/recommendation | Sione's audit; Theo's learning; EU AI Act alignment |
| No guaranteed-return / "will" / "certain" language | All personas; financial-ui-safety rule |
| Risk gate visible pre-trade (sim and live) | Sione's trust bridge; Marta's discipline |
| Autonomy OFF is instant; ON is gated + per-lane | Marta's stress-event safety; see autonomy asymmetry |

---

## Related documents

- Master PRD personas & journeys: [`prd/aurox-intelligence.md`](./prd/aurox-intelligence.md)
- Autonomy control surface: [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md)
- UX research & heuristics: [`ux/ux-research-and-heuristic-evaluation.md`](./ux/ux-research-and-heuristic-evaluation.md)
- Roadmap (Now/Next/Later): [`roadmap.md`](./roadmap.md)
- Success metrics: [`success-metrics.md`](./success-metrics.md)
- Product decisions: [`decisions.md`](./decisions.md)
- Story map: [`stories/aurox-backlog-stories.md`](./stories/aurox-backlog-stories.md)
