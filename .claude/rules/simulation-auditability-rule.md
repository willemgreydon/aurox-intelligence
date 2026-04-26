# Simulation Auditability Rule

## Purpose
Every simulation action must leave a complete, immutable audit trail. Orders, transactions, and position changes must be traceable to their origin. Nothing may be silently updated without a logged reason.

## Applies To
- `packages/db/src/repositories/`
- `packages/agents/src/workflows/`

## Rule
Audit trail requirements:

Every `simulation_orders` record must have:
- `created_at` timestamp
- `account_id` reference
- `execution_mode` field
- `source` field (`"manual"`, `"assisted"`, `"autonomous"`)
- If filled: `filled_at`, `fill_price`
- If rejected: `rejected_reason`, `rejected_at`

Every `simulation_transactions` record must have:
- Linked `order_id`
- `type` (`"buy"`, `"sell"`, `"fee"`, `"deposit"`, `"withdrawal"`)
- Pre-transaction and post-transaction cash balance
- `created_at` timestamp

Every `simulation_positions` change must be traceable to a `simulation_transactions` record.

Portfolio snapshots (`simulation_snapshots`) must be taken:
- After every order fill
- On a scheduled interval (configurable, default: daily)
- After account reset operations

Audit records must be:
- **Never deleted** (use soft-delete or archive pattern)
- **Never mutated** (append-only for transactions)
- **Readable** without joining more than 2 tables for common audit queries

## Forbidden
- Updating `simulation_accounts.cash_balance` without a corresponding `simulation_transactions` record
- Deleting orders or transactions to "clean up" test data
- Resetting a simulation account by truncating tables (must archive)
- Position updates without traceable transaction
- Orders without a `source` field

## Required Pattern
```ts
// packages/db/src/repositories/simulation-account-repository.ts
export async function archiveSimulationAccount(accountId: string): Promise<void> {
  await db.begin(async (tx) => {
    // Archive, not delete
    await tx`UPDATE app.simulation_accounts SET archived_at = NOW() WHERE id = ${accountId}`
    await tx`INSERT INTO app.simulation_account_archive SELECT * FROM app.simulation_orders WHERE account_id = ${accountId}`
    // Log the reset as a system event
    await tx`INSERT INTO app.simulation_events (account_id, event_type, created_at) VALUES (${accountId}, 'account_archived', NOW())`
  })
}
```

## Validation
```bash
grep -r "DELETE FROM app\." packages/db/src --include="*.ts" --include="*.sql"
grep -r "TRUNCATE" packages/db/src --include="*.ts" --include="*.sql"
grep -r "archived_at\|soft.delete\|archive" packages/db/src --include="*.ts"
pnpm --filter @repo/db typecheck
```

## Good Example
```ts
// Archive rather than delete
await tx`UPDATE app.simulation_orders SET archived_at = NOW() WHERE id = ${id}`
// ✓ Record preserved, archived state is visible
```

## Bad Example
```ts
await db`DELETE FROM app.simulation_orders WHERE account_id = ${accountId}`
// ✗ Permanently destroys audit trail — irreversible, violates auditability requirement
```

## Safety Notes
Deleted simulation records mean you cannot reconstruct what happened when PnL is wrong. In future live execution contexts, deleting execution records is a financial compliance violation. The simulation system must be built to the same auditability standard as the live system.
