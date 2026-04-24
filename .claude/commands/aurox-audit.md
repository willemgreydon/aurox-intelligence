# /aurox-audit

Perform an architecture audit of the current Aurox repository state.

## Task

Audit:

- monorepo boundaries
- package responsibilities
- web Query → Mapper → Service → Route → UI pattern
- provider isolation
- DB access isolation
- simulation integrity
- risk enforcement
- execution safety
- duplicate contracts
- UI domain leakage
- missing docs
- missing tests

## Output

Return:

```text
Aurox Architecture Audit

1. Executive Summary
2. Critical Issues
3. Boundary Violations
4. Simulation / Execution Risks
5. Provider / Data Pipeline Risks
6. UI / Read Model Issues
7. Missing Contracts
8. Recommended Fix Order
9. Safe Codex / Claude Prompt for Next Step
```
