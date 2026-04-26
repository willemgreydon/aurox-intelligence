# Rollback Notes Rule

## Purpose
Any change to DB schema, execution paths, simulation accounting, or risk configuration must be accompanied by a rollback plan. Irreversible changes must be explicitly flagged before merging.

## Applies To
- `packages/db/src/migrations/`
- `packages/agents/`
- Any change to execution or risk configuration

## Rule
Rollback categories:

| Change Type | Reversibility | Rollback Method |
|---|---|---|
| Adding a column (nullable) | Easy | `ALTER TABLE ... DROP COLUMN` |
| Adding a table | Easy | `DROP TABLE IF EXISTS` |
| Dropping a column | Hard | Cannot recover without backup |
| Dropping a table | Irreversible | Cannot recover without backup |
| Data migration / backfill | Depends | Needs inverse transform |
| Execution mode default change | Easy | Revert commit |
| Risk threshold change | Easy | Revert commit |
| Broker adapter swap | Medium | Revert + re-test |

For every migration, include a rollback comment:
```sql
-- Migration: add simulation_snapshots_source_column
-- Rollback: ALTER TABLE app.simulation_snapshots DROP COLUMN source;
ALTER TABLE app.simulation_snapshots ADD COLUMN source VARCHAR(50) DEFAULT 'scheduled';
```

For destructive migrations:
```sql
-- ⚠️ DESTRUCTIVE MIGRATION — cannot be rolled back without a database backup
-- Ensure backup was taken before running this migration
-- Rollback: restore from backup taken at YYYY-MM-DD HH:MM UTC
DROP TABLE app.old_simulation_table;
```

## Forbidden
- Destructive migration without a clear warning comment
- Migration without any rollback note
- Claiming a destructive migration is "safe" without a backup strategy
- Shipping a risk config change without documenting what the change was from and to

## Required Pattern
```sql
-- Migration: 0042_add_signal_source_to_orders.sql
-- Rollback: ALTER TABLE app.simulation_orders DROP COLUMN signal_source;
-- Reversibility: EASY — additive column, nullable
ALTER TABLE app.simulation_orders ADD COLUMN signal_source VARCHAR(50);
```

For a code-level change:
```text
Rollback Plan (include in PR description):
- Change type: execution mode routing update
- Reversibility: EASY
- Rollback: git revert <commit-sha>
- Impact of rollback: none — simulation remains default, no data loss
```

## Validation
```bash
grep -r "-- Rollback:\|-- Reversibility:" packages/db/src/migrations --include="*.sql" --include="*.mjs"
git log --oneline -10
```

## Good Example
```sql
-- Rollback: ALTER TABLE app.simulation_positions DROP COLUMN last_signal_score;
ALTER TABLE app.simulation_positions ADD COLUMN last_signal_score NUMERIC(4,3);
-- ✓ Rollback is explicit, one-line, reversible
```

## Bad Example
```sql
ALTER TABLE app.simulation_orders DROP COLUMN legacy_mode;
-- ✗ No rollback note, destructive change, no backup strategy stated
```

## Safety Notes
A migration that drops a column in production without a backup cannot be undone. If that column held order source data and the migration runs during a trading session, all source attribution is permanently lost. Rollback plans are written before problems occur — not after.
