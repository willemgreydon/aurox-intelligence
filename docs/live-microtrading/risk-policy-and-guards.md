# Risk Policy and Guard Specifications

This document defines mandatory risk guards for live microtrading.

## 1. Order-Level Guards

Before submit:
- validate symbol allowlist
- validate min/max notional
- validate min/max quantity
- validate price sanity bounds
- validate lane cooldown and cadence

## 2. Position-Level Guards

- max position size per instrument
- max concentration per asset class
- max open positions per lane

## 3. PnL and Drawdown Guards

- lane daily loss limit
- account daily loss limit
- lane drawdown limit
- global drawdown limit

Crossing any critical threshold must halt affected lane immediately.

## 4. Execution Quality Guards

- max acceptable slippage bps
- max acceptable effective fee bps
- max order rejection ratio in rolling window

## 5. Data Quality Guards

- disallow autonomous submit on stale or degraded market data
- enforce freshness windows per asset class

## 6. Policy Decision Audit

Every policy evaluation should be persisted with:
- input snapshot
- allow/deny decision
- reason codes
- policy version
- trace IDs

## 7. Hard Stop Conditions

Immediate stop on:
- kill switch activation
- connectivity integrity failure
- reconciliation drift beyond tolerance
- rapid consecutive rejection spikes

## 8. Recovery Conditions

A halted lane resumes only when:
- operator explicitly re-enables
- blocking condition resolved
- preflight checks pass
