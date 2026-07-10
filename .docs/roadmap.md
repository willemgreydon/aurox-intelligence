# Aurox Intelligence — Product Roadmap (Now / Next / Later)

**Status:** Living document
**Date:** 2026-06-19
**Owner:** Product
**Active branch context:** `feat/godtier-ui`

> This roadmap is **theme-based**, not date-based. It maps where energy goes today, what unlocks
> next, and what is explicitly deferred behind safety gates. It is grounded in
> [`godtier-interface-upgrade-epic.md`](./godtier-interface-upgrade-epic.md), the story map
> ([`stories/aurox-backlog-stories.md`](./stories/aurox-backlog-stories.md)), the master PRD
> ([`prd/aurox-intelligence.md`](./prd/aurox-intelligence.md)), and the live-microtrading blueprint
> ([`../docs/live-microtrading/overview.md`](../docs/live-microtrading/overview.md)).
>
> **Positioning constant:** Aurox is **simulation-first** today and simulation is the **permanent
> safety on-ramp**. Live real-money trading is a committed *destination* (PRD G0) but is
> **[Roadmap / Gated]** — sequenced behind the readiness gate, never enabled by default.

---

## The cut line (read this first)

```
  ───────────── SHIP NOW (simulation-only) ─────────────
  GODTIER UI epic · explainability · risk-gate visibility · audit surfaces
  ──────────────────────────────────────────────────────
                         ⟂ CUT LINE ⟂
  ──────────────────────────────────────────────────────
  Everything below requires: assertLiveReadinessGate PASS +
  DB-backed kill switch + per-lane caps + broker sandbox→live +
  explicit human confirmation. NOT in this cycle.
  ───────────── LATER (gated, real-money) ──────────────
```

**Rule:** No item below the cut line ships, defaults on, or becomes easier to enable as a side
effect of any "Now"/"Next" work. Live execution stays locked until **all** readiness conditions
pass (see [`../docs/live-microtrading/readiness-checklist.md`](../docs/live-microtrading/readiness-checklist.md)
and [`live-trading-lock` rule](../.claude/rules/live-trading-lock.md)).

---

## NOW — Simulation-first GODTIER workstation

**Theme:** Turn a strong technical foundation into a Bloomberg/TradingView-class **simulation**
workstation with premium polish and trust on every tile. This is **refinement + elevation**, not
triage — most ship-blocking UX fixes are already done.

Source of truth: [`godtier-interface-upgrade-epic.md`](./godtier-interface-upgrade-epic.md).

| Theme | What it delivers | Key stories / epic phase | Primary surfaces |
|---|---|---|---|
| **Design language foundation** | One card primitive, one badge taxonomy, one metric tile, documented token/type/spacing/motion scale | GODTIER **A1–A4**; AUR-048 (dead-code) | system-wide |
| **Flagship surface glow-ups** | Dashboard CTA-by-state, market graph polish, sim cockpit nav + soft warnings, signals explainability | GODTIER **B1–B4**; AUR-022/015/014/017/016/006/007 | [`/dashboard`](../apps/web/app/dashboard/page.tsx), [`/market`](../apps/web/app/market/page.tsx), [`/invest/simulation`](../apps/web/app/invest/simulation/page.tsx), [`/signals`](../apps/web/app/signals/page.tsx) |
| **Sparse-route rescue** | Designed loading/empty/error/degraded states + visual encoding for raw screens | GODTIER **Phase C** | [`/macro`](../apps/web/app/macro/page.tsx), [`/forecasts`](../apps/web/app/forecasts/page.tsx), [`/markets/intelligence`](../apps/web/app/markets/intelligence/page.tsx), [`/finance`](../apps/web/app/finance/page.tsx), [`/news`](../apps/web/app/news/page.tsx), [`/invest/accounts`](../apps/web/app/invest/accounts/page.tsx) |
| **Explainability & confidence everywhere** | Confidence legend, signal guide tooltip, low-confidence visual state, freshness chips | Epic **B1**; AUR-005 (done), AUR-006/007; signal-visual-state rule | [`/signals`](../apps/web/app/signals/page.tsx), [`/forecasts`](../apps/web/app/forecasts/page.tsx), [`/market`](../apps/web/app/market/page.tsx) |
| **Risk-gate visibility (sim)** | Pre-trade risk gate outcome shown before submit; position-size soft warning | Epic **C2**; AUR-014; GODTIER **B3** | [`/invest/simulation`](../apps/web/app/invest/simulation/page.tsx) |
| **Observe + Alert intelligence** | Prioritized observation-event stream and alert center, simulation-only | Epic **F**-adjacent; observe/alerts surfaces | [`/observe`](../apps/web/app/observe/page.tsx), [`/alerts`](../apps/web/app/alerts/page.tsx) |
| **Wayfinding** | ⌘K header hint, resume-simulation in account menu, lane display names, ticker degraded label | GODTIER **Phase D**; AUR-020/021/008/004 | header, [`/account`](../apps/web/app/account/page.tsx) |
| **Trust & safety language** | No guaranteed-return copy; "indicative only" framing; tab/table a11y | Epic **H2**, **H3** | system-wide |

**Recommended first slice (per GODTIER §5):** Phase **A1 + A4-lite → B1 (Dashboard)** — low-risk,
lifts every later slice, and turns the most-seen screen into the reference implementation.

**Exit criteria for NOW:** every flagship surface holds the five GODTIER pillars (one language;
density with calm; living not static; trust on every tile; deterministic & safe), and every section
has loading/empty/error/degraded states.

---

## NEXT — Promotion-readiness UX & autonomy control (buildable in simulation)

**Theme:** Build the **trust-bridge surfaces** that make eventual live promotion defensible — fully
testable **now in simulation**, with live execution still locked. Nothing here moves real money.

