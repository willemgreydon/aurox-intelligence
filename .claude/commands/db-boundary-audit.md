# /db-boundary-audit

## Purpose
Verify that all database access is isolated inside packages/db/ with no SQL leaking to other packages.

## When to Use
- After adding a new data access pattern
- When reviewing a PR that touches data persistence
- When auditing for raw SQL outside packages/db

## Claude Code Prompt

```text
Audit the Aurox database boundary enforcement.

Rule: All SQL queries, Postgres connections, and repository calls must live in packages/db/. No SQL or Postgres driver usage in routes, services, components, agents, or providers.

Check:
1. Search apps/web/ for postgres driver imports or raw SQL strings
2. Search packages/agents/ for direct DB calls
3. Search packages/providers/ for DB calls
4. Search packages/signals/ for DB calls
5. Verify packages/db/src/ is the only place using the postgres driver

Check packages/db/:
6. Are all repositories using parameterized queries?
7. Are transactions used for multi-table mutations?
8. Are migrations additive (not destructive)?

Report:

DB Boundary Audit
=================
Violations:
- File: <path>
  Issue: SQL / postgres driver outside packages/db/
  Fix: Move to packages/db/ repository

SQL injection risks:
- Any string interpolation in queries: YES (CRITICAL) / NO

Migration safety:
- Destructive migrations without explicit note: YES / NO

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/db typecheck
node packages/db/scripts/migrate.mjs
```

## Expected Output
Complete list of DB boundary violations with specific file locations.

## Safety Notes
- SQL outside packages/db is always a boundary violation.
- String-interpolated SQL is a critical security issue.
