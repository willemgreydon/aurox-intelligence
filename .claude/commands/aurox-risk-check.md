# /aurox-risk-check

Review current changes for financial, execution, simulation, and live-trading risk.

## Check

- Is simulation deterministic?
- Is accounting correct?
- Are order states explicit?
- Is risk validation mandatory?
- Can live execution accidentally activate?
- Are broker calls isolated?
- Are failures safe?
- Is idempotency preserved?
- Are portfolio mutations auditable?
- Are tests sufficient?

## Output

```text
Risk Check Result:
PASS / BLOCKED / NEEDS CHANGES

Critical Blockers:
- ...

Warnings:
- ...

Required Fixes:
- ...

Suggested Tests:
- ...
```