| Theme | What it delivers | Key stories / refs | Status note |
|---|---|---|---|
| **Live Readiness Gate UI** | Structured, evidence-backed readiness checklist per account/lane (broker sandbox passing, risk gate active, confidence threshold, kill-switch tested, freshness, observability) | Epic **D1** ([`stories`](./stories/aurox-backlog-stories.md)); [`/invest/live-readiness`](../apps/web/app/invest/live-readiness/page.tsx) | UI buildable now; gate stays read-only/sandbox |
| **AI Autonomy Control surface** | Asymmetric master enable/disable + per-lane activation; instant OFF, gated ON | [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md); Epic **D2** | Simulation slice buildable now |
| **Audit export** | Downloadable run summary: signal history + explanations, risk-gate outcomes, P&L attribution | Journey B (PRD §5); Epic **D1** | Strengthens Sione/Marta promotion confidence |
| **Admin monitoring completeness** | Single surface for provider health + fallback chain + readiness status + kill-switch state | Epic **F1**; [`/admin/monitoring`](../apps/web/app/admin/monitoring/page.tsx) | Closes Operator gaps |
| **Claude Finance as explainable side-input** | AI augmentation as a signal side-input + explanation, never execution authority | Epic **H4**; PRD G8 | Must remain non-authoritative |
| **Platform hardening** | Caching/cache-safety correctness, i18n completeness, security hardening, financial-safety test coverage | Epics **F2, G1, G3, G5, G6** | Durable foundation for any live step |

**Dependency note:** NEXT depends on NOW's design language (so readiness/autonomy surfaces inherit
the unified card/badge/metric system) and on the observe/alert event model already shipping.

---

## LATER — Live microtrading (explicitly gated / deferred)

**Theme:** Staged real-money execution under strict controls. **Deferred on the board to
`P9 [Future · Real-Money/Live]`.** Blueprint:
[`../docs/live-microtrading/`](../docs/live-microtrading/overview.md).

The staged target model (from the live-microtrading overview):

| Stage | Mode | Control posture |
|---|---|---|
| L0 | `simulation` (today) | Default; persisted accounting; lane-aware |
| L1 | `manual_live_guarded` | User-triggered live trades; no autonomous dispatch |
| L2 | `ai_suggested_live` | AI proposes; human approval required per order / bounded session |
| L3 | `ai_autonomous_live_limited` | Autonomous only for approved lanes; strict per-lane caps; always-on kill switch |

**Gating dependencies (hard, all required before L1):**
- `assertLiveReadinessGate` passes for the account/lane — [`live-trading-lock` rule](../.claude/rules/live-trading-lock.md)
- DB-backed kill switch present and tested — [`kill-switch` rule](../.claude/rules/kill-switch-rule.md)
- Risk gates active on the live path (same gates as simulation) — [`risk-gates-required` rule](../.claude/rules/risk-gates-required.md)
- Broker defaults to sandbox; live endpoint requires explicit confirmed config — [`broker-sandbox` rule](../.claude/rules/broker-sandbox-rule.md)
- Per-broker + per-instrument micro-order feasibility validated (min notional / quantity / precision)
- Bank-account funding verification (Epic **E1**, **[Roadmap / Gated]**)
- Observability + incident response active — [`../docs/live-microtrading/incident-response-and-kill-switch.md`](../docs/live-microtrading/incident-response-and-kill-switch.md)

**Critical principle:** Autonomy level is a **lane-level** setting, never a global toggle. The global
master is a **safety ceiling and emergency off-switch**, not a per-lane bypass (autonomy asymmetry).

Stories: Epic **D2** (autonomy, live portions), Epic **E1/E2** (funding, **[Roadmap / Gated]**),
plus the live-microtrading blueprint set
([architecture-delta](../docs/live-microtrading/architecture-delta.md),
[lane-autonomy-model](../docs/live-microtrading/lane-autonomy-model.md),
[risk-policy-and-guards](../docs/live-microtrading/risk-policy-and-guards.md),
[broker-constraints-and-order-sizing](../docs/live-microtrading/broker-constraints-and-order-sizing.md),
[rollout-plan](../docs/live-microtrading/rollout-plan.md),
[readiness-checklist](../docs/live-microtrading/readiness-checklist.md)).

---

## Theme dependency map

```
  Design language (A1–A4)
        │
        ├──► Flagship glow-ups (B1–B4) ──► Sparse-route rescue (C) ──► Wayfinding (D)
        │
        └──► Readiness Gate UI (D1) ─┐
             Autonomy control (D2) ──┼──► [CUT LINE] ──► Live L1→L2→L3
             Admin monitoring (F1) ──┘        ▲
                                              │
        Observe/Alert event model ────────────┘ (feeds risk + readiness evidence)
```

---

## What this roadmap deliberately excludes (this cycle)

Aligned with PRD §3 Non-Goals: mass-market frictionless onboarding; live autonomy on by default;
LLM strategy generation; AI as execution authority; opaque/black-box scoring; ungated live order
routing or bank-fund movement; tax/wealth advice; mobile-native app. Each gated item is *sequenced*,
not cancelled.

---

## Related documents

- GODTIER epic: [`godtier-interface-upgrade-epic.md`](./godtier-interface-upgrade-epic.md)
- Master PRD: [`prd/aurox-intelligence.md`](./prd/aurox-intelligence.md)
- Autonomy control: [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md)
- Story map: [`stories/aurox-backlog-stories.md`](./stories/aurox-backlog-stories.md)
- Live-microtrading blueprint: [`../docs/live-microtrading/overview.md`](../docs/live-microtrading/overview.md)
- Personas: [`personas.md`](./personas.md) · Metrics: [`success-metrics.md`](./success-metrics.md) · Decisions: [`decisions.md`](./decisions.md)
