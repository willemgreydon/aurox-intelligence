# /rollback-plan

## Purpose
Generate a rollback plan for a specific change in case it needs to be reverted post-deployment.

## When to Use
- Before merging any DB migration
- Before enabling a new execution path
- Before any change to risk or simulation accounting

## Claude Code Prompt

```text
Generate a rollback plan for the current changes.

Context: [USER PROVIDES: what was changed, e.g. "added simulation_snapshots table migration"]

For the changes, determine:

1. Is this change reversible?
   - Code changes: YES (revert commit)
   - DB migrations: depends on migration type

2. DB migration rollback:
   - Is the migration additive (new table/column)? → DROP TABLE / DROP COLUMN
   - Is it destructive (dropped column/table)? → Cannot rollback without backup
   - Is it data-transforming? → Need inverse transform script

3. Rollback steps:
   - Step-by-step git revert or forward-fix
   - DB rollback SQL if needed
   - Cache invalidation steps if needed
   - Feature flag if one was used

4. Impact of rollback:
   - What data/state is lost?
   - Which users are affected?
   - Are there downstream dependencies?

Report:

Rollback Plan
=============
Change type: code / migration / config
Reversibility: EASY / COMPLEX / IRREVERSIBLE

Rollback steps:
1. git revert <commit> or git reset
2. [DB rollback SQL if needed]:
   ALTER TABLE ... DROP COLUMN ...
3. [Cache/state cleanup if needed]

State impact:
- Data lost: <description or none>
- Users affected: <description>

Recommended: Test rollback in staging before production
```

## Validation Commands
```bash
git log --oneline -5
```

## Expected Output
Specific rollback steps with SQL if applicable and clear impact statement.

## Safety Notes
- Irreversible migrations must be flagged clearly before merging.
- Never rollback a DB migration that has user data without a backup strategy.
