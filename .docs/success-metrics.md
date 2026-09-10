# Aurox Intelligence — Product Success Metrics

**Status:** Living document
**Date:** 2026-06-19
**Owner:** Product
**Phase:** Simulation-first. Metrics here measure a **decision-support and simulation workstation** —
**not real-money P&L**. Live-trading outcome metrics are **[Roadmap / Gated]** and out of scope for
this cycle.

> Grounded in the shipped observation + alert features:
> [`/observe`](../apps/web/app/observe/page.tsx), [`/alerts`](../apps/web/app/alerts/page.tsx), the
> observation-events repository
> ([`packages/db/src/repositories/observation-events-repository.ts`](../packages/db/src/repositories/observation-events-repository.ts))
> and the alerts repository
> ([`packages/db/src/repositories/alerts-repository.ts`](../packages/db/src/repositories/alerts-repository.ts)).
> These tables already capture `severity`, `confidence`, `score`, `source`, and lifecycle state
> (`read` / `pinned` / `dismissed`; alert `status` OPEN→RESOLVED) — the instrumentation backbone for
> the metrics below.

---

## 1. North-Star Metric

**Trustworthy decisions enabled per active user, per week.**

> A *trustworthy decision* = a user reaching a simulate / watch / dismiss / promote-readiness action
> **on an asset where the system surfaced a confidence-scored, explained, freshness-stamped signal
> or observation event** — i.e. the user acted *with the system's reasoning visible*, not in spite of
> a black box.

**Why this north star (and not P&L):**
- Aurox is simulation-first and explicitly **does not** claim or optimize for real-money returns.
  Optimizing P&L would violate the financial-UI-safety positioning (no guaranteed/implied returns).
- It rewards the product's actual value: **explainable, confidence-calibrated, fresh** intelligence
  that a serious operator can act on and audit.
- It is **measurable today** from the observation-event + simulation-order data already persisted.

**Operational definition (composed from existing data):**
```
NSM(user, week) = count of qualifying user actions where, at action time:
    - an observation event OR signal existed for the asset/lane
    - that event/signal carried a non-null confidence  (explainability present)
    - the underlying quote/data was within freshness threshold  (not stale)
```
A decision that was made on **stale** data, or with **no surfaced explanation**, **does not count** —
by design. The north star can only go up by making intelligence *more trustworthy*, not by nudging
users to trade more.

---

## 2. Input Metrics (leading — what moves the north star)

These are the levers. Each maps to a NOW/NEXT theme in [`roadmap.md`](./roadmap.md).

| Input metric | Definition | Source | Roadmap theme |
|---|---|---|---|
| **Explainability coverage** | % of rendered signals/forecasts/events with a non-empty `explanation` and non-null `confidence` | observation-events (`confidence`, `description`), signals VM | B1, B4 |
| **Confidence-legible rate** | % of signal/forecast impressions where confidence + its legend were rendered (not just a raw number) | observe/signals VM telemetry | B1 (AUR-005/006) |
| **Freshness-pass rate** | % of data tiles rendered within the asset-class staleness threshold | quote/freshness layer | quote-snapshot rule |
| **Observe→action conversion** | % of observation events that lead to a downstream user action (simulate / watch / pin) within session | observation-event lifecycle (`read`/`pinned` → order) | Observe/Alert theme |
| **Alert triage rate** | % of alerts moved OPEN → READ/PINNED/RESOLVED (vs. ignored) | alerts `status` transitions | F1 / Alert center |
| **Sim cockpit completion** | % of started simulation tickets that reach a submitted order after seeing the pre-trade risk gate | simulation-order flow | C2, B3 |
| **Surface coverage of GODTIER pillars** | % of flagship + sparse routes meeting the 5 GODTIER pillars and all four states (loading/empty/error/degraded) | design QA checklist | A–C |
| **Readiness-evidence completeness** (NEXT) | % of readiness checks on [`/invest/live-readiness`](../apps/web/app/invest/live-readiness/page.tsx) that render structured evidence, not just pass/fail | readiness gate VM | D1 |

---

## 3. Guardrail Metrics (must NOT regress — safety over growth)

Guardrails encode the non-negotiable product contract. A win on the north star that breaks a
guardrail is **not a win**.

| Guardrail | Target | Enforced by |
|---|---|---|
| **No guaranteed-return language** | 0 occurrences of "guaranteed / will / certain / risk-free" in user-facing copy | [`financial-ui-safety` rule](../.claude/rules/financial-ui-safety-rule.md); copy lint |
| **Simulation badge presence** | 100% of trade-capable surfaces show `SIMULATION` mode badge | observe/alerts/invest VMs already emit "Simulation only" |
| **Data-freshness disclosure** | 100% of stale data (`isStale`) renders a visible staleness indicator | quote-snapshot rule; degraded-state QA |
| **Explainability floor** | 0 signals/forecasts/recommendations shipped with empty `explanation` | [`explainability` rule](../.claude/rules/explainability-rule.md) |
| **Confidence honesty** | 0 hardcoded `confidence: 1.0` from automated systems; low confidence visually distinct | [`confidence-score` rule](../.claude/rules/confidence-score-rule.md), [`signal-visual-state` rule](../.claude/rules/signal-visual-state-rule.md) |
| **No fabricated market data** | 0 hardcoded/interpolated price substitutions; degraded = surfaced | [`no-fake-market-data` rule](../.claude/rules/no-fake-market-data.md) |
| **Risk gate visibility (sim)** | 100% of simulated orders show pre-trade risk-gate outcome | risk-gates-required rule; Epic C2 |
| **Live stays locked** | 0 live executions enabled without `assertLiveReadinessGate` pass | [`live-trading-lock` rule](../.claude/rules/live-trading-lock.md) |
| **a11y AA** | 0 new WCAG 2.1 AA regressions on changed surfaces | [`accessibility` rule](../.claude/rules/accessibility-rule.md) |
| **User-data isolation** | 0 cross-user cache leaks of portfolio/account/sim state | [`user-specific-cache` rule](../.claude/rules/user-specific-cache-rule.md) |

