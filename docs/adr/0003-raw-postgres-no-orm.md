# ADR 0003: Raw Postgres, no ORM

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

The persistence layer underpins a financial ledger: simulation accounts, portfolios, positions,
orders, transactions, and snapshots. Accounting correctness depends on precise numeric types,
explicit transactions, and `FOR UPDATE` locking semantics. We need full control over SQL, exact
`NUMERIC` precision, and predictable transaction boundaries. ORMs abstract these away and can
generate surprising queries, hide N+1 patterns, coerce `NUMERIC` to floating point, and obscure
locking behavior — all unacceptable when partial or imprecise writes corrupt the ledger.

The system must also boot without a database (stub client) so the app degrades gracefully when
`DATABASE_URL` is absent.

## Decision

Use raw Postgres through the `postgres` driver. No ORM unless explicitly approved.

- All SQL, repositories, migrations, and transaction wrappers live exclusively in `packages/db`.
  The `postgres` driver is imported nowhere else.
- App tables live in the `app` schema. Migrations are plain SQL applied via
  `packages/db/scripts/migrate.mjs`; additive changes are preferred and destructive migrations
  require an explicit rollback note.
- Prices and money are stored at canonical precision (`NUMERIC(18,8)`), never as JavaScript floats.
  Financial arithmetic (PnL, cost basis, position value) is computed in Postgres, not re-derived in
  application code.
- Multi-table writes that must be atomic (order + transaction + position + account balance) are
  wrapped in a single `db.begin(...)` transaction, using `FOR UPDATE` where state transitions must
  be serialized.
- If `DATABASE_URL` is missing, the system still boots via a safe stub client.

## Consequences

**Positive**

- Full control over SQL, numeric precision, locking, and transaction boundaries — exactly what
  ledger correctness requires.
- No hidden query generation, no ORM-driven N+1 surprises, no float coercion of money values.
- Migrations are transparent, reviewable SQL with explicit rollback notes.
- One package owns persistence, so transaction safety and auditability are enforceable in one place.

**Negative**

- More boilerplate: repositories hand-write queries and mapping that an ORM would scaffold.
- No automatic schema/type generation; repository return types must be kept in sync with `app`
  schema by hand (anchored to `packages/api-contracts`).
- Easier to write an unsafe query (missing `FOR UPDATE`, non-atomic multi-write) if the transaction
  rules are not followed — the discipline is on the developer, backed by rules.

**Risks**

- SQL leaking outside `packages/db` (e.g. a route running `sql\`...\``) bypasses transaction safety
  and is a critical boundary violation; forbidden and grep-validated by the db-boundary rule.
- A multi-table write that skips the transaction wrapper can leave the ledger inconsistent (phantom
  trades); forbidden by the repository-transaction rule.

## Alternatives considered

- **Use an ORM (Prisma/Drizzle/TypeORM).** Rejected: loss of control over precision, locking, and
  generated SQL; risk of float coercion of monetary values; harder to audit exact queries.
- **Query builder without full ORM.** Rejected as default: still adds an abstraction layer over the
  SQL we want to read and review directly; not worth it for a ledger.
- **Application-layer accounting math.** Rejected: JavaScript float arithmetic diverges from
  `NUMERIC`, producing inconsistent PnL; accounting is computed in the DB (see
  portfolio-accounting rule).

## References

- [`../../.claude/rules/db-boundary.md`](../../.claude/rules/db-boundary.md)
- [`../../.claude/rules/repository-transaction-rule.md`](../../.claude/rules/repository-transaction-rule.md)
- [`../../.claude/rules/portfolio-accounting-rule.md`](../../.claude/rules/portfolio-accounting-rule.md)
- [`../../.claude/rules/order-lifecycle-rule.md`](../../.claude/rules/order-lifecycle-rule.md)
- [`../../.claude/rules/snapshot-consistency-rule.md`](../../.claude/rules/snapshot-consistency-rule.md)
- [`../../.claude/rules/rollback-notes-rule.md`](../../.claude/rules/rollback-notes-rule.md)
- [`../SIMULATION_ENGINE.md`](../SIMULATION_ENGINE.md), [`../database`](../database)
- Packages: [`packages/db`](../../packages/db) (migrations, `scripts/migrate.mjs`)
