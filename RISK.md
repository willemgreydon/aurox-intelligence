# RISK.md — AUROX INTELLIGENCE

**Version:** 2.0 (Institutional Risk Framework)
**Role:** Central Risk Governance & Enforcement Layer

---

# 1. PURPOSE

The Risk System exists to:

* Prevent capital destruction
* Enforce disciplined trading behavior
* Protect against systemic, market, and execution risks
* Override all trading decisions when necessary

---

# 2. RISK PHILOSOPHY

## 2.1 Core Principle

> Survival > Profit

A system that avoids catastrophic loss will outperform over time.

---

## 2.2 Absolute Rules

* No trade is mandatory
* Capital preservation is primary objective
* Risk system ALWAYS overrides AI and user decisions

---

## 2.3 Fail-Safe Doctrine

If uncertainty exists:

```text
DO NOT TRADE
```

---

# 3. RISK LAYERS

Risk is evaluated across **four independent layers**:

```text
Asset Risk
   ↓
Position Risk
   ↓
Portfolio Risk
   ↓
Systemic Risk
```

Each layer can independently block execution.

---

# 4. RISK TYPES

## 4.1 Market Risk

* Price volatility
* Trend instability
* Drawdown potential

## 4.2 Liquidity Risk

* Low market depth
* High spread
* Slippage exposure

## 4.3 Counterparty Risk

* Broker/exchange failure
* Settlement risk

## 4.4 Operational Risk

* System errors
* Execution delays
* Data integrity issues

## 4.5 Model Risk

* Signal failure
* AI misprediction
* Overfitting

---

# 5. CORE METRICS

## 5.1 Volatility

* Realized volatility
* Implied volatility (if available)

---

## 5.2 Value at Risk (VaR)

```text
VaR = Expected loss at confidence level over time horizon
```

---

## 5.3 Expected Shortfall (ES)

* Measures tail risk beyond VaR

---

## 5.4 Maximum Drawdown

* Peak-to-trough capital loss

---

## 5.5 Sharpe Ratio

* Risk-adjusted return

---

## 5.6 Correlation Matrix

* Measures diversification and clustering

---

# 6. POSITION SIZING

## 6.1 Methods

* Fixed % allocation
* Volatility-adjusted sizing
* Risk-parity weighting
* Kelly Criterion (optional, capped)

---

## 6.2 Position Constraints

* Max % per asset
* Max % per trade
* Min viable position size
* Instrument-level constraints (tick size, lot size)

---

## 6.3 Position Size Formula (Example)

```text
Position Size = (Risk per Trade) / (Stop Loss Distance)
```

---

# 7. PORTFOLIO RISK

## 7.1 Constraints

* Max total exposure
* Sector limits
* Asset-class limits
* Correlation caps

---

## 7.2 Diversification Rules

* Avoid over-concentration
* Limit correlated positions
* Maintain cross-asset balance

---

## 7.3 Portfolio Metrics

```ts
type PortfolioRisk = {
  totalExposure: number
  diversificationScore: number
  correlationScore: number
  drawdownRisk: number
}
```

---

# 8. STOP-LOSS SYSTEM

## 8.1 Mandatory Requirement

EVERY position must have:

* Initial stop-loss
* Defined risk per trade

---

## 8.2 Types

* Fixed stop-loss
* Trailing stop
* Volatility-based stop

---

## 8.3 Enforcement

If no stop-loss exists:

→ Trade MUST be rejected

---

# 9. ANOMALY PROTECTION

System must detect and block trading during:

* Volatility spikes
* Price anomalies
* Correlation breakdown
* Liquidity collapse

---

## 9.1 Anomaly Thresholds

* Z-score deviations
* Volume spikes
* Rapid spread expansion

---

## 9.2 Behavior

If anomaly detected:

```text
Block trading OR reduce position size
```

---

# 10. EXECUTION RISK

## 10.1 Pre-Execution Checks

* Slippage estimation
* Liquidity depth validation
* Spread tolerance

---

## 10.2 Execution Constraints

* Reject trade if slippage too high
* Reject if market depth insufficient
* Reject if latency risk too high

---

# 11. SYSTEMIC RISK

## 11.1 Conditions

* Market crash
* Exchange outages
* Extreme volatility regimes

---

## 11.2 Response

* Reduce exposure
* Halt new trades
* Allow only risk-reducing actions

---

# 12. RISK SCORING SYSTEM

```ts
type RiskScore = {
  assetRisk: number        // 0–1
  positionRisk: number     // 0–1
  portfolioRisk: number    // 0–1
  systemicRisk: number     // 0–1
  overallRisk: number      // weighted result
}
```

---

## 12.1 Decision Thresholds

| Risk Level | Action                  |
| ---------- | ----------------------- |
| Low        | Allow                   |
| Medium     | Allow with reduced size |
| High       | Block                   |
| Extreme    | Halt system             |

---

# 13. RISK ENFORCEMENT ENGINE

The Risk Engine can:

* Block trades
* Adjust position size
* Force liquidation (extreme cases)
* Disable autonomous mode

---

## 13.1 Override Priority

```text
Risk System > Agent Decision > User Input
```

---

# 14. STRESS TESTING

System must simulate:

* Market crashes (-20% to -80%)
* Liquidity droughts
* Volatility explosions

---

## 14.1 Outputs

* Portfolio survival probability
* Drawdown scenarios
* Risk exposure breakdown

---

# 15. FAIL-SAFE MECHANISMS

## 15.1 Kill Switch

Must be available at all times:

* Disable trading instantly
* Close positions (optional mode)

---

## 15.2 Safe Mode

```text
No new trades
Only risk-reducing actions allowed
```

---

# 16. LIVE TRADING PROTECTION

Before live trading:

* Risk profile defined
* Capital validated
* Broker constraints loaded
* Exposure limits configured

---

## 16.1 Continuous Monitoring

* Risk recalculated after every trade
* Alerts on threshold breaches

---

# 17. LOGGING & AUDITABILITY

Every decision must log:

* Risk inputs
* Risk score
* Decision outcome
* Reasoning

---

## 17.1 Audit Trail

Must include:

* Orders
* Trades
* Risk evaluations
* Overrides

---

# 18. INVARIANTS (NON-BREAKABLE RULES)

* No trade without risk validation
* No position without stop-loss
* No execution without liquidity check
* No autonomous trading without readiness

---

# 19. FAILURE MODES

## 19.1 Data Failure

→ Reduce trading or halt

## 19.2 Execution Failure

→ Retry or abort

## 19.3 Risk Calculation Failure

→ Block ALL trades

---

# 20. FUTURE EXTENSIONS

* Dynamic risk models
* Regime-aware risk adjustment
* Multi-agent risk consensus
* Hedging strategies

---

# 21. FINAL DIRECTIVE

Risk is not a feature.

Risk is the system.

---

Every decision must assume:

→ Capital is real
→ Loss is irreversible
→ Protection is mandatory

---

# 22. SYSTEM MINDSET

Aurox must behave like:

→ A disciplined hedge fund
→ A risk-first trading engine
→ A capital protection system

---

If risk is unclear:

```text
DO NOT TRADE
```
