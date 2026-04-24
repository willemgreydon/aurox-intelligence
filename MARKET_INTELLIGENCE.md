# MARKET_INTELLIGENCE.md — AUROX INTELLIGENCE

**Version:** 1.0
**Role:** Market Ranking, Signal Fusion, Factor Scoring & Decision Intelligence

---

## 1. Purpose

The Market Intelligence System transforms raw and derived market data into explainable decision support.

It is responsible for:

* Ranking assets
* Combining signals
* Detecting regimes
* Scoring opportunities
* Explaining recommendations
* Feeding agents with structured intelligence

Market Intelligence does not execute trades.

It informs decisions.

---

## 2. Intelligence Pipeline

```text
Market Data
  ↓
Feature Engineering
  ↓
Signal Computation
  ↓
Factor Scoring
  ↓
Regime Detection
  ↓
Risk Adjustment
  ↓
Ranking
  ↓
Recommendation
```

---

## 3. Inputs

Market Intelligence consumes:

* OHLCV data
* Current quotes
* Volatility metrics
* Liquidity metrics
* Technical indicators
* Fundamental metrics
* ETF metadata
* Crypto on-chain metrics
* Macro context
* News/sentiment signals
* Portfolio context
* Risk constraints

---

## 4. Outputs

```ts
export type MarketIntelligenceOutput = {
  symbol: string
  assetKind: "stock" | "etf" | "crypto"
  rank: number
  score: number
  confidence: number
  recommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell"
  horizon: "intraday" | "swing" | "long_term"
  signalSummary: SignalSummary
  factorSummary: FactorSummary
  regimeSummary: RegimeSummary
  riskSummary: IntelligenceRiskSummary
  explanation: string[]
  updatedAt: string
}
```

---

## 5. Signal Summary

```ts
export type SignalSummary = {
  trendScore: number
  momentumScore: number
  volatilityScore: number
  meanReversionScore: number
  breakoutScore: number
  aggregateSignalScore: number
}
```

Score range:

```text
-1.0 = strongly bearish
 0.0 = neutral
+1.0 = strongly bullish
```

---

## 6. Factor Summary

```ts
export type FactorSummary = {
  momentum: number
  value: number
  size: number
  volatility: number
  liquidity: number
  quality?: number
  growth?: number
  cryptoNetworkGrowth?: number
  cryptoOnChainUsage?: number
  aggregateFactorScore: number
}
```

Score range:

```text
0.0 = weakest
1.0 = strongest
```

---

## 7. Regime Summary

```ts
export type RegimeSummary = {
  marketRegime:
    | "bull"
    | "bear"
    | "sideways"
    | "high_volatility"
    | "risk_off"
    | "risk_on"
  confidence: number
  evidence: string[]
}
```

---

## 8. Risk Summary

```ts
export type IntelligenceRiskSummary = {
  volatilityRisk: number
  liquidityRisk: number
  drawdownRisk: number
  correlationRisk: number
  anomalyRisk: number
  overallRisk: number
}
```

Risk score:

```text
0.0 = low risk
1.0 = extreme risk
```

---

## 9. Recommendation Mapping

```text
score >= 0.75 → strong_buy
score >= 0.55 → buy
score > -0.25 and score < 0.55 → hold
score <= -0.25 → sell
score <= -0.60 → strong_sell
```

Risk can downgrade recommendation.

Example:

```text
raw recommendation = strong_buy
overallRisk = high
final recommendation = hold or buy
```

---

## 10. Composite Score Formula

Recommended baseline:

```text
Composite Score =
  0.35 * Signal Score +
  0.25 * Factor Score +
  0.15 * Regime Score +
  0.15 * Risk-Adjusted Momentum +
  0.10 * Liquidity Score
```

Then apply risk penalty:

```text
Final Score = Composite Score * (1 - RiskPenalty)
```

---

## 11. Signal Score Formula

```text
Signal Score =
  0.30 * Trend +
  0.25 * Momentum +
  0.20 * Volatility +
  0.15 * Mean Reversion +
  0.10 * Breakout
```

---

## 12. Risk Penalty

```text
RiskPenalty =
  0.30 * VolatilityRisk +
  0.25 * LiquidityRisk +
  0.20 * DrawdownRisk +
  0.15 * CorrelationRisk +
  0.10 * AnomalyRisk
```

