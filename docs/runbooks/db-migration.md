# Runbook: Applying a Database Migration Safely

Aurox uses raw Postgres (no ORM) in schema `app`. Migrations are plain SQL files
applied by an idempotent runner. This runbook covers applying a migration safely:
additive-preferred, rollback-comment requirement, backup before any destructive
change, and verifying with the `@repo/db` typecheck.

Related:
[`.claude/rules/db-boundary.md`](../../.claude/rules/db-boundary.md),
[`.claude/rules/rollback-notes-rule.md`](../../.claude/rules/rollback-notes-rule.md),
[`.claude/rules/repository-transaction-rule.md`](../../.claude/rules/repository-transaction-rule.md),
[`docs/database/`](../database/).

## Symptoms / Trigger

- A new feature requires a schema change.
- A new migration file landed in
  [`packages/db/src/migrations/`](../../packages/db/src/migrations/) and must be
  applied to an environment.

## Severity

- **SEV-4** for an additive, reversible migration on a non-production DB.
- **SEV-2** for any migration against production.
- **SEV-1** for any **destructive** migration (drop column/table, irreversible
  data transform) — requires repo-owner sign-off and a confirmed backup.

## Preconditions

- Migration env vars set. The runner
  ([`packages/db/scripts/migrate.mjs`](../../packages/db/scripts/migrate.mjs))
  requires a **direct** (unpooled) connection and resolves the URL in this order:
  `DATABASE_URL_UNPOOLED` → `DIRECT_URL` → `DATABASE_URL`. Set one of these; the
  runner throws if none is present.
- The migration file follows naming/ordering conventions (numeric prefix; files
  are applied in sorted order, e.g. `0007_*.sql`).
- For destructive changes: a verified, recent backup and repo-owner sign-off.

## How the runner behaves (implemented)

`packages/db/scripts/migrate.mjs`:

1. Creates schema `app` and the tracking table `app.schema_migrations` if absent.
2. Reads `packages/db/src/migrations/*.sql`, sorted ascending by filename.
3. For each file **not already recorded** in `app.schema_migrations`, runs the
   file inside a transaction (`sql.begin`) and inserts the filename into
   `app.schema_migrations` in the same transaction.
4. Already-applied files are skipped — the runner is **idempotent**; re-running is
   safe and applies only new files.
5. Uses a single connection with `prepare: false`.

> Because each file runs in one transaction, a failing statement rolls back that
> file cleanly and the migration is **not** marked applied. Fix the file and re-run.

## Authoring rules (before you apply)

- **Additive preferred.** Prefer `ADD COLUMN` (nullable) / `CREATE TABLE` over
  drops. Backfills must be idempotent.
- **Rollback comment required** at the top of every migration
  ([`.claude/rules/rollback-notes-rule.md`](../../.claude/rules/rollback-notes-rule.md)):
  ```sql
  -- Migration: 0007_add_signal_source_to_orders.sql
  -- Rollback: ALTER TABLE app.simulation_orders DROP COLUMN signal_source;
  -- Reversibility: EASY — additive, nullable column
  ALTER TABLE app.simulation_orders ADD COLUMN signal_source varchar(50);
  ```
- **Destructive migrations** must carry an explicit warning and a backup/restore
  rollback note:
  ```sql
  -- ⚠️ DESTRUCTIVE — cannot be rolled back without a database backup
  -- Backup taken: <YYYY-MM-DD HH:MM UTC>  Rollback: restore from that backup
  ```
- **No SQL outside `packages/db`** — migrations live only in
  `packages/db/src/migrations/`.

## Step-by-step actions

1. **Review the migration file.** Confirm it has a rollback comment, is additive
   where possible, and touches only schema `app`. Confirm the filename sorts
   after the latest already-applied migration.

2. **Typecheck the db package** (catches repository/type drift from the schema change):
   ```bash
   pnpm --filter @repo/db typecheck
   ```

3. **For a destructive change only:** confirm a fresh backup exists and record its
   timestamp in the migration's rollback comment, and obtain repo-owner sign-off.
   Do not proceed otherwise.

4. **Apply the migration** with the direct connection set:
   ```bash
   node packages/db/scripts/migrate.mjs
   ```
   The runner prints `Applied migration <file>` for each newly applied file and
   skips already-applied ones. A non-zero exit means a file failed and was rolled
   back — fix and re-run.

5. **Re-run to confirm idempotency** (optional but recommended on shared envs):
   ```bash
   node packages/db/scripts/migrate.mjs
   ```
   It should apply nothing the second time.

## Verification

1. **Migration recorded:**
   ```sql
   select id, applied_at from app.schema_migrations order by applied_at desc limit 5;
   ```
   Your file should be present.

2. **Schema is as expected:** inspect the changed table
   (`\d app.<table>` in `psql`, or a targeted `select`).

3. **db typecheck passes** (repositories still align with the schema):
   ```bash
   pnpm --filter @repo/db typecheck
   ```

4. **If web reads/writes touch the changed tables,** verify the app build:
   ```bash
   pnpm build:web
   ```

## Rollback / Recovery

- **Additive migration:** apply the inverse from the rollback comment (e.g.
  `ALTER TABLE ... DROP COLUMN ...`) as a new follow-up migration file. Do not
  hand-delete the row from `app.schema_migrations` unless you also reverse the
  schema change — keep the tracking table and the actual schema in sync.
- **Failed mid-apply:** the per-file transaction already rolled back; the file is
  not recorded. Fix the SQL and re-run the runner.
- **Destructive migration:** there is no in-band rollback — **restore from the
  backup** recorded in the migration comment. This is why the backup + sign-off
  precondition is mandatory.

## Post-incident follow-up

- Update the relevant doc in [`docs/database/`](../database/) and any package
  README if the public schema/contract changed.
- If a new env var was introduced, add it to `.env.example`.
- If a destructive migration ran, confirm the backup/restore path was actually
  tested, and capture lessons in the change summary.
- If repository types drifted, ensure
  [`packages/api-contracts`](../../packages/api-contracts/) shared types were
  updated rather than forked locally.
