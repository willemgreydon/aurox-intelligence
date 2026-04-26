# /release-readiness

## Purpose
Run a comprehensive release readiness check before any production deployment.

## When to Use
- Before merging to main
- Before deploying to production
- As part of a release review

## Claude Code Prompt

```text
Run a full Aurox release readiness check.

Execute and verify:

1. Build
   pnpm build:web → PASS required

2. TypeCheck (all packages)
   pnpm --filter @repo/api-contracts typecheck
   pnpm --filter @repo/db typecheck
   pnpm --filter @repo/providers typecheck
   pnpm --filter @repo/signals typecheck
   pnpm --filter @repo/forecasting typecheck
   pnpm --filter @repo/agents typecheck

3. Tests
   pnpm test

4. Lint
   pnpm lint

5. Security checks
   - No .env committed
   - No API keys in source
   - No hardcoded credentials

6. Architecture checks
   - No new boundary violations
   - No duplicate contracts

7. Financial safety checks
   - Simulation is default execution mode
   - Live execution is gated
   - Risk gates are intact
   - Kill switch is present

8. DB migration state
   - All migrations applied: YES / NO
   - Any pending destructive migration: YES (REVIEW) / NO

Report:

Release Readiness Report
========================
Build: PASS / FAIL
TypeCheck: PASS / FAIL (list failures)
Tests: PASS / FAIL (list failures)
Lint: PASS / FAIL
Security: PASS / FAIL
Architecture: PASS / FAIL
Financial safety: PASS / FAIL
DB migrations: CURRENT / PENDING

RELEASE READY: YES / NO

Blockers:
- ...

Known unrelated baseline:
- apps/web/server/auth/service.test.ts typing issue (pre-existing)
```

## Validation Commands
```bash
pnpm build:web
pnpm test
pnpm lint
pnpm typecheck
```

## Expected Output
Binary RELEASE READY: YES / NO with specific blockers listed.

## Safety Notes
- Release is blocked if any financial safety check fails.
- Never deploy with a weakened risk gate.
