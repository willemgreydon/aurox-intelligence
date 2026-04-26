# Financial UI Safety Rule

## Purpose
Financial workstation UI must never imply guaranteed returns, hide risk, suppress execution mode indicators, or display data without appropriate caveats. Every financial display element carries a responsibility to inform, not mislead.

## Applies To
- `apps/web/components/`
- `apps/web/app/`

## Rule
Required UI safety behaviors:

1. **Execution mode always visible** — every page with trade actions must display `SIMULATION` or `LIVE` badge
2. **No guaranteed return language** — never use "will", "guaranteed", "certain" in signal or recommendation copy
3. **Past performance disclaimer** — any performance chart or historical return must include a disclaimer
4. **Risk warnings on execution** — trade form must show estimated risk or cost before submission
5. **Low confidence flag** — any signal or recommendation with `confidence < 0.4` must be visually distinguished
6. **Stale data indicator** — any price or signal marked `isStale: true` must show a visual staleness indicator
7. **Empty state** — every list, table, or data section must have an explicit empty state
8. **Error state** — every section must have a graceful error state (not a crash)
9. **Loading state** — every async section must show a loading indicator during fetch

Forbidden language:
- "This will make you money"
- "Guaranteed profit"
- "Risk-free"
- "AI predicts"
- "Certain to rise"

Required language for recommendations:
- "Indicative only"
- "Past performance does not guarantee future results"
- "This is not financial advice"

## Forbidden
- Trade button without execution mode indicator
- Signal card without confidence display
- Removing `SIMULATION` badge to "clean up" the UI
- Displaying returns without a disclaimer
- A component that crashes the page on null/undefined data

## Required Pattern
```tsx
// apps/web/components/invest/TradeTicket.tsx
export function TradeTicket({ mode, signal }: TradeTicketProps) {
  return (
    <div>
      <ExecutionModeBadge mode={mode} />   {/* always visible */}
      {signal.confidence < 0.4 && (
        <LowConfidenceWarning explanation={signal.explanation} />
      )}
      <form>
        {/* trade form */}
        <RiskDisclaimer />                  {/* always present */}
      </form>
    </div>
  )
}
```

## Validation
```bash
grep -r "ExecutionModeBadge\|SIMULATION\|mode.*badge" apps/web/components --include="*.tsx"
grep -r "loading\|skeleton\|Skeleton\|isLoading" apps/web/components --include="*.tsx"
grep -r "empty\|isEmpty\|no.*data\|noData" apps/web/components --include="*.tsx"
```

## Good Example
```tsx
<ExecutionModeBadge mode="SIMULATION" />
<SignalConfidenceBar confidence={0.35} />
<span className="text-xs text-muted">Indicative only. Not financial advice.</span>
// ✓ Mode shown, low confidence visible, disclaimer present
```

## Bad Example
```tsx
<h2>Strong Buy — 95% Confident!</h2>
<p>This stock is certain to rise. AI recommends buying now.</p>
// ✗ Misleading language, no disclaimer, no execution mode indicator
```

## Safety Notes
A user who believes a signal is a guarantee may over-size a position. A simulation badge that was removed "to clean up the UI" means a user confuses simulation performance with real performance. Financial UI safety rules are not aesthetic preferences — they are user protection requirements.
