# /execution-boundary-check

## Purpose
Verify that execution logic is properly isolated in packages/agents/ and not leaking into routes, UI, or services.

## When to Use
- After adding trade submission to a new route or component
- When reviewing a PR that touches execution paths
- When auditing for boundary violations

## Claude Code Prompt

```text
Audit execution boundary enforcement in Aurox.

Rule: All execution logic (order submission, broker calls, position sizing, execution validation) must live in packages/agents/. It must never exist in apps/web routes, components, or services.

Check apps/web/ for:
1. Direct order submission logic in route handlers
2. Broker API calls in server actions
3. Position sizing math in components
4. Execution validation logic in services
5. Hard-coded execution modes

Check packages/agents/ is:
6. The single point of entry for trade execution
7. Using risk checks before any order submission
8. Routing to simulation by default

Check packages/db/:
9. Are simulation order writes called only from agents (not from routes)?

Report:

Execution Boundary Check
=========================
Violations:
- File: <path>
  Issue: <execution logic outside packages/agents/>
  Fix: <move to agents package>

Clean paths:
- packages/agents/ — entry point for execution: ✓ / ✗

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/agents typecheck
pnpm build:web
```

## Expected Output
List of any execution logic outside packages/agents/ with specific moves needed.

## Safety Notes
- Execution logic in routes or UI is a critical architecture violation.
