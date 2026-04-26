# /forecast-pipeline-audit

## Purpose
Audit the forecasting pipeline for purity, explainability, and correct integration with the intelligence layer.

## When to Use
- After modifying forecasting logic
- When forecast outputs look wrong
- Before wiring forecasts into the recommendation engine

## Claude Code Prompt

```text
Audit the Aurox forecasting pipeline.

Check packages/forecasting/:
1. Are all forecast functions pure? (no DB, no network, no side effects)
2. Are forecast outputs bounded and explained?
3. Is there any overfitting risk (models fit to training data without out-of-sample validation)?
4. Are edge cases handled: no history, single bar, extreme values?
5. Are confidence intervals or uncertainty estimates included?
6. Is the explanation field populated with human-readable reasoning?

Check packages/ai-market-intelligence/ if present:
7. Are AI outputs treated as informational, not authoritative?
8. Are AI suggestions gated by the risk system before any execution?
9. Are AI confidence values propagated through to the recommendation?

Check integration in apps/web:
10. Are forecasts displayed with uncertainty/confidence visible to users?
11. Is language avoiding guaranteed return claims?

Report:

Forecast Pipeline Audit
========================
Purity violations:
- ...

Unbounded outputs:
- ...

Missing uncertainty estimates:
- ...

Explainability gaps:
- ...

AI safety issues:
- ...

UI language issues:
- ...

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/forecasting test
```

## Expected Output
Purity, explainability, and safety compliance report for forecasting.

## Safety Notes
- AI outputs are never execution permission.
- Forecasts must not override risk validation.
