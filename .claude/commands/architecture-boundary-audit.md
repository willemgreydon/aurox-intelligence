# /architecture-boundary-audit

## Purpose
Audit all package boundaries for violations of the Aurox architecture contract.

## When to Use
- Before a major PR
- After a large feature addition
- When onboarding a new contributor

## Claude Code Prompt

```text
Perform a comprehensive Aurox architecture boundary audit.

Check each boundary rule:

1. packages/api-contracts — is it the single source of truth for shared Zod schemas?
   - Are there duplicate schemas defined locally in apps/web?
   - Are contracts being forked instead of imported?

2. packages/db — is all SQL isolated here?
   - Any raw SQL in apps/web routes or services?
   - Any Postgres calls from agents or providers?

3. packages/providers — are all external API calls here?
   - Any fetch() to provider URLs in apps/web or agents?
   - Any provider SDK imports outside this package?

4. packages/signals and packages/forecasting — are they pure?
   - Any DB or network calls in these packages?
   - Any side effects?

5. packages/agents — is execution isolated here?
   - Any order submission logic in apps/web routes?
   - Any broker calls from UI components?

6. apps/web — is it UI + orchestration only?
   - Any domain math in components?
   - Any PnL calculation in React?

Report:

Architecture Boundary Audit
============================
Boundary violations:
- Package boundary: <name>
  File: <path>
  Issue: <description>
  Fix: <move/refactor>

Clean boundaries:
- packages/api-contracts: ✓ / violations
- packages/db: ✓ / violations
- packages/providers: ✓ / violations
- packages/signals: ✓ / violations
- packages/forecasting: ✓ / violations
- packages/agents: ✓ / violations
- apps/web: ✓ / violations

Priority fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/agents typecheck
```

## Expected Output
Per-package boundary compliance with specific violations listed.

## Safety Notes
- Boundary violations are architecture debt. Flag all of them even if not immediately fixable.
