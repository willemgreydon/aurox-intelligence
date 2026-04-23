# Signal Framework

## Signal Categories

### Trend Signals
- Moving averages
- MACD

### Momentum Signals
- RSI
- Rate of Change

### Volatility Signals
- Bollinger Bands
- ATR

### Mean Reversion
- Z-score deviations

---

## Signal Output

Each signal returns:

- score: number (-1 to +1)
- confidence: 0–1
- explanation: string

---

## Aggregation

Final Signal = weighted sum of all signals