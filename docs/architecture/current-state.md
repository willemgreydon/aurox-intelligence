# Current State

This document describes the current implementation state of Aurox Intelligence as of the latest production-oriented simulation upgrade.

## System Identity

Aurox Intelligence is a monorepo platform for:
- market intelligence
- explainable signal and forecast outputs
- simulation investing across stocks, ETFs, and crypto

The stack is TypeScript-first and server-driven.

## Monorepo Status

Implemented workspaces:
- `apps/web`
- `packages/api-contracts`
- `packages/providers`
- `packages/db`
- `packages/signals`
- `packages/forecasting`
- `packages/agents`
- `packages/ai-market-intelligence`
- `packages/observability`

## Working Product Capabilities

- provider-backed market quote/history retrieval
- dashboard and market surfaces
- stock and FX route families
- simulation session lifecycle
- multi-asset simulation tradability model
- persisted order/transaction/snapshot history
- portfolio and orders read models
- lane-aware simulation routing
- live-readiness diagnostics surface

## Market Workspace State

Current market UX includes:
- compact asset cards and list rows
- mini sparklines
- grid/list toggles
- quick actions (buy, sell, watchlist, details)
- responsive desktop/mobile behavior

## Portfolio State

`/invest/portfolio` now uses explicit read architecture:
- query: workstation + asset context + sparkline context
- mapper: portfolio view model with allocations and filters
- service: route-facing orchestration
- route: presentation and filter links only

Portfolio now includes:
- open and closed position views
- per-position quick actions
- allocation by asset and asset class
- recent trades with source attribution
- loading and error route states

## Simulation Engine State

Current simulation engine supports:
- deterministic order validation
- lane and asset-scope enforcement
- tradability checks and capital checks
- fee/slippage/latency hooks in execution model
- execution record metadata with validation hash
- stable position/account recomputation

Execution records are currently serialized into order notes for additive compatibility.

## Symbol Universe State

The universe layer now includes:
- canonical metadata tags
- search aliases
- provider symbol mapping hooks
- broker identifier mapping hooks
- planned-live tradability flags

Metadata is centralized in `packages/db` universe repository and consumed through existing catalog APIs.

## Live Migration State

Live execution remains controlled and not enabled by default.

What exists now:
- execution adapters for simulation and live targets
- readiness check structures
- readiness gate seam in trade execution service
- broker mode registry and environment summaries

What does not exist yet:
- full broker reconciliation loop
- full regulatory-grade live execution controls
- dedicated execution records table

## Operational Integrity

Typecheck status for modified core packages:
- `@repo/api-contracts`: passing
- `@repo/db`: passing

Known unrelated baseline issue remains in `apps/web` auth test typing.

## Risks to Watch

- execution metadata currently embedded in notes, not normalized SQL table
- lane-level historical partitioning is still session-driven, not position-native
- live-readiness defaults still conservative and intentionally restrictive

## Short-Term Priorities

1. Normalize execution records into first-class DB schema.
2. Add explicit lane attribution fields for historical analytics.
3. Expand provider-specific symbol reconciliation and broker product mapping.
4. Add targeted simulation correctness tests for fee/slippage edge cases.
