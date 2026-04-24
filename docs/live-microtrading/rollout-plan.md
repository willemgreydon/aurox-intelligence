# Rollout Plan for Live AI Microtrading

This is the staged rollout plan.

## Stage 0: Simulation Hardening (Current)

- deterministic execution accounting
- audit metadata for fills
- lane and policy controls
- portfolio/order observability

## Stage 1: Shadow Live Mode

- connect to broker APIs in read-only or paper account mode
- run strategy decisions without order submission
- compare expected vs executable constraints

Exit criteria:
- stable data and mapping quality
- no major reconciliation drift in shadow analysis

## Stage 2: Manual Guarded Live

- human submits every live order
- strict lane caps
- kill-switch tested

Exit criteria:
- operational stability and low rejection/slippage anomalies

## Stage 3: AI-Suggested Live

- AI generates ranked trade candidates
- human approval required
- stronger policy logging

Exit criteria:
- approval workflows and risk policy audit complete

## Stage 4: AI Autonomous Limited Lanes

- limited number of lanes enabled
- very small capital caps
- strict cadence and drawdown thresholds
- continuous operator oversight

Exit criteria:
- sustained stability over defined runtime windows

## Stage 5: Controlled Expansion

- gradual lane/capital expansion
- policy tuning based on observed behavior
- compliance and incident learnings integrated

## Rollback Strategy

At any stage, rollback is immediate by:
- global live disable
- lane-level live disable
- autonomous level downgrade

No partial ambiguous state should remain after rollback.
