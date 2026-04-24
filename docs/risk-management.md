# Risk Management

This document defines current and target risk controls for Aurox Intelligence simulation workflows.

## Scope

Current system risk management primarily governs simulation execution safety and account integrity.

## Risk Classes

1. Execution Risk
- invalid quantity or price
- insufficient cash/position
- lane/asset-scope violations

2. Market Risk
- adverse price movement after fill
- concentration in single symbols or asset classes

3. Model Risk
- stale or partial data inputs
- low-confidence recommendations

4. Operational Risk
- provider degradation
- stale caches
- incorrect environment configuration

## Current Enforced Controls

- deterministic pre-trade validation
- lane enforcement (`manual_stock_lane` vs multi-asset lanes)
- tradability checks via catalog metadata
- capital and held-quantity checks
- read-only mode behavior on degraded session state

## Simulation Accounting Controls

- transactional order + account updates
- realized/unrealized PnL recomputation
- snapshot capture for audit and equity curve
- execution metadata support for fee/slippage/latency hooks

## Risk Metrics to Surface

Portfolio-level:
- gross exposure
- asset class concentration
- realized/unrealized PnL split
- drawdown from starting equity

Trade-level:
- fee impact
- slippage impact
- effective cash effect
- validation hash / execution record

## Policy Integration

Risk controls should remain composable through:
- `packages/agents` policy engine
- broker mode config constraints
- live readiness checks

## Incident Response

If risk invariants break:
1. block further execution actions
2. preserve full audit trail
3. expose explicit status and reason
4. require manual operator review before re-enable

## Next Enhancements

- hard daily loss caps in simulation account layer
- portfolio-level concentration limits in execution validator
- deterministic scenario stress snapshots