Clamp:

```text
RiskPenalty ∈ [0, 0.75]
```

The system should never reduce score by more than 75% unless a hard block is triggered.

---

## 13. Confidence Score

Confidence is based on:

* Data completeness
* Signal agreement
* Regime clarity
* Low anomaly risk
* Provider reliability

```text
Confidence =
  0.30 * DataCompleteness +
  0.25 * SignalAgreement +
  0.20 * RegimeConfidence +
  0.15 * ProviderReliability +
  0.10 * LowAnomalyConfidence
```

---

## 14. Data Completeness

```ts
export type DataCompleteness = {
  hasQuote: boolean
  hasHistory: boolean
  hasVolume: boolean
  hasMetadata: boolean
  hasRiskMetrics: boolean
  score: number
}
```

If critical data is missing:

```text
recommendation = hold
confidence <= 0.35
```

---

## 15. Signal Agreement

Signal agreement measures whether indicators point in the same direction.

```text
SignalAgreement = 1 - normalized dispersion of signal scores
```

If signals conflict strongly:

```text
lower confidence
prefer hold
```

---

## 16. Asset Ranking

Assets are ranked by:

```text
rankScore = finalScore * confidence * tradabilityScore
```

Tradability includes:

* Liquidity
* Spread
* Minimum order constraints
* Provider quality
* Market availability

---

## 17. Ranking Output

```ts
export type RankedAsset = {
  rank: number
  symbol: string
  displayName: string
  assetKind: "stock" | "etf" | "crypto"
  score: number
  confidence: number
  recommendation: MarketIntelligenceOutput["recommendation"]
  tradabilityScore: number
  reason: string
}
```

---

## 18. Market Regime Detection

Inputs:

* Index trend
* Volatility
* Breadth
* Correlation
* Volume
* Macro indicators
* Crypto funding/open interest where relevant

Regime logic must be deterministic.

---

## 19. Regime Score Mapping

```text
bull → +1.0
risk_on → +0.75
sideways → 0.0
high_volatility → -0.35
risk_off → -0.65
bear → -1.0
```

---

## 20. Crypto Intelligence

Crypto scoring may include:

* Realized volatility
* Funding rates
* Open interest
* Exchange flows
* On-chain activity
* Whale movements
* Liquidity fragmentation
* 24/7 regime behavior

Crypto risk penalties should generally be higher than equity risk penalties.

---

## 21. ETF Intelligence

ETF scoring may include:

* Underlying index strength
* Tracking error
* Expense ratio
* Liquidity
* Sector exposure
* Concentration risk
* NAV deviation

---

## 22. Equity Intelligence

Equity scoring may include:

* Momentum
* Valuation
* Earnings trend
* Sector strength
* Liquidity
* Volatility
* News sensitivity

---

## 23. Explanation Engine

Every intelligence output must include human-readable reasoning.

Example:

```ts
explanation: [
  "Trend score is positive because price trades above key moving averages.",
  "Momentum is weakening due to declining RSI.",
  "Risk was downgraded because volatility exceeded the rolling threshold.",
  "Final recommendation is HOLD due to conflicting signals."
]
```

---

## 24. Hard Downgrade Conditions

Force `hold` if:

* Missing critical market data
* High anomaly risk
* Extreme volatility
* Market closed for non-crypto asset
* Provider confidence too low
* Risk engine blocks new exposure

Force `sell` or `strong_sell` only if:

* Existing position exists
* Risk-reducing action is appropriate
* Signal and risk logic support exit

---

## 25. Intelligence Does Not Execute

Market Intelligence may produce:

* Recommendation
* Ranking
* Confidence
* Explanation

It must not:

* Submit orders
* Modify portfolios
* Bypass risk
* Override user permissions

---

## 26. Testing Requirements

Minimum tests:

* Composite score calculation
* Risk penalty application
* Recommendation mapping
* Confidence downgrade on missing data
* Hold fallback on conflicting signals
* Ranking stability
* Crypto-specific scoring
* ETF-specific scoring
* Explanation completeness

---

## 27. Final Directive

Market Intelligence must be explainable, deterministic, and risk-aware.

If the system cannot explain a recommendation:

```text
recommendation = hold
```
