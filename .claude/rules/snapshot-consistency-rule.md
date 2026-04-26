# Snapshot Consistency Rule

## Purpose
Portfolio snapshots capture total portfolio value, cash balance, and position values at a point in time. They must be consistent (taken within a single DB read transaction), never estimated, and stored with full metadata for later audit and backtesting.

## Applies To
- `packages/db/src/repositories/`
- `packages/agents/src/workflows/`

## Rule
A snapshot must capture:
```ts
type SimulationSnapshot = {
  id: string
  accountId: string
  snapshotAt: number          // Unix ms — time snapshot was taken
  cashBalance: number         // from simulation_accounts
  totalPositionValue: number  // Σ(position.quantity × price_at_snapshot_time)
  totalValue: number          // cash + totalPositionValue
  realizedPnl: number         // cumulative from transactions
  unrealizedPnl: number       // total - cost_basis
  positionCount: number
  source: "post_fill" | "scheduled" | "manual" | "pre_reset"
  pricesUsed: Record<string, number>  // { symbol: price } — for auditability
}
```

Snapshot consistency rules:
1. Must be taken within a DB transaction so all values are from the same consistent state
2. Prices used must be recorded alongside the snapshot
3. Must never use cached prices — use the latest price at snapshot time
4. Must record `source` to explain why the snapshot was taken
5. Must be immutable after creation

## Forbidden
- Snapshots assembled from separate DB calls (non-atomic)
- Snapshots that use different price timestamps for different positions
- Overwriting an existing snapshot (append-only)
- Taking a snapshot without recording which prices were used
- Computing `totalValue` in application code instead of DB

## Required Pattern
```ts
// packages/db/src/repositories/simulation-snapshot-repository.ts
export async function createPortfolioSnapshot(
  accountId: string,
  source: SnapshotSource
): Promise<SimulationSnapshot> {
  return await db.begin(async (tx) => {
    // All reads happen in the same transaction for consistency
    const [account] = await tx`SELECT cash_balance FROM app.simulation_accounts WHERE id = ${accountId}`
    const positions = await tx`SELECT * FROM app.simulation_positions WHERE account_id = ${accountId}`
    const quotes = await tx`SELECT symbol, price FROM app.market_quotes WHERE symbol = ANY(${positions.map(p => p.symbol)})`

    const pricesUsed: Record<string, number> = {}
    let totalPositionValue = 0
    for (const position of positions) {
      const quote = quotes.find(q => q.symbol === position.symbol)
      if (!quote) throw new SnapshotError(`Missing price for ${position.symbol}`)
      pricesUsed[position.symbol] = quote.price
      totalPositionValue += position.quantity * quote.price
    }
    const totalValue = account.cash_balance + totalPositionValue
    const [snapshot] = await tx`INSERT INTO app.simulation_snapshots (...) VALUES (...) RETURNING *`
    return snapshot
  })
}
```

## Validation
```bash
grep -r "simulation_snapshots" packages/db/src --include="*.ts" --include="*.sql"
grep -r "db\.begin\|transaction" packages/db/src/repositories --include="*.ts" | grep -i "snapshot"
pnpm --filter @repo/db typecheck
```

## Good Example
```ts
// Single transaction reads all snapshot data
return await db.begin(async (tx) => {
  const account = await tx`SELECT ...`
  const positions = await tx`SELECT ...`
  // all from same consistent state
  return buildSnapshot(account, positions, pricesUsed)
})
// ✓ Atomic snapshot — all values from one transaction
```

## Bad Example
```ts
const account = await db`SELECT cash_balance FROM app.simulation_accounts WHERE id = ${id}`
// ... other code runs here, prices change ...
const positions = await db`SELECT * FROM app.simulation_positions WHERE account_id = ${id}`
// ✗ Non-atomic — account and positions read at different moments, snapshot is inconsistent
```

## Safety Notes
An inconsistent snapshot can show a portfolio value that never actually existed. This corrupts backtesting results and makes PnL attribution impossible. In performance reporting, a bad snapshot is worse than no snapshot.
