# Broker and Market Infrastructure

This document explains how Aurox models broker and exchange infrastructure today and for future live migration.

## Current Operating Mode

Aurox is simulation-first.

- No real-money execution is enabled by default.
- Live adapter seams exist but are readiness-gated.
- Simulation remains authoritative for execution semantics.

## Infrastructure Components

1. Market Data Providers
- quote/history sources
- symbol normalization and routing

2. Execution Adapters
- simulation adapter (active)
- live adapters (guarded paths)

3. Readiness and Policy Layer
- mode registry
- readiness checks
- risk/policy gating

4. Persistence Layer
- order and transaction journals
- account and portfolio state
- snapshots for audit and analytics

## Broker Capability Model

A broker capability shape should include:
- supported asset classes
- supported order types
- symbol/product allowlist requirements
- fee model characteristics
- rate limit and timeout constraints
- sandbox availability

## Current Live-Seam Guardrails

- broker credentials must be present
- readiness checks must pass
- autonomous live execution is blocked
- non-crypto live paths remain unsupported

## Execution Environments

- `simulation`: default, deterministic paper execution
- `live`: explicit and gated, currently restricted

## Operational Recommendations

- keep `BROKER_DRY_RUN=true` during integration verification
- enable mode IDs incrementally, never globally all at once
- monitor connectivity and permission checks continuously

## Future Work

1. broker reconciliation workflow
2. live order lifecycle and partial-fill handling
3. operational kill-switch controls
4. broker capability registry synced with product surfaces
