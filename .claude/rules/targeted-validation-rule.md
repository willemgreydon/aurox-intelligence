# Targeted Validation Rule

## Purpose
Run the narrowest meaningful verification for each change. Do not run unrelated checks and report them as failures for changed code. Separate changed-package failures from known baseline failures.

## Applies To
- All development workflows
- Pre-push checks
- CI-equivalent manual verification

## Rule
For every change, determine the affected packages and run only those checks:

| Changed Area | Minimum Verification |
|---|---|
| `packages/api-contracts` | `pnpm --filter @repo/api-contracts typecheck` |
| `packages/db` | `pnpm --filter @repo/db typecheck` + `node packages/db/scripts/migrate.mjs` |
| `packages/providers` | `pnpm --filter @repo/providers typecheck` + `pnpm --filter @repo/providers test` |
| `packages/signals` | `pnpm --filter @repo/signals typecheck` + `pnpm --filter @repo/signals test` |
| `packages/forecasting` | `pnpm --filter @repo/forecasting typecheck` + `pnpm --filter @repo/forecasting test` |
| `packages/agents` | `pnpm --filter @repo/agents typecheck` + `pnpm --filter @repo/agents test` |
| `apps/web` routes | `pnpm build:web` |
| `apps/web` server actions | `pnpm build:web` |
| Multiple packages | Run all affected packages |

Reporting format (always use this):
```text
Checks run:
- pnpm --filter @repo/signals typecheck: PASS

Checks not run:
- pnpm --filter @repo/db typecheck (not changed)

Failures:
- none

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts — pre-existing typing issue (CLAUDE.md §4)
```

## Forbidden
- Claiming all checks passed when some were not run
- Running full `pnpm typecheck` and attributing the auth baseline failure to current changes
- Skipping typecheck for changed packages because "it's a small change"
- Reporting a test failure without identifying whether it's new or pre-existing

## Required Pattern
```bash
# Changed packages/signals:
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
# → report results

# Did NOT change packages/db — do not run and do not report as failure
```

## Validation
```bash
# Determine which packages changed
git diff --name-only HEAD~1

# Run filter for each changed package
pnpm --filter @repo/<changed-package> typecheck
pnpm --filter @repo/<changed-package> test
```

## Good Example
```text
Changed: packages/signals/src/momentum.ts
Checks run: pnpm --filter @repo/signals typecheck → PASS
Checks run: pnpm --filter @repo/signals test → PASS
Not run: agents, db, providers (not changed)
Known baseline: auth service.test.ts (unrelated)
```

## Bad Example
```text
Ran pnpm typecheck (full) — found 1 error in apps/web/server/auth/service.test.ts
This is a regression introduced by my changes.
```
(Incorrect — the auth error is a known pre-existing baseline, unrelated to signal changes.)

## Safety Notes
Misattributing a known baseline failure as a new regression causes wasted investigation time. More dangerously, incorrectly marking a real new failure as "pre-existing" can ship broken execution code. Always separate known baseline from introduced failures.
