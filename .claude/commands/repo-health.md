# /repo-health

## Purpose
Full repo health sweep: packages, boundaries, types, tests, and build status.

## When to Use
- First thing in a new session
- Before starting a large feature
- After pulling a fresh branch
- When something feels broken but you don't know where

## Claude Code Prompt

```text
Run a complete Aurox repo health check.

Steps:
1. Check pnpm install status (node_modules present, lockfile clean)
2. Run typecheck for each package boundary:
   - pnpm --filter @repo/api-contracts typecheck
   - pnpm --filter @repo/db typecheck
   - pnpm --filter @repo/providers typecheck
   - pnpm --filter @repo/signals typecheck
   - pnpm --filter @repo/forecasting typecheck
   - pnpm --filter @repo/agents typecheck
3. Run pnpm lint
4. Run pnpm test
5. Check git status for uncommitted changes
6. Check for .env presence

Report in this format:

Aurox Repo Health Report
========================
Packages typechecked: PASS / FAIL (list failures)
Lint: PASS / FAIL
Tests: PASS / FAIL (list failures)
Git status: clean / dirty (list files)
Env: present / missing

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts typing issue is a known baseline

Recommended next steps:
- ...
```

## Validation Commands
```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm lint
pnpm test
git status
```

## Expected Output
Structured pass/fail report per package with clear separation of introduced vs baseline failures.

## Safety Notes
- Read-only audit. No mutations.
- Never claim all-clear if typecheck was not run.
- Separate known baseline failures from new failures.
