# Aurox Execution & Risk Rules

Apply to:

- `packages/agents/**`
- `packages/db/**simulation**`
- `packages/db/**order**`
- `packages/db/**transaction**`
- `packages/db/**portfolio**`
- `apps/web/**invest**`
- `apps/web/**simulation**`

## Core Rule

Execution is high risk. Simulation is the default.

## Never

- bypass risk checks
- execute without validation
- mutate portfolio without transaction log
- introduce randomness into accounting
- create broker calls from UI
- enable live execution by default
- enable autonomous live trading by default

## Required Pre-Execution Checks

- instrument constraints
- min quantity
- min notional
- tick size
- step size
- cash availability
- position availability for sells
- risk caps
- lane permissions
- data freshness
- provider confidence

## Fail Closed

If validation fails:

```text
reject order
preserve state
log reason
return safe result
```
