# /typecheck-all

## Purpose
Run typecheck for every package boundary and report results clearly.

## When to Use
- After any multi-package change
- Before committing
- When TypeScript errors appear at runtime

## Claude Code Prompt

```text
Run TypeScript typecheck for all Aurox packages and report results.

Run each of these independently:
- pnpm --filter @repo/api-contracts typecheck
- pnpm --filter @repo/db typecheck
- pnpm --filter @repo/providers typecheck
- pnpm --filter @repo/signals typecheck
- pnpm --filter @repo/forecasting typecheck
- pnpm --filter @repo/agents typecheck

Do NOT run full apps/web typecheck as truth — it has a known baseline failure in
apps/web/server/auth/service.test.ts.

Report:

TypeCheck Results
=================
@repo/api-contracts: PASS / FAIL
@repo/db: PASS / FAIL
@repo/providers: PASS / FAIL
@repo/signals: PASS / FAIL
@repo/forecasting: PASS / FAIL
@repo/agents: PASS / FAIL

Failures (if any):
- Package: <name>
  Error: <message>
  File: <path>

Known unrelated baseline:
- apps/web auth service test typing issue is pre-existing

Recommended fixes:
- ...
```

## Validation Commands
```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/agents typecheck
```

## Expected Output
Per-package PASS/FAIL with error details for any failures.

## Safety Notes
- Read-only. No mutations.
- Never treat apps/web full typecheck as the source of truth.
