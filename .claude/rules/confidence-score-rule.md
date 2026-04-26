# Confidence Score Rule

## Purpose
Every signal, forecast, and recommendation must carry a `confidence` value between 0 and 1. Confidence must be honestly derived — not hardcoded. Low confidence must propagate to execution decisions (block or require confirmation).

## Applies To
- `packages/signals/`
- `packages/forecasting/`
- `packages/ai-market-intelligence/`
- `packages/agents/`

## Rule
Confidence value semantics:
- `1.0` — maximum confidence (rarely appropriate)
- `0.7–0.9` — high confidence, good data, strong signal
- `0.4–0.7` — moderate confidence, acceptable for assisted suggestions
- `0.1–0.4` — low confidence, display as indicative only
- `0.0` — no confidence, insufficient data, do not act on

Confidence must be reduced when:
- Data is stale (reduce by ≥30%)
- Fewer bars than ideal (reduce proportionally)
- Fallback provider was used (reduce by ≥20%)
- Multiple conflicting signals (reduce by ≥15%)
- Market data has gaps (reduce by ≥25%)

Minimum confidence thresholds for execution:
- Assisted suggestion display: 0.3
- Autonomous suggestion acceptance: 0.6 (minimum — not yet enabled)
- Live execution: explicitly configurable, default 0.7

## Forbidden
- Hardcoded `confidence: 0.8` regardless of data quality
- `confidence: 1.0` from any automated system
- Signal that returns higher confidence on stale data than on fresh data
- Confidence value outside [0, 1]
- Execution decisions that ignore the confidence field

## Required Pattern
```ts
// packages/signals/src/trend.ts
export function deriveTrendSignal(ohlcv: OHLCV[], quote: Quote): SignalOutput {
  const baseConfidence = 0.7
  const stalePenalty = quote.isStale ? 0.5 : 1.0
  const dataPenalty = ohlcv.length < IDEAL_BARS ? (ohlcv.length / IDEAL_BARS) : 1.0
  const fallbackPenalty = quote.isFallback ? 0.8 : 1.0
  const confidence = clamp(baseConfidence * stalePenalty * dataPenalty * fallbackPenalty, 0, 1)
  return { score: computeScore(ohlcv), confidence, explanation: buildExplanation(ohlcv, confidence) }
}
```

```ts
// packages/agents/src/risk/pre-trade-check.ts
if (signal.confidence < MIN_SIGNAL_CONFIDENCE) {
  return { passed: false, reason: `signal_confidence_too_low: ${signal.confidence}` }
}
```

## Validation
```bash
grep -r "confidence.*0\.[0-9]" packages/signals/src --include="*.ts" | grep -v "clamp\|penalty\|threshold"
grep -r "confidence: 1\b\|confidence: 0\.9[0-9]" packages/signals/src packages/forecasting/src --include="*.ts"
pnpm --filter @repo/signals test
```

## Good Example
```ts
const confidence = quote.isStale ? 0.3 : 0.75
return { score, confidence, explanation: quote.isStale ? "stale data: low confidence" : "live data" }
// ✓ Confidence honestly reflects data quality
```

## Bad Example
```ts
return { score: computeScore(ohlcv), confidence: 0.8, explanation: "EMA crossover" }
// ✗ Confidence is hardcoded regardless of data quality, staleness, or bar count
```

## Safety Notes
A hardcoded high-confidence signal on stale or sparse data can trigger an execution decision that a properly calibrated confidence would have blocked. In the future autonomous execution path, confidence is the primary safety gate against acting on bad data.
