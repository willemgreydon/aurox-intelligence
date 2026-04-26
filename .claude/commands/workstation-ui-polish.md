# /workstation-ui-polish

## Purpose
Audit and improve the overall UI polish to meet financial workstation standards.

## When to Use
- Before a demo or release
- When the UI feels unfinished
- After adding new screens that need visual consistency

## Claude Code Prompt

```text
Audit Aurox UI for financial workstation quality.

Check:
1. Loading states — does every data-dependent section show a skeleton or spinner?
2. Empty states — does every list or table show a meaningful empty state (not blank)?
3. Error states — are network/provider errors surfaced clearly?
4. Degraded states — is stale or low-confidence data visually differentiated?
5. Simulation vs live context — is simulation mode clearly indicated on all execution-related screens?
6. Risk language — are there any implied guaranteed returns?
7. Typography — are financial numbers using tabular numbers (tnum)?
8. Color — do green/red follow standard financial conventions?
9. Decimal precision — are prices showing appropriate precision per asset class?
10. Accessibility — are interactive elements reachable by keyboard?

Report:

Workstation UI Polish Audit
============================
Missing loading states:
- Component: <name>

Missing empty states:
- Component: <name>

Missing error states:
- Component: <name>

Simulation context missing:
- Screen: <path>

Risk language issues:
- ...

Typography / formatting issues:
- ...

Priority polish items:
1. ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Prioritized list of UI polish issues with specific component locations.

## Safety Notes
- Never imply guaranteed returns in UI copy.
- Simulation must always be visually distinct from live.
