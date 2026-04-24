# Lane Autonomy Model

Autonomy must be configured per lane.

## Autonomy Levels

## Level 0: `manual_only`

- AI may provide analysis
- user explicitly submits orders
- no autonomous execution

## Level 1: `ai_suggested_human_approval`

- AI proposes ranked opportunities
- user approves order-by-order or session policy
- all submissions still human-gated

## Level 2: `ai_autonomous_limited`

- AI can submit orders within strict lane envelope
- immediate halt when lane/global constraints hit
- operator intervention always possible

## Level 3: `ai_autonomous_expanded` (future)

- broader autonomy under stronger reconciliation and compliance maturity
- only after proven runtime stability

## Lane Configuration Schema (Recommended)

```text
laneConfig:
  laneId
  autonomyLevel
  liveEnabled
  executionTarget
  allowedAssetClasses
  allowedSymbols
  capital:
    maxLaneCapital
    maxPerTradeNotional
    minPerTradeNotional
    maxDailyLoss
  cadence:
    maxOrdersPerMinute
    maxOrdersPerHour
    cooldownSeconds
  risk:
    maxOpenPositions
    maxPositionPercent
    maxDrawdownPercent
  killSwitch:
    laneKillSwitchEnabled
    autoHaltOnCriticalAlerts
```

## Capital Selection Model

User should be able to choose:
- fixed budget per lane
- percentage of account balance per lane

System must convert percentage to a hard absolute cap at runtime and enforce against real-time account balance.

## Guardrail Rules

- lane autonomy cannot exceed account/global autonomy ceiling
- lane cannot use assets unsupported by chosen broker
- lane min/max trade size must respect broker instrument constraints
