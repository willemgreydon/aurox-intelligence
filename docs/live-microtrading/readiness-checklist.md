# Live Trading Readiness Checklist

Use this checklist before enabling any real-money lane.

## A. Platform Readiness

- [ ] Full contract coverage for live execution requests and responses.
- [ ] Deterministic accounting path validated for fees/slippage/partial fills.
- [ ] Dedicated execution/audit records persisted in first-class tables.
- [ ] Idempotency handling proven in live adapter pathways.
- [ ] Replay-safe reconciliation worker implemented.

## B. Broker Connectivity Readiness

- [ ] Broker credentials configured and rotated via secure secret management.
- [ ] Broker permissions validated (trade/read scopes).
- [ ] Product allowlist and symbol mapping validated.
- [ ] Rate limits and timeout thresholds documented.
- [ ] Sandbox and production endpoints separated by environment.

## C. Risk Readiness

- [ ] Per-lane max capital and max daily loss limits active.
- [ ] Position limits and concentration caps active.
- [ ] Drawdown breaker and cooldown rules active.
- [ ] Order frequency caps active.
- [ ] Global and lane kill-switch controls active.

## D. Autonomy Readiness

- [ ] Lane autonomy levels implemented and tested.
- [ ] Human-approval workflow active for non-autonomous lanes.
- [ ] Autonomous lanes require explicit opt-in and policy acceptance.
- [ ] Policy engine denies orders outside lane boundaries.
- [ ] Autonomous behavior can be paused instantly.

## E. Observability Readiness

- [ ] Structured logs include trace ID, lane, account, symbol, policy result.
- [ ] Execution dashboards show fill latency, slippage, rejection rates.
- [ ] Alerting configured for risk triggers and connectivity failures.
- [ ] Daily summary reports generated for operator review.

## F. Operational Readiness

- [ ] On-call runbook documented.
- [ ] Incident response and escalation path documented.
- [ ] Rollback plan tested.
- [ ] Emergency trading halt tested in staging.

## G. Legal/Compliance Readiness

- [ ] Jurisdiction and product eligibility reviewed.
- [ ] User disclosures and terms updated.
- [ ] Audit retention policy defined.
- [ ] Required licensing obligations reviewed with counsel.

## Exit Criteria

A lane is not eligible for live activation until every checklist item for that lane is complete.
