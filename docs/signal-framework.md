# Signal Framework

This document defines the current and target signal architecture in Aurox Intelligence.

## Purpose

Signals provide deterministic, explainable directional context for market monitoring and downstream intelligence.

## Principles

- pure functions inside `packages/signals`
- explicit input and output types
- no hidden I/O in scoring functions
- explainable values over black-box labels

## Signal Categories

1. Trend
- moving average slope
- trend-strength derivatives

2. Momentum
- rate-of-change windows
- short/medium momentum blend

3. Volatility
- realized volatility windows
- volatility regime classification

4. Composite
- weighted aggregation of normalized sub-signals
- confidence output tied to consistency and stability

## Current Package Anchors

Likely implementation modules include:
- `indicators/moving-average.ts`
- `indicators/momentum.ts`
- `indicators/volatility.ts`
- `indicators/trend-strength.ts`
- `scoring/signal-score.ts`
- `scoring/composite-score.ts`
- `analysis/derive-signal-snapshot.ts`

## Signal Contract Shape (Recommended)

Each final signal snapshot should include:
- `symbol`
- `score` (continuous)
- `direction` (`positive`, `neutral`, `negative`)
- `confidence` (0..1)
- `drivers` (ranked factors)
- `invalidationConditions`
- `asOf`

## Aggregation Rules

- normalize each component to comparable range
- apply fixed or config-driven weights
- cap extreme outliers before blending
- generate a confidence value from cross-component agreement

## Validation Rules

- reject NaN/Infinity at each stage
- enforce minimum bar count before calculating each indicator
- emit explicit partial-state output when data is insufficient

## Usage in Product

Signals are consumed by:
- dashboard summaries
- invest recommendations
- simulation context surfaces
- potential policy/risk assistants

## Testing Guidance

1. deterministic fixture tests per indicator
2. monotonicity tests where mathematically expected
3. composite output range and edge-case tests
4. insufficient-data behavior tests

## Future Enhancements

- configurable signal profiles by asset class
- adaptive weights by regime
- richer explainability payloads for UI and audit
