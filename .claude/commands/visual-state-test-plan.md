# /visual-state-test-plan

## Purpose
Generate a test plan for UI visual states: loading, empty, error, degraded, and success.

## When to Use
- After building a new screen or component
- When QA finds missing visual states
- Before a demo or release

## Claude Code Prompt

```text
Generate a visual state test plan for an Aurox UI component or screen.

Target: [USER PROVIDES: e.g. "portfolio screen" or "asset card"]

For the target, define test cases for every visual state:

1. Loading state
   - What does the component show while data is being fetched?
   - Is there a skeleton or spinner?
   - Is interaction blocked appropriately?

2. Empty state
   - What does the component show with zero data? (no positions, no assets, no orders)
   - Is the empty state informative (explains why it's empty and what to do)?

3. Error state
   - What does the component show on a network/provider error?
   - Is the error user-friendly (not a raw stack trace)?
   - Is there a retry option?

4. Degraded state
   - What does the component show when data is stale?
   - Is stale data visually differentiated?
   - Is low-confidence signal score shown differently?

5. Success state (normal)
   - What does the fully loaded component look like?
   - Are all financial numbers correctly formatted?
   - Is simulation context indicated where relevant?

For each state: describe the expected visual, the data condition that triggers it, and how to test it manually.

Report:

Visual State Test Plan
======================
Component: <name>

Loading: described / missing
Empty: described / missing
Error: described / missing
Degraded: described / missing
Success: described / missing

Manual test steps:
1. Loading: [how to trigger and verify]
2. ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Complete visual state test plan for the target component.

## Safety Notes
- Degraded/stale data must never look identical to fresh data.
- Simulation context must always be visible on execution-related screens.