---

## 4. Counter-metrics (watch for unintended harm)

| Counter-metric | Risk it guards against |
|---|---|
| **Stale-action rate** | Users acting on data past freshness threshold — should trend to 0 |
| **Low-confidence over-trust rate** | Simulated orders placed on `confidence < 0.4` signals without the low-confidence state shown |
| **Alert fatigue** | Rising alert volume with falling triage rate (signals over-alerting; tune dedupe/cooldown) |
| **Unexplained-impression share** | Share of signal impressions with no explanation rendered — must not rise as we add density |

---

## 5. Instrumentation & Event Plan

The persistence layer already exists; the plan is to **emit, then read** consistently.

### 5.1 Existing data we build on
- **Observation events** — [`observation-events-repository.ts`](../packages/db/src/repositories/observation-events-repository.ts):
  `source`, `eventType`, `severity`, `confidence`, `score`, `related*` links, and lifecycle flags
  (`read`, `pinned`, `dismissed`), plus `markObservationEventRead/Pinned/Dismissed`. These give us
  **impression → engagement → action** without new tables.
- **Alerts** — [`alerts-repository.ts`](../packages/db/src/repositories/alerts-repository.ts):
  `category`, `severity` (INFO/WATCH/WARNING/CRITICAL), `status`
  (OPEN/READ/PINNED/SNOOZED/DISMISSED/RESOLVED), dedupe/cooldown — the **triage-rate** backbone.
- **Simulation orders / snapshots** — the audit-grade ledger gives us **risk-gate-shown** and
  **ticket-completion** signals.

### 5.2 Product events to standardize (analytics layer, not the financial ledger)

| Event | When | Key properties |
|---|---|---|
| `signal_impression` | A signal/forecast tile renders | `symbol`, `confidence`, `explanationPresent`, `isStale`, `surface` |
| `confidence_legend_rendered` | Confidence + legend shown together | `surface`, `confidenceBucket` |
| `observation_event_viewed` | Event opened on [`/observe`](../apps/web/app/observe/page.tsx) | `eventType`, `severity`, `source` |
| `observation_event_engaged` | `read`/`pinned` toggled | `eventId`, `action` |
| `alert_triaged` | Alert `status` transition | `category`, `severity`, `from`, `to` |
| `sim_ticket_opened` / `sim_risk_gate_shown` / `sim_order_submitted` | Sim cockpit funnel | `lane`, `riskGateOutcome`, `confidence` |
| `degraded_state_shown` | Any loading/empty/error/degraded state renders | `surface`, `reason` |
| `freshness_violation_rendered` | Stale tile rendered with indicator | `surface`, `ageMs` |
| `readiness_check_viewed` (NEXT) | Readiness checklist rendered | `check`, `status`, `evidencePresent` |

**Principles for instrumentation (carry the product contract into telemetry):**
- Events are **request-scoped and user-scoped**; never persist user financial state in a shared
  analytics cache ([`user-specific-cache` rule](../.claude/rules/user-specific-cache-rule.md)).
- Telemetry must **never fabricate** confidence/freshness — it reports what was actually rendered.
- Analytics events are **separate** from the simulation ledger; they never mutate accounting state.
- No PII or secrets in event payloads ([`env-secret` rule](../.claude/rules/env-secret-rule.md)).

### 5.3 Reporting cadence
- **Weekly:** north star, input metrics, alert triage / fatigue.
- **Per-PR (GODTIER slices):** guardrail checklist (badge present, freshness shown, no
  guaranteed-return copy, a11y) as part of the Change Summary.
- **Continuous:** guardrail counters surface in [`/admin/monitoring`](../apps/web/app/admin/monitoring/page.tsx)
  alongside provider health.

---

## 6. Explicitly NOT success metrics (this cycle)

- Real-money P&L, returns, or win-rate — **[Roadmap / Gated]**; implying these would violate the
  financial-UI-safety positioning.
- Trade volume / orders-per-user as a growth goal — we measure *trustworthy* decisions, not *more*
  decisions.
- Time-on-site as a primary goal — a serious workstation should let users decide **faster**, not
  keep them engaged longer.

---

## Related documents

- Roadmap: [`roadmap.md`](./roadmap.md)
- Personas: [`personas.md`](./personas.md)
- Decisions: [`decisions.md`](./decisions.md)
- Master PRD (goals G2/G4/G7/G8): [`prd/aurox-intelligence.md`](./prd/aurox-intelligence.md)
- UX research & heuristics: [`ux/ux-research-and-heuristic-evaluation.md`](./ux/ux-research-and-heuristic-evaluation.md)
- Story map: [`stories/aurox-backlog-stories.md`](./stories/aurox-backlog-stories.md)
