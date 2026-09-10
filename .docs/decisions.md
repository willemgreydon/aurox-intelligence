# Aurox Intelligence — Product Decision Log

**Status:** Living document (append-only; supersede, don't rewrite)
**Date:** 2026-06-19
**Owner:** Product

> This is the **product**-side decision log: the durable *product* choices that shape what Aurox is
> and is not. It is the counterpart to the **engineering** Architecture Decision Records at
> [`../docs/adr/`](../docs/adr/README.md). Where a product decision is *also* encoded and enforced in
> code, it cross-links to the relevant ADR and `.claude/rules/` file. When a rule/ADR and this log
> disagree, **the rule is the executable source of truth** and this log must be corrected.

**Format:** each decision has an ID (`PD-NN`), a status, the decision stated plainly, its rationale,
and links. Statuses: `Accepted` · `Superseded by PD-NN` · `Deprecated`.

---

## Index

| ID | Decision | Status | Engineering ADR |
|---|---|---|---|
| [PD-01](#pd-01--simulation-first-before-live) | Simulation-first before live | Accepted | [ADR-0002](../docs/adr/0002-simulation-first-execution.md) |
| [PD-02](#pd-02--ai-is-augmentation-not-authority) | AI is augmentation, not authority | Accepted | — (PRD G7/G8) |
| [PD-03](#pd-03--explainability-required-on-every-output) | Explainability required on every output | Accepted | [ADR-0001](../docs/adr/0001-deterministic-first-philosophy.md) |
| [PD-04](#pd-04--confidence-honestly-derived-never-hardcoded) | Confidence honestly derived, never hardcoded | Accepted | [ADR-0001](../docs/adr/0001-deterministic-first-philosophy.md) |
| [PD-05](#pd-05--autonomy-gated-behind-readiness--lane-level-only) | Autonomy gated behind readiness; lane-level only | Accepted | [ADR-0002](../docs/adr/0002-simulation-first-execution.md), [ADR-0008](../docs/adr/0008-risk-gates-and-kill-switch.md) |
| [PD-06](#pd-06--no-fabricated-market-data) | No fabricated market data | Accepted | [ADR-0007](../docs/adr/0007-provider-fallback-and-no-fake-data.md) |
| [PD-07](#pd-07--risk-gates-mandatory-on-every-execution-path) | Risk gates mandatory on every path (sim + live) | Accepted | [ADR-0008](../docs/adr/0008-risk-gates-and-kill-switch.md) |
| [PD-08](#pd-08--no-guaranteed-return-language-financial-ui-safety) | No guaranteed-return language | Accepted | — (UI safety rule) |
| [PD-09](#pd-09--workstation-first-not-mass-market) | Workstation-first, not mass-market | Accepted | — (PRD §3) |
| [PD-10](#pd-10--godtier-ui-is-the-current-focus-not-going-live) | GODTIER UI is the current focus, not "going live" | Accepted | — (GODTIER epic) |

---

## PD-01 · Simulation-first before live
- **Status:** Accepted
- **Decision:** Every account operates in **simulation** by default. Live real-money execution is a
  committed *destination* but is **[Roadmap / Gated]** behind an auditable readiness gate. Simulation
  is the permanent, mandatory safety **on-ramp** — never a toy.
- **Rationale:** ~62% of systematic retail traders abandon within three months of going live, mostly
  because the sim→live transition is structurally unsafe. A serious, accounting-grade simulation that
  shares the **same** signal-to-fill logic as live is the trust bridge. The cost of a simulation-first
  default is near zero; the cost of an unintended live order is real, irreversible capital loss.
- **Links:** [ADR-0002](../docs/adr/0002-simulation-first-execution.md) ·
  [`simulation-first` rule](../.claude/rules/simulation-first-rule.md) ·
  [`roadmap.md`](./roadmap.md) · PRD G0/G1/G3.

## PD-02 · AI is augmentation, not authority
- **Status:** Accepted
- **Decision:** AI (including Claude Finance) **suggests and explains**; it never decides or executes
  real money without human confirmation. AI is a signal **side-input** and explainability engine — not
  a strategy author and not an execution authority.
- **Rationale:** Human-in-the-loop is non-negotiable for trust and for EU AI Act Article 14 (human
  oversight). Black-box AI authority is exactly the failure mode our target users have been burned by.
- **Links:** PRD G7/G8 · [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md) ·
  [`explainability` rule](../.claude/rules/explainability-rule.md). Even bounded autonomous live
  (PD-05) keeps AI inside per-lane risk envelopes — not as unbounded authority.

## PD-03 · Explainability required on every output
- **Status:** Accepted
- **Decision:** Every signal, forecast, observation event, and recommendation must carry a non-empty,
  human-readable `explanation`. No score, label, or verdict ships without its "why".
- **Rationale:** A recommendation a user cannot understand cannot be challenged before acting on it.
  Explainability is a financial-safety requirement and an EU AI Act traceability alignment, not polish.
- **Links:** [ADR-0001](../docs/adr/0001-deterministic-first-philosophy.md) ·
  [`explainability` rule](../.claude/rules/explainability-rule.md) ·
  observation events persist `description`/`confidence`
  ([repo](../packages/db/src/repositories/observation-events-repository.ts)) ·
  metric: explainability coverage in [`success-metrics.md`](./success-metrics.md).

## PD-04 · Confidence honestly derived, never hardcoded
- **Status:** Accepted
- **Decision:** Confidence (0–1) is derived from data quality — staleness, bar count, fallback usage,
  conflicting signals — and is **visually distinct at low values**. No automated system emits
  `confidence: 1.0`; insufficient data yields `confidence: 0`, never `NaN`.
- **Rationale:** Confidence is the primary safety gate against acting on bad data. A hardcoded
  high-confidence value on stale/sparse data can drive a decision a calibrated value would have blocked.
- **Links:** [`confidence-score` rule](../.claude/rules/confidence-score-rule.md) ·
  [`insufficient-data` rule](../.claude/rules/insufficient-data-rule.md) ·
  [`signal-visual-state` rule](../.claude/rules/signal-visual-state-rule.md).

## PD-05 · Autonomy gated behind readiness; lane-level only
- **Status:** Accepted
- **Decision:** Autonomous execution is **never a global toggle**. Autonomy is a **lane-level** setting.
  The global master is an **asymmetric** instrument: turning autonomy **OFF is instant and always
  permitted**; turning it **ON is gated, explicit, and per-lane** — the master enable is necessary but
  not sufficient, and each lane must independently pass its readiness conditions.
- **Rationale:** Bounded, reversible delegation is the only safe path to autonomy. If "off" is as hard
  as "on", users avoid delegation entirely. EU AI Act Article 14 requires an always-accessible halt.
- **Links:** [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md) ·
  [`live-trading-lock` rule](../.claude/rules/live-trading-lock.md) ·
  [`kill-switch` rule](../.claude/rules/kill-switch-rule.md) ·
  [`../docs/live-microtrading/lane-autonomy-model.md`](../docs/live-microtrading/lane-autonomy-model.md) ·
  [ADR-0002](../docs/adr/0002-simulation-first-execution.md), [ADR-0008](../docs/adr/0008-risk-gates-and-kill-switch.md).

## PD-06 · No fabricated market data
- **Status:** Accepted
- **Decision:** The system **never** fabricates, interpolates, or silently substitutes market data.
  Missing/stale data is surfaced as a typed degraded state or `confidence: 0` — never replaced with an
  invented value. All configured provider fallbacks are attempted first; degraded state reaches the UI.
- **Rationale:** A fabricated price produces a signal that *looks* real and can drive a (sim today,
  live later) decision on invented data — a critical defect in any market-connected system.
- **Links:** [`no-fake-market-data` rule](../.claude/rules/no-fake-market-data.md) ·
  [`provider-fallback` rule](../.claude/rules/provider-fallback-rule.md) ·
  [`quote-snapshot` rule](../.claude/rules/quote-snapshot-rule.md) · [ADR-0007](../docs/adr/0007-provider-fallback-and-no-fake-data.md).

## PD-07 · Risk gates mandatory on every execution path
- **Status:** Accepted
- **Decision:** Every order — **simulation and live alike** — passes pre-trade risk validation before
  submission (cash, max position, drawdown, liquidity, slippage, instrument constraints, data freshness,
  confidence floor, lane permission, kill switch). Pre-trade outcomes are made **visible to the user**.
- **Rationale:** Risk checks that only run in live mode make simulation results non-predictive. Making
  the gate user-facing converts internal safety infrastructure into a product differentiator (PRD G4).
- **Links:** [`risk-gates-required` rule](../.claude/rules/risk-gates-required.md) ·
  [`execution-safety` rule](../.claude/rules/execution-safety.md) · [ADR-0008](../docs/adr/0008-risk-gates-and-kill-switch.md) ·
  Stories Epic C2.

## PD-08 · No guaranteed-return language (financial UI safety)
- **Status:** Accepted
- **Decision:** No user-facing copy implies guaranteed or certain returns ("will", "guaranteed",
  "risk-free", "certain to rise"). Recommendations are framed as "indicative only" with disclaimers.
  The simulation badge and data-freshness indicators are always visible on trade-capable surfaces.
- **Rationale:** A user who reads a signal as a guarantee over-sizes positions. A removed sim badge lets
  users confuse simulation with real performance. This is user protection, not aesthetics — it is a
  zero-tolerance guardrail in [`success-metrics.md`](./success-metrics.md).
- **Links:** [`financial-ui-safety` rule](../.claude/rules/financial-ui-safety-rule.md) ·
  GODTIER pillar 4 (trust on every tile) · Stories Epic H2.

## PD-09 · Workstation-first, not mass-market
- **Status:** Accepted
- **Decision:** Aurox targets the **serious self-directed investor and small systematic operator** on a
  desktop workstation. No mass-market frictionless onboarding; no mobile-native app this cycle. Trust
  requires deliberate friction.
- **Rationale:** The unoccupied market quadrant is *deep explainable AI + accounting-grade execution*,
  not another consumer trading app. Our personas (Sione, Marta, Theo, Operator) value auditability and
  density over instant gratification.
- **Links:** PRD §3 Non-Goals · [`personas.md`](./personas.md) ·
  [`workstation-ui` rule](../.claude/rules/workstation-ui-rule.md).

## PD-10 · GODTIER UI is the current focus, not "going live"
- **Status:** Accepted
- **Decision:** This cycle redirects energy from "going live" to making the **simulation** workstation
  *godtier* — Bloomberg/TradingView-class density with premium polish and trust. Real-money/live tasks
  are deferred on the board to `P9 [Future · Real-Money/Live]`.
- **Rationale:** Most ship-blocking UX fixes are already done; the highest-leverage product work now is
  refinement + elevation of the simulation surfaces, which also builds the trust foundation any future
  live step depends on. This does not weaken or hasten the live gate.
- **Links:** [`godtier-interface-upgrade-epic.md`](./godtier-interface-upgrade-epic.md) ·
  [`roadmap.md`](./roadmap.md) (Now/Next/Later cut line) · supersedes nothing; refines sequencing.

---

## How to add a decision

1. Append a new `PD-NN` section (never rewrite an accepted one in place).
2. To change a prior decision, add a new `PD-NN` and set the old one's status to
   `Superseded by PD-NN` (leave its content as history).
3. If the decision is *also* enforced in code, link the governing
   [`.claude/rules/`](../.claude/rules/README.md) file and the relevant
   [engineering ADR](../docs/adr/README.md).

---

## Related documents

- Engineering ADRs: [`../docs/adr/README.md`](../docs/adr/README.md)
- Master PRD: [`prd/aurox-intelligence.md`](./prd/aurox-intelligence.md)
- Autonomy control: [`prd/autonomy-mode-switch.md`](./prd/autonomy-mode-switch.md)
- Roadmap: [`roadmap.md`](./roadmap.md) · Personas: [`personas.md`](./personas.md) · Metrics: [`success-metrics.md`](./success-metrics.md)
- Live-microtrading blueprint (gated): [`../docs/live-microtrading/overview.md`](../docs/live-microtrading/overview.md)
