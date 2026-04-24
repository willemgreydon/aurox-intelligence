# ETF Mechanics

This document provides ETF-specific guidance for Aurox analytics and simulation.

## ETF Characteristics

- basket-based exposure
- intraday trading with exchange liquidity
- potential divergence between market price and NAV

## Why ETFs Matter in Aurox

- benchmark comparison surfaces
- allocation anchor instruments
- macro and sector expression in simulation

## Modeling Considerations

1. Tracking Behavior
- ETF return can diverge from index/NAV over short horizons
- analytics should label benchmark assumptions clearly

2. Liquidity and Spread
- less-liquid ETFs may have wider spreads
- execution assumptions should include potential slippage

3. Concentration
- thematic ETFs may behave like concentrated factor bets
- portfolio concentration reports should account for this

## Current Product Integration

- dedicated ETF route family (`/invest/etfs`)
- shared market card/row components with quick simulation actions
- multi-asset lane execution path for ETF orders

## Risk Notes

- synthetic/leverage ETF complexities are not fully modeled yet
- users should treat simulation fills as deterministic approximations

## Future Enhancements

- NAV premium/discount analytics
- underlying holdings exposure decomposition
- ETF-specific liquidity risk scoring
