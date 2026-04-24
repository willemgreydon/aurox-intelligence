# Crypto Market Structure

This document captures crypto-specific constraints for analytics and simulation design.

## Core Market Properties

- 24/7 trading
- fragmented liquidity across venues
- high intraday volatility
- structural gap risk around news/liquidations

## Implications for Aurox

1. Quote Freshness Sensitivity
- stale crypto quotes degrade simulation realism quickly
- route surfaces should show freshness explicitly

2. Execution Modeling
- higher default slippage assumptions than equities
- fee and spread sensitivity should be visible in reports

3. Risk Controls
- tighter position sizing and concentration caps recommended
- lane-level safeguards should be stronger for crypto assets

## Useful Crypto Metrics

- realized volatility windows
- trend persistence
- liquidity proxy (spread/depth where available)
- crowding proxy (funding/open interest in future versions)

## Current Supported Universe Behavior

- major crypto symbols are represented through canonical symbol mappings
- tradability is governed through asset catalog metadata
- simulation execution routes through multi-asset lanes

## Data Caveats

- weekend and overnight regime shifts are common
- venue-specific pricing divergence can appear
- provider fallback behavior must be transparent to users

## Future Enhancements

- venue-aware liquidity quality scoring
- richer crypto-specific factor stack
- stress scenarios for liquidation cascades
