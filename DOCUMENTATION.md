# Documentation Master

This file is the central documentation index for Aurox Intelligence — a deterministic-first
financial intelligence and simulation-trading platform. It links every authoritative doc in
the repository. Start here.

> Conventions: docs distinguish **CURRENT** implementation from **FUTURE** target. Boundaries
> in [`.claude/rules/`](./.claude/rules/) are operating constraints, not suggestions. Keep docs
> and contracts synchronized for every vertical slice (see [readme-update rule](./.claude/rules/readme-update-rule.md)).

## Start Here

- [README](./README.md) — project overview and quick start
- [CONTRIBUTING](./CONTRIBUTING.md) — engineering onboarding, setup, commands, boundaries, pre-push checklist
- [CONFIGURATION](./CONFIGURATION.md) — complete environment-variable reference (grouped by domain)
- [GLOSSARY](./GLOSSARY.md) — domain glossary (OHLCV, SignalOutput, lane, kill switch, PnL, …)
- [Current State Summary](./CURRENT_STATE_SUMMARY.md)

## Architecture & Decisions

- [Architecture (root)](./ARCHITECTURE.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Current State](./docs/architecture/current-state.md)
- [Best Practices](./docs/architecture/best-practices.md)
- [Packages & Agents State](./docs/architecture/PACKAGES_AND_AGENTS_STATE.md)
- [Institutional Blueprint](./docs/architecture/aurox-institutional-blueprint.md)
- **Architecture Decision Records (ADRs)** — [`docs/adr/`](./docs/adr/README.md)
  - [0001 Deterministic-first philosophy](./docs/adr/0001-deterministic-first-philosophy.md)
  - [0002 Simulation-first execution](./docs/adr/0002-simulation-first-execution.md)
  - [0003 Raw Postgres, no ORM](./docs/adr/0003-raw-postgres-no-orm.md)
  - [0004 Monorepo package boundaries](./docs/adr/0004-monorepo-package-boundaries.md)
  - [0005 Contract-first Zod (api-contracts)](./docs/adr/0005-contract-first-zod-api-contracts.md)
  - [0006 Pure signals/forecasting packages](./docs/adr/0006-pure-signals-forecasting-packages.md)
  - [0007 Provider fallback & no fake data](./docs/adr/0007-provider-fallback-and-no-fake-data.md)
  - [0008 Risk gates & kill switch](./docs/adr/0008-risk-gates-and-kill-switch.md)

## Package Reference

Authoritative per-package reference. Index: [`docs/packages/README.md`](./docs/packages/README.md).

- [Packages Index & dependency map](./docs/packages/README.md)
- [api-contracts](./docs/packages/api-contracts.md)
- [db](./docs/packages/db.md)
- [providers](./docs/packages/providers.md)
- [ingestion](./docs/packages/ingestion.md)
- [signals](./docs/packages/signals.md)
- [forecasting](./docs/packages/forecasting.md)
- [agents](./docs/packages/agents.md)
- [ai-market-intelligence](./docs/packages/ai-market-intelligence.md)
- [observability](./docs/packages/observability.md)
- [design-tokens](./docs/packages/design-tokens.md)

## Web App (apps/web)

- [Web Overview](./docs/web/README.md) — tech stack, canonical read/write paths
- [Route Catalogue](./docs/web/routes.md) — every page + API route, rendering & cache posture
- [Server Layer](./docs/web/server-layer.md) — queries / mappers / services / actions
- [Data Flow](./docs/web/data-flow.md) — read/write diagrams, caching strategy

## Database

- [Schema Reference](./docs/database/schema.md) — all `app.*` tables grouped by domain
- [Migrations Catalogue](./docs/database/migrations.md) — every migration + apply/rollback policy
- [Intelligence Memory](./docs/database/intelligence-memory.md)
- [Simulation Engine (root)](./SIMULATION_ENGINE.md)

## Execution, Risk & Agents

- [Execution (root)](./EXECUTION.md) · [docs/EXECUTION.md](./docs/EXECUTION.md)
- [Risk (root)](./RISK.md) · [docs/RISK.md](./docs/RISK.md)
- [Agents (root)](./AGENTS.md) · [docs/AGENTS.md](./docs/AGENTS.md)
- [Broker Adapters](./BROKER_ADAPTERS.md)
- [Execution Layer primer](./docs/execution-layer.md)
- [Risk Management primer](./docs/risk-management.md)

## Market Data & Intelligence

- [Data Pipeline (root)](./DATA_PIPELINE.md)
- [Market Intelligence (root)](./MARKET_INTELLIGENCE.md)
- [Market Data Provider Architecture](./docs/market-data-provider-architecture.md)
- [Provider Secret Safety](./docs/provider-secret-safety.md)
- [Macro Data Integration](./docs/macro-data-integration.md)
- [Signal Framework](./docs/signal-framework.md)
- [Factor Models](./docs/factor-models.md)
- [Anomaly Detection](./docs/anomaly-detection.md)
- [AI in Finance](./docs/ai-in-finance.md)

