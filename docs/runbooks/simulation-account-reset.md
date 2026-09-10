# Runbook: Simulation Account Reset / Archive (Audit-Safe)

Reset a simulation account to its initial state **without destroying the audit
trail**. The cardinal rule: reset means **archive / soft-close**, never `DELETE`
or `TRUNCATE`. Every reset must leave a traceable record and a snapshot of the
pre-reset state.

Related:
[`.claude/rules/simulation-auditability-rule.md`](../../.claude/rules/simulation-auditability-rule.md),
[`.claude/rules/repository-transaction-rule.md`](../../.claude/rules/repository-transaction-rule.md),
[`.claude/rules/snapshot-consistency-rule.md`](../../.claude/rules/snapshot-consistency-rule.md),
[`docs/SIMULATION_ENGINE.md`](../SIMULATION_ENGINE.md).

## Symptoms / Trigger

- A user requests a fresh start for their simulation account.
- A simulation account is in a bad/runaway state and must be flattened (e.g. as
  part of containment — see [kill-switch-activation.md](./kill-switch-activation.md)).
- QA / demo accounts need re-seeding.

## Severity

- **SEV-3** for a routine user-requested reset.
- **SEV-1** if you are tempted to "clean up" by deleting rows — stop. Deleting
  simulation orders/transactions is an auditability violation and is forbidden.

## Preconditions

- The target `userId` (resets are user-scoped; never run an unscoped reset).
- Database configured and reachable (`DATABASE_URL` set). The repository asserts
  configuration via `assertDatabaseConfigured`.
- For bulk/operational resets, repo-owner awareness.

## How the implemented reset behaves (audit-safe)

The canonical reset is `resetSimulationAccount(userId)` in
[`packages/db/src/repositories/simulated-trading-repository.ts`](../../packages/db/src/repositories/simulated-trading-repository.ts).
It runs inside a single `client.transaction(...)` and does the following — note
that it is **append-only / soft-close**, never destructive:

1. Ensures the account exists and reads its `initialCashBalance`.
2. **Soft-closes open positions**: `update simulation_positions set quantity = 0,
   closed_at = now, updated_at = now where quantity > 0`. Rows are **not deleted**
   — the position history remains, marked closed.
3. Resets the account cash to `initialCashBalance` and `realized_pnl = 0`.
4. **Writes a `reset` transaction record** (`transaction_type = 'reset'`,
   description `"Simulation account reset"`) so the reset itself is in the audit
   trail.
5. **Captures a snapshot** via `captureSnapshot(...)` at the end of the
   transaction, recording the post-reset consistent state.

Related variants in the same repository:

- `resetSimulationCashBalance(userId)` — resets cash only, logs a `reset`
  transaction, captures a snapshot. Positions untouched.
- `closeAllSimulationPositions(userId)` — flattens positions at execution price
  with full transaction records (does not reset cash to initial).

The user-facing **Emergency Stop** button (`emergencyStopAction()` in
[`broker-mode-actions.ts`](../../apps/web/server/actions/broker-mode-actions.ts))
calls `resetSimulationAccount` and revalidates the invest/dashboard paths.

> **Snapshot-before-reset note:** the implemented `resetSimulationAccount`
> captures the snapshot **after** mutating state (i.e. a post-reset snapshot, plus
> the `reset` transaction marking the boundary). If you need an explicit
> **pre-reset** snapshot of the live portfolio before zeroing it, capture one
> first (step 1 below) — this is the safest practice and is recommended for any
> non-routine or operator-initiated reset.

## Step-by-step actions

1. **(Recommended) Capture a pre-reset snapshot.** Before resetting, ensure the
   current portfolio state is snapshotted so the pre-reset position values are
   preserved independently of the `reset` transaction. The scheduled snapshot
   helper `captureSimulationSnapshotsForAllAccounts()` (same repository) or a
   targeted capture covers this. For a single account, confirm a recent snapshot
   exists for that `userId` (see verification query below).

2. **Run the reset through the repository function — never raw SQL.** Resets must
   go through `resetSimulationAccount` so the transaction, soft-close, `reset`
   transaction record, and snapshot all happen atomically. Operationally this is
   triggered by the user via Emergency Stop, or by an operator invoking the
   repository function from a server action / maintenance script. Do **not** issue
   ad-hoc `DELETE`/`TRUNCATE` or direct `UPDATE` against the simulation tables.

3. **Confirm the operation was scoped to the intended `userId`.** Resets are
   user-scoped; a missing scope is a critical defect.

## Verification

1. **Reset transaction exists** (the boundary marker):
   ```sql
   select id, transaction_type, description, created_at
   from app.simulation_transactions
   where account_id = (
     select id from app.simulation_accounts a
     join app.simulation_portfolios p on p.account_id = a.id
     where a.user_id = '<USER_ID>'
   )
   and transaction_type = 'reset'
   order by created_at desc
   limit 1;
   ```

2. **Positions are soft-closed, not deleted** (history preserved):
   ```sql
   select count(*) filter (where quantity = 0 and closed_at is not null) as closed,
          count(*)                                                       as total
   from app.simulation_positions
   where portfolio_id = '<PORTFOLIO_ID>';
   ```
   `total` should be unchanged from before the reset; previously-open rows now show
   `closed`.

3. **Cash restored** to `initial_cash_balance` and `realized_pnl = 0` on
   `app.simulation_accounts`.

4. **Snapshot recorded** for the account around the reset time in
   `app.simulation_snapshots`.

5. **No destructive SQL was used.** Grep your change/maintenance scripts:
   ```bash
   grep -rn "DELETE FROM app\.\|TRUNCATE" packages/db/src apps/web/server
   ```
   This must return nothing for the simulation tables.

## Rollback / Recovery

A reset is intentionally **not silently reversible** — that is the point of the
audit trail. To reconstruct or undo:

1. The pre-reset state is recoverable from the snapshot history
   (`app.simulation_snapshots`) and the immutable transaction log
   (`app.simulation_transactions`), since nothing was deleted.
2. If a reset was run in error, restore by replaying from the last good snapshot
   plus the transaction history, or restore the affected rows from a database
   backup (see [db-migration.md](./db-migration.md) for backup/restore posture).
3. Never "fix" a bad reset by deleting the `reset` transaction record — append a
   correcting transaction instead.

## Post-incident follow-up

- If an operator performed the reset, record who, when, which `userId`, and why.
- If the reset was part of incident containment, link it from the incident report.
- If a pre-reset snapshot was missing, add an explicit pre-reset snapshot step to
  any operator tooling so future resets always snapshot before mutating.
- Verify no code path attempted `DELETE`/`TRUNCATE` on simulation tables; if found,
  open a **SEV-1** auditability task.
