# ADR 0002: Simulation-first execution

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

An accidental live order at market price is irreversible and can lose real capital. The cost of a
simulation-first default is near zero; the cost of an unintended live order is real loss. The
system must be able to evolve toward live trading without ever making live execution the easy or
default path.

The execution model is staged (see `docs/EXECUTION.md`): Stage 1 fictive-cash simulation is active
today; human-confirmed paper, broker sandbox, and gated real micro-trading are planned future
stages that must be reached in order, with no stage skipped. Autonomous live execution is
explicitly blocked at the code level.

## Decision

Simulation is the default and mandatory execution target. Live execution is gated.

- The execution-mode hierarchy is `SIMULATION (default) → PAPER → LIVE (gated)`.
- Execution mode is resolved from server-side account state in the DB, never from user-submitted
  input. If mode is ambiguous or unreadable, the system resolves to `simulation`.
- All non-live executions flow through the simulation engine, which is treated as a serious
  persisted financial ledger — full accounting of positions, cash, fees, slippage, and PnL — not a
  test scaffold or display mock.
- Live execution requires passing an explicit, throwing readiness gate
  (`assertLiveReadinessGate`) covering broker validation, active risk gates, DB-set live mode,
  verified real capital, an armed kill switch, fresh market data, and active observability. Until
  **all** checks pass, the system routes to simulation regardless of configuration.
- Broker adapters default to sandbox endpoints; live endpoints require explicitly separate,
  confirmed credentials and the readiness gate.

## Consequences

**Positive**

- The default failure mode is "trade in simulation", never "trade real money by accident".
- Simulation, sharing the same deterministic logic and risk gates as live, is predictive of live
  behavior rather than a toy.
- The staged progression gives an auditable, reversible path toward live trading.

**Negative**

- Extra ceremony: enabling any live path requires building and passing the full readiness gate, not
  flipping a flag.
- Two endpoint/credential sets (sandbox vs live) per broker increase configuration surface and the
  chance of misconfiguration — partially mitigated by forcing distinct credential variables.
- Simulation fidelity work (fees, slippage, fill modeling) is ongoing cost that a pure mock would
  have avoided.

**Risks**

- A seed, migration, or test helper that sets `executionMode = "live"` or bypasses the readiness
  gate would defeat the lock. Forbidden by the live-trading-lock rule and validated by grep checks.
- A broker adapter that falls through to live when a sandbox key is missing would be a critical
  defect; the broker-sandbox rule forbids this.

## Alternatives considered

- **Live-capable by default with a "safe mode" toggle.** Rejected: makes the dangerous path the
  default and relies on a toggle being correct.
- **Mode from request parameters.** Rejected: lets the client choose to trade real money; mode must
  be a server-side, DB-backed determination.
- **In-memory simulation state.** Rejected: simulation must be a durable, auditable ledger; see the
  simulation-auditability and snapshot-consistency rules and ADR 0003.

## References

- [`../../.claude/rules/simulation-first-rule.md`](../../.claude/rules/simulation-first-rule.md)
- [`../../.claude/rules/live-trading-lock.md`](../../.claude/rules/live-trading-lock.md)
- [`../../.claude/rules/broker-sandbox-rule.md`](../../.claude/rules/broker-sandbox-rule.md)
- [`../../.claude/rules/simulation-auditability-rule.md`](../../.claude/rules/simulation-auditability-rule.md)
- [`../EXECUTION.md`](../EXECUTION.md), [`../SIMULATION_ENGINE.md`](../SIMULATION_ENGINE.md)
- Packages: [`packages/agents`](../../packages/agents), [`packages/db`](../../packages/db)
- See also: ADR 0008 (risk gates and kill switch)
