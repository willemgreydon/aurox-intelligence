# Workstation UI Rule

## Purpose
Aurox UI must feel like a professional financial workstation — not a consumer app. Dense information display, clear state communication, and consistent visual hierarchy are required. Treat every screen as a professional tool, not a marketing page.

## Applies To
- `apps/web/components/`
- `apps/web/app/`
- `packages/design-tokens/`

## Rule
Financial workstation UI standards:

### Layout
- Use fixed-width data columns (tables must not reflow on data change)
- Numbers must right-align in tables
- Currency values must have consistent decimal places within a column
- Labels must left-align

### Color Conventions
- Green (`var(--color-green)`) — positive change, gain, bullish
- Red (`var(--color-red)`) — negative change, loss, bearish
- Amber/Yellow — warning, low confidence, stale data
- Muted/Gray — neutral, no data, disabled
- All color tokens must come from `packages/design-tokens`

### Typography
- Use monospace font for prices and quantities (numbers must align in tables)
- Consistent font sizes: large values use larger type, labels use smaller
- No decorative fonts for financial data

### State Display
Every data section must handle all states:
- **Loading**: skeleton or spinner
- **Empty**: meaningful message ("No positions yet")
- **Error**: friendly message + retry if applicable
- **Degraded**: data shown with staleness or partial-data indicator
- **Success**: the happy path

### Information Density
- Prefer showing more information over hiding it
- Use tooltips for secondary information rather than hiding it
- Do not paginate within a widget unless the list is very long (>50 items)

## Forbidden
- Removing state indicators to "clean up" a component
- Using design token colors not from `packages/design-tokens`
- Numbers in proportional fonts (sans-serif without `font-variant-numeric: tabular-nums`)
- Mixing decimal places for the same metric across a table
- Missing loading skeleton (blank flash of empty content)

## Required Pattern
```tsx
// Every data section
function PortfolioPositions({ positions, isLoading, error }: Props) {
  if (isLoading) return <PositionsSkeleton />
  if (error) return <ErrorState message="Could not load positions" />
  if (positions.length === 0) return <EmptyState message="No open positions" />
  return (
    <table className="data-table">
      <thead>...</thead>
      <tbody>
        {positions.map(p => <PositionRow key={p.symbol} position={p} />)}
      </tbody>
    </table>
  )
}
```

```tsx
// Numbers: monospace, right-aligned, consistent decimals
<td className="tabular-nums text-right font-mono">{position.priceDisplay}</td>
```

## Validation
```bash
grep -r "font-mono\|tabular-nums" apps/web/components --include="*.tsx"
grep -r "isLoading\|error\|isEmpty\|Skeleton" apps/web/components --include="*.tsx" -l
grep -r "var(--color-" apps/web/components --include="*.tsx" --include="*.css"
```

## Good Example
```tsx
<td className="text-right font-mono tabular-nums text-green">+$1,234.56</td>
// ✓ Right-aligned, monospace, design token color, consistent decimals
```

## Bad Example
```tsx
<td style={{ color: "#22c55e" }}>+$1234.6</td>
// ✗ Hardcoded color, proportional font, inconsistent decimal places
```

## Safety Notes
Inconsistent decimal places in a price table cause users to read wrong values at a glance. A price displayed as `$123.4` instead of `$123.40` looks like a different number in a fast-paced trading context. Typography and alignment in financial UI are correctness concerns.
