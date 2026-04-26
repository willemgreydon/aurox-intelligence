# Signal Visual State Rule

## Purpose
Signal score displays must accurately represent all possible signal states: no data, low confidence, neutral, bullish, bearish, and stale. Never display a confident visual for a low-confidence or stale signal.

## Applies To
- `apps/web/components/signal/`
- `apps/web/components/market/`
- `apps/web/components/invest/`

## Rule
Signal visual states:

| Condition | Display |
|---|---|
| `confidence === 0` | "No signal" — muted, no color |
| `confidence < 0.4` | Signal label + warning indicator (⚠), muted styling |
| `score ∈ [-0.3, 0.3]` | "Neutral" — gray |
| `score > 0.3 && confidence >= 0.4` | "Bullish" — green |
| `score < -0.3 && confidence >= 0.4` | "Bearish" — red |
| `isStale: true` | Stale indicator (clock icon), reduced opacity |
| `hasInsufficientData: true` | "Insufficient data" — muted, no action |

Signal display view model:
```ts
type SignalDisplayViewModel = {
  label: "Bullish" | "Bearish" | "Neutral" | "No signal" | "Insufficient data"
  scoreDisplay: string       // "65%" not "0.65"
  confidenceDisplay: string
  explanation: string
  hasLowConfidence: boolean
  isStale: boolean
  colorClass: "text-green" | "text-red" | "text-gray" | "text-muted"
}
```

All of these fields must be computed in the mapper — not in the component.

## Forbidden
- Displaying a green "Bullish" badge when `confidence < 0.4`
- Rendering `signal.score.toFixed(2)` directly in a component (use `scoreDisplay`)
- Hiding the signal section entirely when data is absent (show "No signal" state instead)
- Using `!signal && null` without providing a meaningful empty state

## Required Pattern
```tsx
// apps/web/components/signal/SignalBadge.tsx
export function SignalBadge({ signal }: { signal: SignalDisplayViewModel }) {
  if (signal.label === "No signal" || signal.label === "Insufficient data") {
    return <span className="text-muted text-xs">{signal.label}</span>
  }
  return (
    <div className="signal-badge">
      <span className={signal.colorClass}>
        {signal.label}
        {signal.hasLowConfidence && <WarningIcon title="Low confidence — indicative only" />}
      </span>
      {signal.isStale && <StaleIndicator />}
      <span className="text-xs text-muted">{signal.confidenceDisplay}</span>
      <p className="explanation">{signal.explanation}</p>
    </div>
  )
}
```

## Validation
```bash
grep -r "SignalBadge\|SignalCard\|signalLabel" apps/web/components --include="*.tsx" -l
grep -r "confidence.*0\.[0-9]" apps/web/components --include="*.tsx"
grep -r "isStale\|hasLowConfidence" apps/web/components --include="*.tsx"
```

## Good Example
```tsx
{signal.hasLowConfidence && (
  <span className="text-xs text-yellow-600">⚠ Indicative only</span>
)}
// ✓ Low confidence visually communicated without suppressing the signal
```

## Bad Example
```tsx
{signal.confidence > 0 && (
  <span className="text-green font-bold">Strong Buy ↑</span>
)}
// ✗ Shows confident "Strong Buy" even when confidence is 0.05 — misleading
```

## Safety Notes
A user who sees a strong visual signal and acts on it without noticing the low-confidence indicator may over-size their position. Visual clarity on signal quality is not decorative — it directly influences trading decisions.
