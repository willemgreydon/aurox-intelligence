# Aurox Architecture Rules

## Purpose
Enforce the core architectural contracts of the Aurox Intelligence monorepo. Every feature must integrate into the signal system, risk system, and execution system. No isolated logic is allowed.

## Applies To
- All files in the monorepo

## Rule
Aurox follows the canonical read path:

```text
Query → Mapper → Service → Route → UI
```

And the canonical write path:

```text
UI → Server Action → Zod Validation → Domain Service → Repository Transaction → Read Model Revalidation
```

## Package Boundaries

| Package | Responsibility |
|---|---|
| `packages/api-contracts` | Zod schemas and shared TypeScript contracts |
| `packages/db` | SQL, repositories, migrations, transactions |
| `packages/providers` | External API calls, normalization, fallback routing |
| `packages/ingestion` | Symbol canonicalization, ingestion pipelines |
| `packages/signals` | Pure signal derivation, indicator scoring |
| `packages/forecasting` | Pure forecasting, explainability |
| `packages/agents` | Trade workflows, broker adapters, risk gates |
| `apps/web` | Next.js routes, server actions, UI orchestration |

## Forbidden
- Provider calls from `apps/web` components or routes
- SQL outside `packages/db`
- Domain math inside React components
- Duplicate shared contracts in `apps/web`
- Execution logic in Next.js route handlers
- Forecasting or signal logic in route handlers

## Required Pattern
Before implementing any behavior:
1. Check existing contract in `packages/api-contracts`
2. Extend shared schema if needed
3. Implement package-level domain logic
4. Add service and mapper in `apps/web`
5. Wire into route and UI
6. Add tests or verification

## Validation
```bash
pnpm --filter @repo/api-contracts typecheck
grep -r "from '@repo/providers'" apps/web/components --include="*.tsx"
grep -r "sql\`\|from 'postgres'" apps/web/app --include="*.ts"
```

## Good Example
```ts
// Query calls package, mapper shapes, service orchestrates
const positions = await getPositions(accountId)       // packages/db
const quotes = await getBatchQuotes(symbols)           // packages/providers
const viewModel = mapPortfolioToReadModel(positions, quotes)  // mapper
```

## Bad Example
```tsx
// apps/web/components/Portfolio.tsx
const res = await fetch("https://api.polygon.io/quotes?apiKey=...")
// ✗ Provider call from UI component — critical boundary violation
```

## Safety Notes
Boundary violations undermine the testability and auditability of the entire system. In a financial execution engine, untestable code paths are a risk — not a convenience.
