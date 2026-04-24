# Finance Intelligence System Overview

This is the platform-level systems reference for Aurox Intelligence.

## Objective

Deliver a trustworthy intelligence and simulation environment for multi-asset decision support.

## Capability Pillars

1. Market Data
- real quote/history retrieval via provider adapters
- fallback and cache resilience
- canonical symbol handling

2. Analytics
- deterministic signal derivation
- forecast scenario generation
- explainability summaries

3. Simulation Execution
- lane-aware order placement
- persisted account and position state
- auditable order/transaction journals

4. Workstation UX
- dense market scanning surfaces
- quick action pathways
- portfolio and order oversight

## Layered Model

### Data Ingestion Layer
- provider clients, retries, routing, normalization
- quote/history persistence

### Contract Layer
- shared Zod schemas
- strongly typed read/write boundaries

### Domain Logic Layer
- signal and forecasting packages
- trading policies and readiness logic

### Persistence Layer
- DB repositories and read model queries
- simulation accounting and journaling

### Presentation Layer
- Next.js App Router pages
- server-side query/mapper/service orchestration
- reusable workstation components

## Core Invariants

- No provider logic in UI.
- No DB logic in UI.
- Simulation updates are transactional and deterministic.
- Route view models are explicit and reusable.
- Live execution remains gated until readiness conditions pass.

## Primary Read Models

- invest overview read model
- simulation workstation state
- portfolio read model
- market graph read model
- stock catalog/detail read models

## Primary Write Models

- watchlist toggles
- simulation session start/resume
- simulated order execution
- simulation account reset

## Risk Controls (Current)

- lane restrictions (`manual_stock_lane` vs multi-asset lanes)
- asset class and session scope checks
- tradability checks
- cash/quantity validation
- live-readiness gate seam for live execution targets

## Extensibility Direction

Planned evolutionary direction:
- first-class execution record table
- richer broker capability matrix and product mapping
- deeper simulation realism controls
- enhanced portfolio analytics and attribution

## Performance and Reliability Principles

- cache-aware quote/history loads
- avoid redundant provider calls
- use server-side orchestration for expensive joins
- maintain graceful degradation when providers fail

## Governance

Changes are accepted when they:
- preserve boundary discipline
- keep contract compatibility
- improve deterministic behavior
- maintain user trust in data semantics
