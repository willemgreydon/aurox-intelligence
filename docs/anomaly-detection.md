# Anomaly Detection

This document defines anomaly detection goals and integration patterns.

## Objective

Detect meaningful deviations in market or portfolio behavior and surface actionable context without false alarm noise.

## Anomaly Classes

1. Price Behavior
- sudden returns outside expected volatility envelope
- unusual gap/mean-reversion patterns

2. Liquidity/Execution
- abnormal slippage or fee profiles
- repeated rejected/failed order patterns

3. Portfolio Behavior
- abrupt concentration changes
- unexpected drawdown acceleration

4. Data Integrity
- quote freshness degradation
- provider divergence spikes

## Detection Strategy

Start simple and deterministic:
- rolling z-score thresholds
- volatility-adjusted residual checks
- rule-based integrity flags

Then add model-based detectors where clearly beneficial.

## Output Contract (Recommended)

- `anomalyType`
- `severity` (`low`, `medium`, `high`, `critical`)
- `score`
- `detectedAt`
- `evidence`
- `affectedSymbols`
- `recommendedAction`

## Product Integration

- dashboard risk/status callouts
- portfolio and orders diagnostic panels
- operator/admin monitoring workflows

## False Positive Management

- enforce cooldown windows
- require multi-signal confirmation for high-severity alerts
- log suppressions and acknowledgment history

## Future Work

- regime-aware threshold adaptation
- cross-asset contagion anomaly analysis
- anomaly backtesting quality metrics
