# Execution Layer

This document describes execution architecture across simulation and future live paths.

## Current State

Execution currently routes to:
- simulation adapter (active)
- live adapter seams (guarded, readiness-gated)

## Execution Pipeline

1. intent is validated (`apps/web` action + Zod)
2. lane/scope checks are enforced
3. simulation service resolves tradability and market price
4. repository transaction applies fill/accounting
5. order/transaction/snapshot records are persisted

## Simulation Fill Model

Current additive hooks:
- slippage basis points
- fee basis points
- optional latency metadata
- deterministic validation hash

These hooks adjust:
- executed price
- cash effect
- average cost
- realized PnL

## Audit Model

Execution metadata contains:
- execution id
- requested vs executed price
- slippage amount and bps
- fee amount
- venue
- validation hash
- recorded timestamp

## Adapter Boundaries

- simulation execution adapter: `packages/agents`
- live execution adapter: `apps/web/server/lib/brokers`
- trade orchestration service: `apps/web/server/services/trade-execution-service.ts`

## Readiness Gates

Live execution target is blocked unless readiness checks pass. Current readiness checks cover:
- mode enabled
- user verification requirements
- broker connection requirements
- market data health requirements
- simulation history requirements

## Determinism Requirements

- fixed rounding strategy
- no randomization in accounting
- idempotency-key support for duplicate submit protection

## Future Work

1. promote execution records to dedicated SQL table
2. add explicit reconciliation status fields
3. add partial-fill and cancel workflows
4. add structured failure taxonomies for broker responses
