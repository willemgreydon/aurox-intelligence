---
name: aurox-execution-review
description: Review order lifecycle, broker adapter, simulation execution, and portfolio mutation correctness.
allowed-tools: Read, Grep, Glob, LS, Bash
---

# Aurox Execution Review Skill

Use this skill when working on execution-related code.

## Required Review Areas

### Order Lifecycle

Confirm explicit transitions:

```text
created → validated → submitted → filled/rejected/cancelled
```

No status may be implicit.

### Idempotency

Confirm:

- idempotency key exists
- duplicate requests do not double execute
- retries are safe

### Accounting

For buys:

```text
cash decreases
position increases
fee applied
cost basis updated
```

For sells:

```text
cash increases
position decreases
fee applied
realized PnL calculated
```

### Broker Adapter

Confirm:

- internal order translated safely
- broker response normalized
- partial fills represented
- unknown broker status does not become success
- no direct UI access

### Failure

Confirm:

- validation failure preserves state
- broker failure fails closed
- reconciliation mismatch blocks new live orders

## Output

```text
Execution review:
PASS / BLOCKED / NEEDS CHANGES

Lifecycle issues:
- ...

Accounting issues:
- ...

Broker issues:
- ...

Required changes:
- ...
```
