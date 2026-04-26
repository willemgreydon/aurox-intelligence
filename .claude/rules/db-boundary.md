# DB Boundary Rule

## Purpose
All database access — SQL queries, repositories, migrations, and transactions — must live exclusively in `packages/db`. No other package or app may write SQL or import the Postgres driver directly.

## Applies To
- `packages/db/`
- `apps/web/server/`
- `apps/worker/`
- `packages/agents/`
- Any file that touches persisted state

## Rule
`packages/db` is the single source of truth for:
- Raw SQL queries
- Repository functions
- Database migrations (in `packages/db/src/migrations/`)
- Transaction wrappers
- Read model persistence

The Postgres driver (`postgres` package) must only be imported inside `packages/db`.

Migration runner:
```bash
node packages/db/scripts/migrate.mjs
```

## Forbidden
- `import postgres from "postgres"` outside `packages/db`
- SQL template literals (`` sql`...` ``) outside `packages/db`
- Raw `SELECT`, `INSERT`, `UPDATE`, `DELETE` strings outside `packages/db`
- Calling `db.query()` from `apps/web/app/**` routes
- Calling `db.query()` from `packages/signals` or `packages/forecasting`
- Creating migration files outside `packages/db/src/migrations/`
- Using an ORM unless explicitly approved (system uses raw Postgres)

## Required Pattern
```text
packages/db repository
  → exports typed async function (e.g. getSimulationOrder)
  → apps/web server query imports that function
  → service orchestrates queries
  → route receives view model
```

## Validation
```bash
grep -r "import postgres\|from 'postgres'\|from \"postgres\"" packages/signals packages/forecasting packages/providers apps/web/app apps/web/components --include="*.ts"
grep -r "sql\`" apps/web/app apps/web/components --include="*.ts" --include="*.tsx"
pnpm --filter @repo/db typecheck
node packages/db/scripts/migrate.mjs
```

## Good Example
```ts
// packages/db/src/repositories/simulation-orders.ts
export async function getSimulationOrder(id: string): Promise<SimulationOrder | null> {
  const rows = await db`SELECT * FROM app.simulation_orders WHERE id = ${id} LIMIT 1`
  return rows[0] ?? null
}
```

```ts
// apps/web/server/queries/simulation-query.ts
import { getSimulationOrder } from "@repo/db"
// ✓ Query layer uses repository — correct boundary
```

## Bad Example
```ts
// apps/web/app/invest/page.tsx
import postgres from "postgres"
const db = postgres(process.env.DATABASE_URL!)
const order = await db`SELECT * FROM app.simulation_orders WHERE id = ${id}`
// ✗ Route contains SQL — critical boundary violation
```

## Safety Notes
SQL in routes bypasses repository-level transaction safety. A partially applied write to simulation_orders without a matching simulation_transactions entry creates an irrecoverable accounting inconsistency. All DB access must be transactional where atomicity is required.
