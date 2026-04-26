# App Orchestration Boundary Rule

## Purpose
`apps/web` is the orchestration and presentation layer only. It may call into domain packages but must not contain domain logic, SQL, provider calls, or execution math. The worker app has similar constraints.

## Applies To
- `apps/web/app/`
- `apps/web/components/`
- `apps/web/server/`
- `apps/worker/`

## Rule
`apps/web` orchestrates; it does not own domain logic.

Permitted in `apps/web`:
- Calling domain packages (`@repo/db`, `@repo/providers`, `@repo/signals`) from server-side query/service files
- Composing read models from query results (in `apps/web/server/mappers/`)
- Defining route-specific view models (in `apps/web/server/mappers/`)
- Rendering UI from read models
- Submitting server actions that call domain services

Not permitted in `apps/web`:
- Implementing new signal scoring logic
- Writing portfolio accounting math from scratch
- Implementing provider fallback routing
- Running DB migrations
- Defining canonical Zod schemas for shared domain types

## Forbidden
- `apps/web/components/*.tsx` importing from `packages/db`
- `apps/web/app/*/page.tsx` calling `fetch()` to external APIs
- `apps/web/server/services/` computing PnL or signal scores directly
- `apps/web` re-implementing canonicalization that belongs in `packages/ingestion`
- Business logic hidden inside React `useMemo` or inline component functions
- `apps/web` defining execution mode logic (belongs in `packages/agents`)

## Required Pattern
```text
apps/web/server/queries/     ← gathers data from packages (db, providers, agents)
apps/web/server/mappers/     ← transforms to view models
apps/web/server/services/    ← orchestrates queries + mappers + fallback
apps/web/app/*/page.tsx      ← calls service, passes to component
apps/web/components/         ← renders read model
```

## Validation
```bash
pnpm build:web
grep -r "from '@repo/db'" apps/web/components --include="*.tsx" --include="*.ts"
grep -r "from '@repo/providers'" apps/web/app --include="*.tsx"
grep -r "computeRSI\|computeEMA\|signalScore" apps/web/components --include="*.tsx"
```

## Good Example
```ts
// apps/web/server/services/portfolio-service.ts
import { getPortfolioPositions } from "@repo/db"
import { mapPositionsToReadModel } from "../mappers/portfolio-mapper"
export async function getPortfolioReadModel(accountId: string) {
  const positions = await getPortfolioPositions(accountId)
  return mapPositionsToReadModel(positions)
}
// ✓ Orchestrates domain packages, maps to view model, no domain math
```

## Bad Example
```ts
// apps/web/components/PortfolioCard.tsx
const unrealizedPnl = positions.reduce((sum, p) =>
  sum + (p.currentPrice - p.avgCost) * p.quantity, 0)
// ✗ Financial accounting math inside React component
```

## Safety Notes
Domain math in React components runs on the client and is invisible to the risk system. PnL computed in a component will not match PnL computed in the repository — producing display inconsistencies that erode user trust and can mask accounting errors.
