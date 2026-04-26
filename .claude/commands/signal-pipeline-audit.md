# /signal-pipeline-audit

## Purpose
Audit the signal pipeline for purity, determinism, correct output contracts, and UI wiring.

## When to Use
- After adding or modifying signals
- When signal scores look wrong in the UI
- Before a release that touches intelligence features

## Claude Code Prompt

```text
Audit the Aurox signal pipeline.

Check packages/signals/:
1. Are all signal functions pure? (no DB calls, no network calls, no hidden state)
2. Do all signals return the canonical SignalOutput contract?
   { score: number (-1 to +1), confidence: number (0 to 1), explanation: string }
3. Are signal weights and aggregation formulas deterministic?
4. Is there any random() or Date.now() inside signal calculation?
5. Are edge cases handled: missing data, zero volume, NaN, Infinity?

Check packages/forecasting/:
6. Same purity check
7. Are forecasts bounded and explained?

Check apps/web signal wiring:
8. Are signal scores passed as read model values, not recomputed in components?
9. Are signal explanations surfaced in UI?
10. Are confidence scores displayed or used for conditional rendering?

Report:

Signal Pipeline Audit
=====================
Purity violations:
- File: <path>
  Issue: <DB/network call in pure package>

Contract violations:
- File: <path>
  Issue: <wrong output shape>

Non-determinism detected:
- ...

UI wiring issues:
- ...

Missing edge case handling:
- ...

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/forecasting test
```

## Expected Output
Per-signal purity and contract compliance report.

## Safety Notes
- Never add I/O to packages/signals or packages/forecasting.
- Signal output must never override risk decisions.
