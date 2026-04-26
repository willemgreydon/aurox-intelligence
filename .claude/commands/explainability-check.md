# /explainability-check

## Purpose
Verify that all signal, forecast, and recommendation outputs include human-readable explanations.

## When to Use
- Before any intelligence feature goes to UI
- When reviewing AI-assisted recommendation outputs
- When auditing for regulatory or UX compliance

## Claude Code Prompt

```text
Check explainability coverage across the Aurox signal, forecasting, and intelligence layers.

Check packages/signals/:
1. Does every SignalOutput include a non-empty explanation string?
2. Is the explanation human-readable (not just a numeric dump)?
3. Does the explanation describe why the score is what it is?

Check packages/forecasting/:
4. Same explanation checks
5. Does forecast output include confidence rationale?

Check packages/ai-market-intelligence/:
6. Are AI recommendations explainable?
7. Is the reasoning chain visible to users?

Check apps/web UI:
8. Are explanation strings surfaced in the UI (not just stored in read model)?
9. Is confidence displayed or used for visual differentiation?
10. Are users ever shown a score without context?

Report:

Explainability Check
====================
Signals with empty explanations:
- File: <path>
  Signal: <name>

Forecasts with empty explanations:
- ...

AI outputs without reasoning:
- ...

UI surfaces hiding explanations:
- ...

Overall explainability: PASS / NEEDS IMPROVEMENT

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/forecasting typecheck
```

## Expected Output
Coverage report of explanation fields across all intelligence outputs.

## Safety Notes
- Explanation fields must not be auto-generated noise. They must describe the actual calculation result.
