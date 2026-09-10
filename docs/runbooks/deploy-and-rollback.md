# Runbook: Deploy and Rollback

How to ship a change through the build/verify gate and how to roll back —
distinguishing **code rollback** (git revert) from **data rollback** (DB restore).

Related:
[`.claude/rules/pre-push-validation-rule.md`](../../.claude/rules/pre-push-validation-rule.md),
[`.claude/rules/targeted-validation-rule.md`](../../.claude/rules/targeted-validation-rule.md),
[`.claude/rules/rollback-notes-rule.md`](../../.claude/rules/rollback-notes-rule.md),
[`docs/production-deployment-checklist.md`](../production-deployment-checklist.md).

## Symptoms / Trigger

- A change is ready to ship.
- A recently shipped change is causing an incident and must be reverted.

## Severity

- Deploy itself: **SEV-4** (routine) unless it touches execution/risk/simulation
  or the live path, which raises it.
- Rollback in response to an incident: inherits the incident severity (often
  **SEV-1/SEV-2** — see [incident-response.md](./incident-response.md)).

## Preconditions

- Clean working tree (or intentionally staged changes).
- You are on a feature branch (do not commit directly to `main`; branch first).
- Know which packages changed so you can run targeted checks.

## Build / verify gate

Run the narrowest meaningful checks for the changed packages, then the build if
web changed. Package filters use the `@repo/<name>` convention; the web app is
`@repo/web` (so `pnpm build:web` ⇒ `@repo/web build`).

1. **Git status** — confirm intended changes only:
   ```bash
   git status
   ```

2. **Typecheck changed packages** (run only those you changed):
   ```bash
   pnpm --filter @repo/api-contracts typecheck
   pnpm --filter @repo/db typecheck
   pnpm --filter @repo/providers typecheck
   pnpm --filter @repo/signals typecheck
   pnpm --filter @repo/forecasting typecheck
   pnpm --filter @repo/agents typecheck
   ```

3. **Tests for changed packages:**
   ```bash
   pnpm --filter @repo/<changed-package> test
   ```

4. **Lint** (zero warnings is enforced — `--max-warnings=0`):
   ```bash
   pnpm lint
   ```

5. **Build the web app** if any `apps/web` files changed:
   ```bash
   pnpm build:web
   ```

### Known baseline (do not treat as a regression)

`apps/web/server/auth/service.test.ts` has a pre-existing typing inconsistency
(CLAUDE.md §4). Do **not** rely on a full `apps/web` typecheck as truth, and do
not attribute this failure to your change. Validate at package boundaries.

## Pre-push checklist

Report this before pushing (per
[`.claude/rules/pre-push-validation-rule.md`](../../.claude/rules/pre-push-validation-rule.md)):

```text
Pre-Push Verification
═════════════════════
Git status:                clean
TypeCheck (changed pkgs):  PASS
Tests (changed pkgs):      PASS
Lint:                      PASS
Build (if web changed):    PASS

Risk checklist:
- No risk gate removed or weakened:        YES
- Simulation accounting unchanged or tested: YES
- Live execution not enabled / default unchanged: YES
- No provider/broker secrets in code:      YES
- No .env committed:                       YES

PUSH SAFE: YES
```

Do not use `git push --no-verify`. Any failing changed-package check blocks the push.

## Step-by-step actions (deploy)

1. Run the build/verify gate above; resolve any changed-package failures.
2. Complete the pre-push checklist; confirm the risk checklist is all YES.
3. Commit on a feature branch and push.
4. If the change includes a DB migration, apply it per
   [db-migration.md](./db-migration.md) **before** the app code depending on it
   goes live (additive-first ordering).
5. Deploy the web app. Watch logs and the execution-adjacent screens
   (invest/portfolio) immediately after.

## Verification

1. `pnpm build:web` succeeded and the app boots.
2. Invest/portfolio pages render correct, fresh data (these are `force-dynamic`,
   user-scoped, never cached — see
   [`.claude/rules/next-cache-rule.md`](../../.claude/rules/next-cache-rule.md)).
3. No new error signatures in logs after deploy.
4. If a migration shipped, it is recorded in `app.schema_migrations` and
   `pnpm --filter @repo/db typecheck` passes.

## Rollback / Recovery

Pick the rollback path by **what** went wrong:

### Code rollback (logic/UI/behavior regression)

1. Identify the bad commit:
   ```bash
   git log --oneline -20
   ```
2. Revert it (creates an inverse commit; preserves history):
   ```bash
   git revert <commit-sha>
   ```
3. Re-run the build/verify gate, then redeploy.
4. For additive code changes this is low-risk and fully reversible.

### Data rollback (DB/schema/data corruption)

Code revert does **not** undo data changes.

1. **Additive migration:** ship the inverse as a new migration file (using the
   rollback comment) — see [db-migration.md](./db-migration.md). Do not hand-edit
   `app.schema_migrations` without also reversing the schema.
2. **Destructive migration or corrupted data:** restore from the DB backup
   recorded in the migration's rollback comment. There is no in-band undo — this
   is why destructive migrations require a confirmed backup before applying.
3. **Simulation state:** reconstruct from `app.simulation_snapshots` +
   `app.simulation_transactions` (append-only), never by deleting audit rows
   ([simulation-account-reset.md](./simulation-account-reset.md)).

### Combined regressions

If a deploy shipped both code and a migration, revert the code first to stop the
bleeding, then decide on the data path. If execution integrity is at risk, halt
first ([kill-switch-activation.md](./kill-switch-activation.md)) before either.

## Post-incident follow-up

- Record what was deployed, what broke, and which rollback path was used.
- If a baseline check was misattributed, re-confirm the known baseline in CLAUDE.md §4.
- If the regression touched signals/risk/simulation/gate logic, add the regression
  test that should have caught it.
- Produce a change summary
  ([`.claude/rules/change-summary-rule.md`](../../.claude/rules/change-summary-rule.md)):
  what changed, why, verification run, residual risks, follow-ups.
