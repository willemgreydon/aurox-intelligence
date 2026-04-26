# /simulation-safety-audit

## Purpose
Audit the simulation engine for determinism, accounting integrity, and safe state management.

## When to Use
- After any change to simulation order processing or portfolio accounting
- Before enabling a new simulation feature
- When simulation balances look inconsistent

## Claude Code Prompt

```text
Audit the Aurox simulation engine for safety and integrity.

Check packages/db/src/ simulation tables:
- simulation_accounts
- simulation_portfolios
- simulation_positions
- simulation_orders
- simulation_transactions
- simulation_snapshots

Verify:
1. Are all balance mutations inside database transactions?
2. Is every order state transition logged?
3. Is every transaction logged with direction, amount, fee, and timestamp?
4. Are positions updated atomically with transactions?
5. Are there any direct UI mutations to portfolio state?
6. Is there any random() in order processing or accounting math?
7. Are fees calculated deterministically and not approximated?
8. Are portfolio snapshots taken at appropriate checkpoints?
9. Is PnL calculation (realized and unrealized) deterministic?
10. Is cash available checked before any buy order?
11. Is position available checked before any sell order?

Check packages/agents/src/workflows/:
12. Do simulation workflows fail closed on validation errors?
13. Is the simulation default enforced (not live)?

Report:

Simulation Safety Audit
========================
Critical issues (would cause incorrect accounting):
- ...

Warnings (could cause inconsistent state):
- ...

Non-determinism detected:
- ...

Missing transaction logging:
- ...

Direct UI state mutations:
- ...

Overall verdict: SAFE / UNSAFE

Required fixes before any production use:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/db typecheck
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/db test
```

## Expected Output
Detailed integrity report with specific file locations for any issues.

## Safety Notes
- Any accounting mutation outside a DB transaction is a critical defect.
- Simulation must behave like a real execution environment.
