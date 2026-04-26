# Repository Transaction Rule

## Purpose
Any write that touches multiple tables must use a database transaction. This is non-negotiable in simulation and execution flows where partial writes produce irrecoverable accounting errors.

## Applies To
- `packages/db/src/repositories/`
- All simulation write operations
- All order, transaction, and position mutations

## Rule
Multi-table writes must be wrapped in a Postgres transaction.

Critical atomic units in the simulation system:

| Operation | Tables that must be atomic |
|---|---|
| Submit order | `simulation_orders` + `simulation_transactions` + `simulation_positions` + `simulation_accounts` |
| Fill order | `simulation_orders` (status update) + `simulation_transactions` + `simulation_positions` |
| Reset account | `simulation_accounts` + `simulation_portfolios` + `simulation_positions` (archive, not delete) |
| Snapshot | `simulation_snapshots` (must read and write consistently) |

Transaction pattern with raw `postgres` driver:
```ts
await db.begin(async (tx) => {
  await tx`UPDATE app.simulation_accounts SET cash_balance = ${newBalance} WHERE id = ${accountId}`
  await tx`INSERT INTO app.simulation_transactions ...`
  await tx`UPDATE app.simulation_positions ...`
})
```

## Forbidden
- Sequential `await db\`INSERT...\`` calls without a transaction wrapper when they must be atomic
- Partial order submissions (order inserted but transaction not logged)
- Position updates without a matching transaction record
- Catching transaction errors and silently continuing
- Rolling back by manually reversing individual inserts outside a transaction

## Required Pattern
```ts
// packages/db/src/repositories/simulation-order-repository.ts
export async function submitSimulationOrder(input: SimulationOrderInput): Promise<SimulationOrder> {
  return db.begin(async (tx) => {
    const [order] = await tx`INSERT INTO app.simulation_orders ... RETURNING *`
    await tx`INSERT INTO app.simulation_transactions ...`
    await tx`UPDATE app.simulation_positions ...`
    await tx`UPDATE app.simulation_accounts SET cash_balance = ${input.newBalance} WHERE id = ${input.accountId}`
    return order
  })
}
```

## Validation
```bash
pnpm --filter @repo/db typecheck
grep -r "db\.begin\|\.begin(" packages/db/src/repositories --include="*.ts"
grep -r "simulation_orders" packages/db/src --include="*.ts" | grep -v "begin"
```

## Good Example
```ts
await db.begin(async (tx) => {
  await tx`INSERT INTO app.simulation_orders VALUES (...)`
  await tx`INSERT INTO app.simulation_transactions VALUES (...)`
  await tx`UPDATE app.simulation_positions SET quantity = ${qty} WHERE ...`
})
// ✓ All three tables updated atomically
```

## Bad Example
```ts
await db`INSERT INTO app.simulation_orders VALUES (...)`
await db`INSERT INTO app.simulation_transactions VALUES (...)`
// crash or error here
await db`UPDATE app.simulation_positions SET quantity = ${qty} WHERE ...`
// ✗ If crash occurs, order exists but position was never updated — portfolio is broken
```

## Safety Notes
A partial write to `simulation_orders` without matching `simulation_transactions` creates phantom trades. The portfolio shows the wrong cash balance and position value. In a future live execution path, this is the same pattern that causes actual capital loss.
