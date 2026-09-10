# ADR 0008: Risk gates and kill switch on every execution path

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

Execution is the highest-risk domain in the system. An order that submits before validation, or
that proceeds under uncertainty, can produce phantom positions in simulation and real capital loss
in live trading. The project's doctrine is explicit: *if risk, accounting, or execution state is
uncertain, do not execute.* Risk checks that only run in live mode give false confidence during
simulation, because the simulation no longer tests what live trading will actually do. The system
also needs a reliable way to stop everything in an emergency — a rogue signal, data corruption, or
a provider outage.

## Decision

Every execution path, simulation and live, is risk-gated, fail-closed, and kill-switchable.

- Risk priority is `Risk > Policy > Agent > User Request > UI Convenience`. If risk validation
  fails, the order is rejected — no bypass, no dev/simulation skip, no feature flag that disables
  risk in any environment.
- Pre-trade checks run before any state mutation: cash availability (read from DB, not cached),
  max position size, drawdown limit, liquidity and slippage thresholds, instrument constraints
  (min_qty, min_notional, tick_size, step_size), stop-loss/exit policy, signal-confidence minimum,
  lane permissions, and data freshness. Implemented in `packages/agents` (e.g. the capital-guard
  and position-limit agents invoked by the broker supervisor).
- Execution is fail-closed and atomic. On any failed check the order is rejected, all state is
  preserved, the failure reason is logged with order context, and a typed error is returned. The
  order + transaction + position + balance write is a single DB transaction.
- A kill switch (`isHalted` halt state) is stored in the DB (surviving restarts), checked at the
  entry of every execution workflow including simulation, settable via a privileged server action,
  and logged as a system event when activated. Re-enabling after a halt requires explicit
  confirmation.
- Autonomous live execution is explicitly blocked at the code level; live paths additionally
  require the readiness gate from ADR 0002.

## Consequences

**Positive**

- Simulation and live are validated by the same risk logic, so simulation is predictive of live
  outcomes.
- No partial writes: a failed order leaves the ledger exactly as it was.
- An operator can halt all execution immediately and durably in an emergency.
- Every rejection and halt is auditable from logs and order context.

**Negative**

- Every order pays the cost of the full check suite and a transaction, even in simulation.
- Risk checks need fresh inputs (uncached cash, fresh quotes), which constrains caching and can add
  latency to execution-adjacent flows.
- Maintaining the kill-switch check at the entry of every workflow is recurring discipline that a
  leaner design would skip.

**Risks**

- A check that only runs in live mode, a `skipRisk`/`bypassRisk` flag, or a swallowed risk error
  that proceeds anyway silently removes protection; all forbidden and grep-validated by the
  risk-gates and execution-safety rules.
- A kill switch stored only in memory resets on restart and gives false assurance; forbidden by the
  kill-switch rule (must be DB-backed).
- Trusting user-submitted position sizes without server-side validation bypasses sizing limits;
  forbidden by the position-sizing rule.

## Alternatives considered

- **Risk checks in live mode only** ("it's fake money in simulation"). Rejected: simulation would
  no longer test the live risk path, breaking its predictive value.
- **Optimistic submission, validate-after.** Rejected: a mid-flight failure leaves portfolio state
  inconsistent (phantom positions / committed-but-unrecorded capital).
- **In-process / config-flag kill switch.** Rejected: must survive restarts and be activatable
  without a deploy; therefore DB-backed and server-action-driven.

## References

- [`../../.claude/rules/risk-gates-required.md`](../../.claude/rules/risk-gates-required.md)
- [`../../.claude/rules/kill-switch-rule.md`](../../.claude/rules/kill-switch-rule.md)
- [`../../.claude/rules/execution-safety.md`](../../.claude/rules/execution-safety.md)
- [`../../.claude/rules/aurox-execution-risk.md`](../../.claude/rules/aurox-execution-risk.md)
- [`../../.claude/rules/position-sizing-rule.md`](../../.claude/rules/position-sizing-rule.md)
- [`../../.claude/rules/order-lifecycle-rule.md`](../../.claude/rules/order-lifecycle-rule.md)
- [`../../.claude/rules/repository-transaction-rule.md`](../../.claude/rules/repository-transaction-rule.md)
- [`../RISK.md`](../RISK.md), [`../EXECUTION.md`](../EXECUTION.md), [`../AGENTS.md`](../AGENTS.md)
- Packages: [`packages/agents`](../../packages/agents) (`src/risk`, `src/workflows`, `src/readiness`)
- See also: ADR 0002 (simulation-first / live readiness gate)
