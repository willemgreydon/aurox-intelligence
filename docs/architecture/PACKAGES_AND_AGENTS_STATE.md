# Packages And Agents State

## Current Package Inventory

Present in `packages/`:

- `api-contracts`
- `db`
- `providers`
- `signals`
- `forecasting`
- `agents`
- `ai-market-intelligence`
- `observability`
- `design-tokens`
- `ingestion` (added in this slice)

## Why `ingestion` Was Added

Architecture references and dashboard language already model an explicit
`providers -> ingestion -> signals` chain. The repository had ingestion schemas
and ingestion-run records, but no dedicated ingestion package seam.

This slice adds `@repo/ingestion` with:

- canonical symbol and asset-kind normalization
- ingestion record canonicalization helpers
- ingestion run lifecycle helpers
- ingestion batch summary utilities
- focused tests

## Agent Surface In `packages/agents`

Already present:

- policy engine
- orchestrator
- broker supervisor
- simulation workflow
- unified workflow
- capital and position risk guards
- readiness gating
- broker adapters

Added in this slice:

- `risk/drawdown-guard-agent.ts`
- `execution/reconciliation-agent.ts`

These close two explicit safety concerns:

- max drawdown enforcement as a standalone guard
- post-submit execution/request reconciliation checks

## Notes

- No provider calls were moved into UI.
- No DB access moved outside `@repo/db`.
- Additive only: existing workflows remain intact.

