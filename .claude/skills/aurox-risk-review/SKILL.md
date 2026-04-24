---
name: aurox-risk-review
description: Review Aurox changes for risk, simulation integrity, execution safety, and live-trading readiness.
allowed-tools: Read, Grep, Glob, LS, Bash
---

# Aurox Risk Review Skill

Use when reviewing code that touches:

- simulation
- execution
- agents
- broker adapters
- portfolio state
- risk
- account balances
- DB transactions
- live readiness

## Review Checklist

### Simulation

Check:

- deterministic accounting
- no random math
- atomic transaction
- order history exists
- transaction history exists
- snapshots updated
- fees handled explicitly
- realized PnL correct
- unrealized PnL correct

### Execution

Check:

- risk validation before execution
- instrument constraints
- idempotency
- no duplicate orders
- failure states explicit
- no silent partial fills
- no UI broker calls

### Live Trading

Check:

- live disabled by default
- readiness gate exists
- kill switch preserved
- broker state reconciled
- API secrets not exposed

### Risk

Check:

- exposure limits
- liquidity checks
- slippage checks
- max drawdown handling
- anomaly protection
- safe fallback to HOLD / no execution

## Output

```text
Risk review result:
PASS / BLOCKED / NEEDS CHANGES

Critical findings:
- ...

Warnings:
- ...

Required fixes:
- ...

Recommended improvements:
- ...
```