## Platform & Domain Primers

- [Finance System Overview](./docs/finance-system-overview.md)
- [Asset Taxonomy](./docs/asset-taxonomy.md)
- [Broker and Market Infrastructure](./docs/broker-infrastructure.md)
- [Portfolio Construction](./docs/portfolio-construction.md)
- [Reporting Framework](./docs/reporting-framework.md)
- [ETF Mechanics](./docs/etf-mechanics.md)
- [Crypto Market Structure](./docs/crypto-market-structure.md)

## Testing & Observability

- [Testing Strategy](./docs/testing/README.md)
- [Observability](./docs/observability/README.md)
- [Simulation Test Plan](./docs/simulation-test-plan.md)

## Operations & Runbooks

- [Runbooks Index](./docs/runbooks/README.md)
  - [Provider Outage](./docs/runbooks/provider-outage.md)
  - [Kill-Switch Activation](./docs/runbooks/kill-switch-activation.md)
  - [Simulation Account Reset](./docs/runbooks/simulation-account-reset.md)
  - [DB Migration](./docs/runbooks/db-migration.md)
  - [Incident Response](./docs/runbooks/incident-response.md)
  - [Deploy & Rollback](./docs/runbooks/deploy-and-rollback.md)
- [Production Deployment Checklist](./docs/production-deployment-checklist.md)
- [Cache & Retention](./docs/operations/cache-and-retention.md)
- [Market Data Cache Retention](./docs/operations/market-data-cache-retention.md)
- [News Intelligence Retention](./docs/operations/news-intelligence-retention.md)

## Security

- [Security CSP Audit](./docs/security-csp-audit.md)
- [Security Route Protection Matrix](./docs/security-route-protection-matrix.md)
- [Provider Secret Safety](./docs/provider-secret-safety.md)

## Live Microtrading Transition (FUTURE — gated)

- [Transition Overview](./docs/live-microtrading/overview.md)
- [Readiness Checklist](./docs/live-microtrading/readiness-checklist.md)
- [Architecture Delta](./docs/live-microtrading/architecture-delta.md)
- [Lane Autonomy Model](./docs/live-microtrading/lane-autonomy-model.md)
- [Risk Policy and Guards](./docs/live-microtrading/risk-policy-and-guards.md)
- [Broker Constraints and Order Sizing](./docs/live-microtrading/broker-constraints-and-order-sizing.md)
- [Rollout Plan](./docs/live-microtrading/rollout-plan.md)
- [Incident Response and Kill Switch](./docs/live-microtrading/incident-response-and-kill-switch.md)

## Product (.docs)

- [PRD — Aurox Intelligence](./.docs/prd/aurox-intelligence.md)
- [PRD — Autonomy Mode Switch](./.docs/prd/autonomy-mode-switch.md)
- [Personas](./.docs/personas.md)
- [Roadmap (Now / Next / Later)](./.docs/roadmap.md)
- [Success Metrics](./.docs/success-metrics.md)
- [Product Decision Log](./.docs/decisions.md)
- [Backlog Stories](./.docs/stories/aurox-backlog-stories.md)
- [UX Research & Heuristic Evaluation](./.docs/ux/ux-research-and-heuristic-evaluation.md)
- [Competitive Scan — AI Fintech](./.docs/competitive-scan-ai-fintech.md)
- [GODTIER Interface Upgrade Epic](./.docs/godtier-interface-upgrade-epic.md)
- [i18n Translation Quality Report](./docs/i18n-translation-quality-report.md)

## Audits

A running record of UX/performance/architecture audits lives in [`docs/audits/`](./docs/audits/).

## How to Use This Documentation

1. New to the repo? Read [CONTRIBUTING](./CONTRIBUTING.md), then the [Architecture Overview](./docs/architecture/overview.md) and [Packages Index](./docs/packages/README.md).
2. Read finance/execution/risk docs and the relevant [ADRs](./docs/adr/README.md) before changing domain logic.
3. Use the [Simulation Test Plan](./docs/simulation-test-plan.md) and [Testing Strategy](./docs/testing/README.md) before shipping execution changes.
4. Use the [Runbooks](./docs/runbooks/README.md) during incidents and operational tasks.
5. Use the [Live Microtrading](./docs/live-microtrading/overview.md) docs when planning migration beyond simulation.

## Maintenance Rules

- Do not leave docs as placeholders.
- Distinguish current implementation vs future target.
- Keep formulas, invariants, and failure modes explicit.
- Update this index when adding new docs.
