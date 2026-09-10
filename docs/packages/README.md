# Packages Reference

This directory is the authoritative per-package reference for the Aurox Intelligence
monorepo. Each row below links to a detailed doc (where one exists) and to the boundary
rule that governs the package. Boundaries are not suggestions — they are operating
constraints enforced for safety, determinism, and auditability.

For the system-level map, read [`docs/architecture/overview.md`](../architecture/overview.md).
For the canonical boundary rules, read the files in [`.claude/rules/`](../../.claude/rules/).

## Package Index

| Package | One-line responsibility | Detailed doc | Governing boundary rule |
|---|---|---|---|
| `packages/api-contracts` | Single source of truth for all shared Zod schemas and TypeScript contracts (signals, recommendations, ranking, macro, news, invest, execution). | [`api-contracts.md`](./api-contracts.md) | [`api-contracts-boundary.md`](../../.claude/rules/api-contracts-boundary.md) |
| `packages/db` | All persistence: raw Postgres repositories, migrations, transactions, and persisted read models (schema `app`). | [`db.md`](./db.md), [`docs/database/`](../database/), [`SIMULATION_ENGINE.md`](../SIMULATION_ENGINE.md) | [`db-boundary.md`](../../.claude/rules/db-boundary.md) |
| `packages/providers` | The only place for external market/macro/news API transport, symbol normalization, fallback routing, and provider health checks. | [`providers.md`](./providers.md), [`market-data-provider-architecture.md`](../market-data-provider-architecture.md) | [`provider-boundary.md`](../../.claude/rules/provider-boundary.md), [`market-provider-rules.md`](../../.claude/rules/market-provider-rules.md) |
| `packages/ingestion` | Canonical symbol mapping, raw observation processing, ingestion runs, and data-quality scoring (when present). | [`ingestion.md`](./ingestion.md), [`market-data-provider-architecture.md`](../market-data-provider-architecture.md) | [`market-symbol-universe-rule.md`](../../.claude/rules/market-symbol-universe-rule.md) |
| `packages/signals` | Pure, deterministic signal/indicator derivation. No I/O, no hidden state. | [`signal-framework.md`](../signal-framework.md) | [`pure-domain-packages.md`](../../.claude/rules/pure-domain-packages.md), [`signal-purity-rule.md`](../../.claude/rules/signal-purity-rule.md) |
| `packages/forecasting` | Pure, deterministic forecasting + explainability. No I/O. | [`signal-framework.md`](../signal-framework.md) | [`forecasting-purity-rule.md`](../../.claude/rules/forecasting-purity-rule.md) |
| `packages/agents` | Trade workflows, broker adapters, simulation/live routing, readiness gates, risk enforcement. | [`AGENTS.md`](../AGENTS.md), [`EXECUTION.md`](../EXECUTION.md) | [`risk-gates-required.md`](../../.claude/rules/risk-gates-required.md), [`live-trading-lock.md`](../../.claude/rules/live-trading-lock.md) |
| `packages/ai-market-intelligence` | Composition layer: turns signals + factors + news + macro + risk into explainable recommendations, rankings, orchestration, and portfolio intelligence. | [`ai-market-intelligence.md`](./ai-market-intelligence.md), [`factor-models.md`](../factor-models.md) | [`explainability-rule.md`](../../.claude/rules/explainability-rule.md), [`confidence-score-rule.md`](../../.claude/rules/confidence-score-rule.md) |
| `packages/observability` | Shared logging, metrics, tracing, and error-normalization helpers. | [`observability.md`](./observability.md) | [`architecture-boundaries.md`](../../.claude/rules/architecture-boundaries.md) |
| `packages/design-tokens` | The only source of UI color, spacing, typography, motion, and semantic theme tokens (light/dark). | [`design-tokens.md`](./design-tokens.md) | [`workstation-ui-rule.md`](../../.claude/rules/workstation-ui-rule.md) |

