# Aurox Testing & Verification Rules

## Purpose
Verification must be targeted, honest, and explicitly reported. Never claim tests passed if they were not run. Separate changed-code failures from known baseline failures.

## Applies To
- All development workflows
- All verification and reporting

## Rule
For changed packages, run the narrowest meaningful check first:

```bash
pnpm --filter @repo/<changed-package> typecheck
pnpm --filter @repo/<changed-package> test
```

For contract changes:
```bash
pnpm --filter @repo/api-contracts typecheck
```

For DB changes:
```bash
node packages/db/scripts/migrate.mjs
pnpm --filter @repo/db typecheck
```

For web route/action changes:
```bash
pnpm build:web
```

For full pre-push sweep:
```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/agents typecheck
pnpm test
pnpm lint
pnpm build:web
```

## Reporting Format
Always use this exact format:

```text
Checks run:
- pnpm --filter @repo/<package> typecheck: PASS / FAIL
- pnpm --filter @repo/<package> test: PASS / FAIL
- pnpm build:web: PASS / FAIL

Checks not run:
- <package>: reason (not changed / deferred)

Failures:
- <none> or <description>

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts — pre-existing typing issue (CLAUDE.md §4)
```

## Forbidden
- Claiming "all tests pass" when `pnpm test` was not run
- Running `pnpm typecheck` (full) and attributing the auth baseline failure to current changes
- Skipping typecheck for execution or simulation packages because the change "looks small"
- Reporting checks as not applicable when they are relevant to the changed code

## Validation
Commands themselves are the validation. Always run before reporting.

## Good Example
```text
Checks run:
- pnpm --filter @repo/signals typecheck: PASS
- pnpm --filter @repo/signals test: PASS (12 tests)
Checks not run: agents, db, providers (not modified in this session)
Known baseline: auth service.test.ts (pre-existing per CLAUDE.md §4)
```

## Bad Example
```text
"All checks passed" — but only pnpm lint was run, not typecheck or test
```

## Safety Notes
Unreported check failures can ship broken execution code. A signal package typecheck failure that is not reported means incorrect types may have entered the execution pipeline undetected. Honest, explicit reporting of what was and was not verified is a safety requirement.
