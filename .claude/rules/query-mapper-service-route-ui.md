# Query → Mapper → Service → Route → UI Rule

## Purpose
Every major screen in `apps/web` must follow the canonical read path. This layering separates data gathering, transformation, orchestration, rendering, and display.

## Applies To
- `apps/web/server/queries/`
- `apps/web/server/mappers/`
- `apps/web/server/services/`
- `apps/web/app/`
- `apps/web/components/`

## Rule
The canonical read path is:

```text
Query → Mapper → Service → Route → UI
```

### Query (`apps/web/server/queries/`)
- Gathers raw data from packages (`@repo/db`, `@repo/providers`, `@repo/agents`)
- Returns raw domain types
- No formatting, no view-model shaping
- May run multiple fetches in parallel

### Mapper (`apps/web/server/mappers/`)
- Converts raw domain data to route-specific view models
- Formats numbers, dates, strings for display
- Strips provider-specific fields
- Handles null/undefined → display fallbacks

### Service (`apps/web/server/services/`)
- Orchestrates one or more queries
- Calls mapper to produce final view model
- Handles fallback when data is unavailable
- Returns typed view model to route

### Route (`apps/web/app/*/page.tsx`)
- Calls service
- Chooses rendering strategy (static, dynamic, streaming)
- Passes view model to top-level component
- Does not transform data

### UI (`apps/web/components/`)
- Renders view model
- Handles interaction state
- Shows loading / empty / error / degraded states
- Does not compute financial values

## Forbidden
- Routes calling `@repo/providers` directly
- Routes calling `@repo/db` directly
- Components calling services
- Services computing signal scores or PnL
- Mappers calling providers or DB

## Validation
```bash
pnpm build:web
grep -r "from '@repo/providers'\|from '@repo/db'" apps/web/app --include="*.tsx" --include="*.ts"
```

## Good Example
```text
apps/web/server/queries/invest-query.ts    → calls @repo/db and @repo/providers
apps/web/server/mappers/invest-mapper.ts  → shapes InvestPageViewModel
apps/web/server/services/invest-service.ts → orchestrates query + mapper
apps/web/app/invest/page.tsx              → calls service, renders <InvestPage>
apps/web/components/invest/InvestPage.tsx → renders view model
```

## Bad Example
```tsx
// apps/web/app/invest/page.tsx
const data = await fetchQuote("AAPL")       // ✗ route calling provider
const pnl = data.price - data.avgCost       // ✗ math in route
return <InvestPage pnl={pnl} />
```

## Safety Notes
When routes perform their own provider calls, fallback logic runs inconsistently. When components compute financial values, the risk system cannot audit them. The layered path ensures every transformation is testable in isolation.
