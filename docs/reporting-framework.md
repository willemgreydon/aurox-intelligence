# Reporting Framework

This document defines reporting standards for Aurox Intelligence.

## Objectives

- communicate state clearly to users and operators
- preserve auditability of simulation decisions
- support product, risk, and engineering observability

## Report Types

1. Session Report
- simulation lane and status timeline
- order and transaction summary
- equity curve summary

2. Portfolio Report
- holdings snapshot
- allocation breakdown
- realized/unrealized contribution summary

3. Execution Report
- fill quality (requested vs executed)
- fee and slippage totals
- source distribution (manual vs AI-suggested)

4. Reliability Report
- provider freshness coverage
- degraded/error event counts
- stale-data fallbacks

## Core KPIs

- total return
- max drawdown
- hit rate (if strategy-defined)
- average win/loss size
- turnover
- cash utilization
- slippage cost
- fee cost

## Data Contracts

Reports should be generated from typed read models, not ad-hoc SQL in route components.

Preferred flow:
- query
- mapper
- service
- export renderer (UI/API/file)

## Export Targets

- UI-first summaries
- JSON for machine consumption
- CSV for spreadsheet analysis

## Quality Rules

- all reported values must have timestamp context
- all percentages must define denominator
- no derived KPI without formula reference

## Future Work

- scheduled daily report materialization
- comparative benchmark reporting
- lane-level attribution reports
