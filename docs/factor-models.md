# Factor Models

This document defines factor model design for Aurox Intelligence.

## Objective

Transform raw market features into interpretable factor exposures that improve ranking, risk framing, and portfolio construction.

## Factor Universe

Core cross-asset factors:
- momentum
- volatility
- liquidity proxy
- concentration/crowding proxy
- trend persistence

Asset-class specific factors:
- equities: sector beta, size proxy, earnings sensitivity proxy
- ETFs: underlying concentration, duration/theme sensitivity
- crypto: regime beta, liquidity instability, funding/crowding proxies

## Architecture Placement

- feature extraction in domain packages (`signals`, future `analytics` modules)
- factor scoring as pure deterministic transforms
- contract publication through `api-contracts`
- route consumption through read mappers/services

## Scoring Pipeline

1. gather normalized features
2. winsorize outliers
3. z-score or percentile normalize
4. apply factor-specific transform
5. compose into factor vector

## Example Factor Vector

```text
{
  momentum: 0.62,
  volatility: -0.31,
  liquidity: 0.12,
  trendPersistence: 0.44,
  crowdingRisk: -0.55
}
```

## Interpretation Conventions

- positive is favorable only if factor semantics define it as such
- factor polarity must be explicit in metadata
- never assume all positive values are good

## Use Cases

- universe ranking
- portfolio tilt decisions
- anomaly diagnosis
- risk communication in portfolio surfaces

## Reliability Controls

- minimum sample windows
- stale-data penalties
- confidence score per factor vector
- deterministic fallback to neutral vector when data incomplete

## Backtesting Guidance

- avoid leakage in horizon alignment
- evaluate regime-segmented performance
- measure turnover impact and stability

## Future Work

- add macro-linked factors
- add transaction-cost-aware factor decay
- add lane-specific factor constraints for simulation
