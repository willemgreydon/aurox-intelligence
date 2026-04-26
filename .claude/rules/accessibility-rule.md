# Accessibility Rule

## Purpose
Aurox is a professional financial workstation. All interactive elements must be keyboard-navigable, screen-reader compatible, and meet WCAG 2.1 AA color contrast requirements. This is both a legal requirement and a professional standard.

## Applies To
- `apps/web/components/`
- `apps/web/app/`

## Rule
Minimum accessibility requirements:

### Keyboard Navigation
- All interactive elements must be reachable via Tab
- Modals and dialogs must trap focus when open
- Escape must close modals and dropdowns
- Trade forms must be fully operable without a mouse

### Screen Reader
- All images must have `alt` text (or `aria-hidden="true"` for decorative)
- All form inputs must have associated `<label>` or `aria-label`
- Data tables must have `<th>` with `scope` attribute
- Status changes (order submitted, error occurred) must use `aria-live` regions
- Charts and graphs that convey data must have a text alternative

### Color and Contrast
- Text on background: minimum 4.5:1 contrast ratio
- Large text (18px+ or 14px+ bold): minimum 3:1 contrast ratio
- Do not use color as the only way to convey meaning (e.g., red/green for P&L)

### Financial-Specific
- Execution mode badge must be announced to screen readers
- Order confirmation dialogs must be keyboard-dismissible
- Price changes must have text labels not just color changes

## Forbidden
- `<div onClick={...}>` for interactive elements (use `<button>`)
- Input without `<label>` or `aria-label`
- Color-only P&L indicators (must also include text: "Gain" / "Loss" or ↑ / ↓)
- Chart that has no text alternative for screen reader users
- Modal that does not trap focus
- `tabIndex={0}` on non-interactive elements for no reason

## Required Pattern
```tsx
// Good: button with accessible label
<button type="button" aria-label="Submit simulation trade for AAPL">
  Buy AAPL
</button>

// Good: P&L with color AND text
<span className={pnl >= 0 ? "text-green" : "text-red"} aria-label={`${pnl >= 0 ? "Gain" : "Loss"}: ${pnlDisplay}`}>
  {pnl >= 0 ? "▲" : "▼"} {pnlDisplay}
</span>

// Good: table with headers
<table>
  <thead>
    <tr>
      <th scope="col">Symbol</th>
      <th scope="col">Quantity</th>
      <th scope="col">P&L</th>
    </tr>
  </thead>
</table>
```

## Validation
```bash
grep -r "onClick" apps/web/components --include="*.tsx" | grep "div\|span" | grep -v "button\|a\s"
grep -r "<input" apps/web/components --include="*.tsx" | grep -v "aria-label\|htmlFor\|id="
npx axe-core or use browser DevTools accessibility audit
```

## Good Example
```tsx
<button
  type="submit"
  aria-label="Place buy order for 10 shares of AAPL in simulation"
  disabled={isSubmitting}
>
  {isSubmitting ? "Placing order..." : "Buy AAPL"}
</button>
// ✓ Semantic element, accessible label, disabled state
```

## Bad Example
```tsx
<div onClick={handleTrade} className="btn">Buy</div>
// ✗ Not keyboard accessible, no role, no aria-label, not a semantic button
```

## Safety Notes
A keyboard-inaccessible trade button means users who rely on keyboard navigation cannot trade. An order confirmation without focus trapping means screen reader users may accidentally dismiss confirmations without reading them — leading to unintended or missed orders.
