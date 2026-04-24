# Portfolio Construction

This document defines portfolio design for simulation and intelligence workflows.

## Goal

Produce transparent, controllable allocation decisions with clear risk and execution semantics.

## Current Product View

The portfolio route supports:
- open positions
- closed positions
- asset and asset-class allocation
- recent trades and source labels
- quick actions from holdings

## Construction Approaches

1. Equal Weight Baseline
- simple and explainable
- useful for neutral benchmark portfolios

2. Volatility-Aware Sizing
- smaller allocations to higher-volatility symbols
- reduces drawdown concentration

3. Conviction-Weighted Sizing
- weight by confidence score with hard caps
- requires robust confidence calibration

## Practical Constraints

- max position percent of equity
- max asset-class concentration
- minimum liquidity threshold proxy
- lane-based asset restrictions

## Rebalance Policies

- calendar-based (weekly/monthly)
- threshold-based drift correction
- risk-triggered rebalance (drawdown or volatility regime changes)

## Allocation Reporting Standards

Every portfolio view should expose:
- total equity, cash, buying power
- open vs closed position counts
- allocation by symbol and by asset class
- realized and unrealized PnL

## Simulation-Specific Notes

- no leverage by default
- no shorting unless explicitly modeled in policy
- all trades remain paper execution

## Future Enhancements

- lane-aware model portfolios
- factor attribution summary per portfolio
- scenario stress impacts on allocations
