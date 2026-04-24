# Documentation Master

This file is the central documentation index for Aurox Intelligence.

## Architecture Docs

- [Architecture Overview](./docs/architecture/overview.md)
- [Current State](./docs/architecture/current-state.md)
- [Best Practices](./docs/architecture/best-practices.md)

## Platform and Domain Docs

- [Finance System Overview](./docs/finance-system-overview.md)
- [Asset Taxonomy](./docs/asset-taxonomy.md)
- [Broker and Market Infrastructure](./docs/broker-infrastructure.md)
- [Execution Layer](./docs/execution-layer.md)
- [Risk Management](./docs/risk-management.md)
- [Portfolio Construction](./docs/portfolio-construction.md)
- [Reporting Framework](./docs/reporting-framework.md)

## Quant and Intelligence Docs

- [Signal Framework](./docs/signal-framework.md)
- [Factor Models](./docs/factor-models.md)
- [Anomaly Detection](./docs/anomaly-detection.md)
- [AI in Finance](./docs/ai-in-finance.md)

## Market Structure Docs

- [ETF Mechanics](./docs/etf-mechanics.md)
- [Crypto Market Structure](./docs/crypto-market-structure.md)

## Live Microtrading Transition Docs

- [Transition Overview](./docs/live-microtrading/overview.md)
- [Readiness Checklist](./docs/live-microtrading/readiness-checklist.md)
- [Architecture Delta](./docs/live-microtrading/architecture-delta.md)
- [Lane Autonomy Model](./docs/live-microtrading/lane-autonomy-model.md)
- [Risk Policy and Guards](./docs/live-microtrading/risk-policy-and-guards.md)
- [Broker Constraints and Order Sizing](./docs/live-microtrading/broker-constraints-and-order-sizing.md)
- [Rollout Plan](./docs/live-microtrading/rollout-plan.md)
- [Incident Response and Kill Switch](./docs/live-microtrading/incident-response-and-kill-switch.md)

## Validation and Operations Docs

- [Simulation Test Plan](./docs/simulation-test-plan.md)
- [Current State Summary](./CURRENT_STATE_SUMMARY.md)

## How to Use This Documentation

1. Start with architecture docs to understand boundaries.
2. Read finance/execution/risk docs before changing domain logic.
3. Use simulation test plan before shipping execution changes.
4. Use live microtrading docs when planning migration beyond simulation.
5. Keep docs and contracts synchronized for every major vertical slice.

## Maintenance Rules

- Do not leave docs as placeholders.
- Distinguish current implementation vs future target.
- Keep formulas, invariants, and failure modes explicit.
- Update this index when adding new docs.
