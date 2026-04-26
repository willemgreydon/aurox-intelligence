# /pre-push-check

## Purpose
Run the full pre-push verification checklist before pushing a branch.

## When to Use
- Before pushing any branch
- Before opening a PR
- After finishing a feature

## Claude Code Prompt

```text
Run the Aurox pre-push checklist.

Execute in order:

1. git status — are there any uncommitted changes?
2. pnpm --filter @repo/api-contracts typecheck
3. pnpm --filter @repo/db typecheck
4. pnpm --filter @repo/providers typecheck
5. pnpm --filter @repo/signals typecheck
6. pnpm --filter @repo/forecasting typecheck
7. pnpm --filter @repo/agents typecheck
8. pnpm test
9. pnpm lint
10. pnpm build:web

For changed packages only, also run:
- pnpm --filter @repo/<changed-package> test

Risk checklist:
- No risk gate removed or weakened?
- No simulation accounting changed without tests?
- No live execution enabled?
- No provider API keys in code?
- No .env file committed?

Report:

Pre-Push Check
==============
Git status: clean / dirty

TypeCheck:
- api-contracts: PASS / FAIL
- db: PASS / FAIL
- providers: PASS / FAIL
- signals: PASS / FAIL
- forecasting: PASS / FAIL
- agents: PASS / FAIL

Tests: PASS / FAIL
Lint: PASS / FAIL
Build: PASS / FAIL

Risk checklist:
- Risk gate intact: YES / NO
- Simulation accounting safe: YES / NO
- Live execution gated: YES / NO
- No secrets in code: YES / NO

PUSH SAFE: YES / NO

Blockers:
- ...
```

## Validation Commands
```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build:web
git status
```

## Expected Output
Full pass/fail checklist with clear PUSH SAFE verdict.

## Safety Notes
- Do not push if any risk-related check fails.
- Known baseline: apps/web/server/auth/service.test.ts typing issue is pre-existing.
