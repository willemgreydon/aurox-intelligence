# Explainability Rule

## Purpose
Every AI suggestion, signal score, recommendation, and forecast must include a human-readable explanation. The system must never produce a score, rating, or recommendation without an `explanation` field that a user can understand. AI is augmentation — not authority.

## Applies To
- `packages/signals/`
- `packages/forecasting/`
- `packages/ai-market-intelligence/`
- `apps/web/components/`

## Rule
Every output from the intelligence pipeline must include:
- `explanation: string` — non-empty, human-readable, no jargon without definition
- `confidence: number` — 0 to 1
- `modelName` or `signalName` — identifies what produced the output

For recommendations (`packages/ai-market-intelligence`):
```ts
type Recommendation = {
  symbol: string
  action: "Buy" | "Watch" | "Hold" | "Reduce" | "Avoid"
  score: number
  confidence: number
  explanation: string         // primary explanation
  factors: string[]           // list of contributing factors
  risks: string[]             // identified risk factors
  generatedAt: number
}
```

Explanations must:
- State what the signal detected (e.g., "EMA(20) crossed above EMA(50)")
- State the direction and magnitude (e.g., "bullish, strong momentum")
- State any caveats (e.g., "low volume, confidence reduced")
- Not use phrases like "AI recommends" or "guaranteed"

## Forbidden
- Returning `explanation: ""` or `explanation: "n/a"`
- Explanation that only repeats the score (`explanation: "score: 0.8"`)
- Displaying a recommendation action without showing the explanation
- Using `explanation: "model output"` as a placeholder
- Suppressing explanation for low-confidence outputs (they need MORE explanation, not less)

## Required Pattern
```ts
// packages/signals/src/trend.ts
return {
  score: 0.65,
  confidence: 0.7,
  explanation: `EMA(20) crossed above EMA(50) on 2024-01-15. Price is 3.2% above the 50-day average. Volume confirms the move (1.4× average). Moderate confidence.`
}
```

```tsx
// apps/web/components/signal/SignalCard.tsx
export function SignalCard({ signal }: { signal: SignalDisplayViewModel }) {
  return (
    <div>
      <span>{signal.label}</span>
      <p>{signal.explanation}</p>          {/* always render explanation */}
      {signal.hasLowConfidence && (
        <span>Low confidence — treat as indicative only</span>
      )}
    </div>
  )
}
```

## Validation
```bash
grep -r "explanation.*''\|explanation.*\"\"" packages/signals/src packages/forecasting/src packages/ai-market-intelligence/src --include="*.ts"
grep -r "explanation" apps/web/components --include="*.tsx"
pnpm --filter @repo/signals test
```

## Good Example
```ts
explanation: "RSI(14) at 72.3 — overbought territory. Price extended 8% above 20-day MA. Reversal risk elevated."
// ✓ States indicator, value, interpretation, and risk context
```

## Bad Example
```ts
explanation: "signal computed"
// ✗ Provides no information to the user — worse than no explanation
```

## Safety Notes
An AI recommendation without explanation cannot be challenged by a user before acting on it. If an AI system suggests selling a position based on a signal the user cannot understand, they have no basis for overriding a wrong recommendation. Explainability is a financial safety requirement.
