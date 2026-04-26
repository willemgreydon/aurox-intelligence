# /a11y-audit

## Purpose
Audit the Aurox web app for accessibility compliance across keyboard navigation, ARIA, and screen reader support.

## When to Use
- Before a release
- After building new interactive components
- When accessibility feedback is received

## Claude Code Prompt

```text
Audit Aurox web app accessibility.

Check apps/web/components/ for:

1. Keyboard navigation
   - Are all interactive elements reachable by Tab?
   - Are trade submission buttons, modals, and dropdowns keyboard-accessible?
   - Is focus visible (not just outline: none)?

2. ARIA
   - Do tables have proper aria-labels or captions?
   - Do icon-only buttons have aria-label?
   - Are loading states announced to screen readers (aria-live)?
   - Are error messages associated with inputs (aria-describedby)?

3. Color
   - Is information conveyed by color alone? (should also use text/icon)
   - Do PnL colors have sufficient contrast?

4. Forms (trade ticket, settings)
   - Are all inputs labeled?
   - Are validation errors associated with their fields?
   - Is the submit button disabled state communicated?

5. Financial data tables
   - Are column headers properly marked as <th>?
   - Is the sort direction announced?

Report:

Accessibility Audit
===================
Critical (blocker):
- ...

Major:
- Component: <name>
  Issue: <description>
  Fix: <aria attribute or HTML fix>

Minor:
- ...

Keyboard navigation gaps:
- ...

ARIA gaps:
- ...

Priority fixes:
1. ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Prioritized a11y issues with specific component locations and ARIA fixes.

## Safety Notes
- Accessibility is a production requirement, not optional polish.
