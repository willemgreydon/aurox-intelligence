# Current State Summary

This summary captures the latest integrated state of Aurox Intelligence.

## Repository Status

- monorepo structure is intact (`apps/*`, `packages/*`)
- shared TypeScript contract boundaries are active
- route-level server orchestration follows query/mapper/service pattern on key invest surfaces

## Product State

Implemented and active:
- dashboard and market overview surfaces
- stocks and FX route families
- simulation invest workflows (stocks, ETFs, crypto)
- portfolio and orders read models
- live-readiness diagnostic route

## Simulation State

Simulation system characteristics:
- persisted execution flow
- deterministic accounting updates
- lane and asset-scope enforcement
- tradability and capital validation
- order/transaction/snapshot journaling

Recent improvements include:
- portfolio route upgraded with explicit read model service and filterable workstation UI
- execution model hooks for fee/slippage/latency metadata
- execution record audit payload support
- symbol universe metadata expanded with alias and mapping hooks
- readiness gate seam added in trade execution service for live-target modes

## Data and Reliability State

- provider-backed quote/history with cache fallback behavior
- server-side read models for market and simulation surfaces
- explicit route statuses preferred over silent failures

## Verification Snapshot

Validated during latest pass:
- `@repo/api-contracts` typecheck passes
- `@repo/db` typecheck passes

Known unrelated baseline issue:
- `apps/web/server/auth/service.test.ts` has existing auth test typing errors that may fail full web typecheck.

## Operational Guidance

- keep simulation as default execution environment
- treat live execution paths as gated and incremental
- run simulation test plan before shipping execution/accounting changes
- preserve architecture boundaries during all feature work