> `apps/web` and `apps/worker` are not packages — they are the orchestration/presentation
> and background-job apps. `apps/web` follows `Query → Mapper → Service → Route → UI`
> and owns no domain logic. See [`app-orchestration-boundary.md`](../../.claude/rules/app-orchestration-boundary.md).

## Dependency Direction

Imports flow **upward** only. `api-contracts` is the base; the pure domain packages
(`signals`, `forecasting`) sit above it with no other dependencies; composition and
execution packages depend on those; `apps/web` orchestrates everything but is depended
on by nothing.

```text
                         ┌──────────────────────────────┐
                         │           apps/web            │  orchestration + UI
                         │     apps/worker (jobs)        │  (depends down, depended-on by none)
                         └──────────────────────────────┘
                              │        │        │
              ┌───────────────┘        │        └───────────────┐
              ▼                        ▼                        ▼
     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
     │     agents      │     │ ai-market-       │     │   design-tokens  │
     │ (workflows,     │     │ intelligence     │     │  (CSS vars only; │
     │  risk, brokers) │     │ (recommendation, │     │   no TS deps)    │
     └─────────────────┘     │  ranking, macro, │     └──────────────────┘
              │              │  news, portfolio)│
              │              └──────────────────┘
              │                  │        │
              │     ┌────────────┘        │
              ▼     ▼                     ▼
     ┌─────────────────┐         ┌──────────────────┐     ┌──────────────────┐
     │   providers     │         │     signals      │     │   forecasting    │
     │  (transport,    │         │  (PURE: no I/O)  │     │   (PURE: no I/O) │
     │  fallback) ─────┼────┐    └──────────────────┘     └──────────────────┘
     └─────────────────┘    │             │                        │
              │             │             │                        │
              ▼             ▼             ▼                        ▼
     ┌─────────────────┐  ┌──────────────────────────────────────────────────┐
     │       db        │  │              api-contracts                        │
     │ (Postgres,      │─▶│  Zod schemas + inferred TS types (THE BASE)       │
     │  repositories)  │  │  no dependencies on any other package            │
     └─────────────────┘  └──────────────────────────────────────────────────┘

     observability ─ leaf utility (zero deps); imported by apps + packages as needed.
     ingestion ─ sits beside providers; depends on api-contracts (and providers when present).
```

### Allowed-import rules (current, enforced)

| From ↓ may import → | api-contracts | signals | forecasting | providers | db | observability | design-tokens |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `signals` | ✅ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| `forecasting` | ✅ | ❌ | — | ❌ | ❌ | ❌ | ❌ |
| `providers` | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ |
| `ingestion` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| `db` | ✅ | ❌ | ❌ | ❌ | — | ✅ | ❌ |
| `ai-market-intelligence` | ✅ | ✅ | ❌* | ❌ | ❌ | ❌ | ❌ |
| `agents` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `apps/web` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

`✅` = allowed, `❌` = forbidden, `—` = self.
`*` `ai-market-intelligence` does not currently import `forecasting`; forecast bias is
passed in as data through contract types, not by calling the forecasting package.

**Hard invariants:**

- `signals` and `forecasting` must remain pure: no `@repo/db`, no `@repo/providers`,
  no `fetch`, no `Date.now()`/`Math.random()` in scoring logic.
- Only `packages/db` imports the `postgres` driver and writes SQL.
- Only `packages/providers` calls external data APIs.
- All cross-package types originate in `packages/api-contracts`; no forked contracts.
- `design-tokens` has no runtime TypeScript dependency on any other package — it is
  consumed via CSS import and a tiny theme-key module.

## Current vs Future

| Area | Current | Future (gated) |
|---|---|---|
| Execution target | Simulation-first, persisted ledger | Live broker execution behind readiness gate |
| Recommendation `liveAllowed` | Always `false` | Unlocked only after live-readiness gate passes |
| `observability` backends | `console`-backed stubs (logger/metrics/tracing) | Real sink integration (OTel/metrics exporter) |
| `ingestion` | Present where canonicalization is needed | Full data-quality scoring pipeline |
