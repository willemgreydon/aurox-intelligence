# Architecture Boundaries

## Purpose
Enforce hard package ownership boundaries across the Aurox monorepo. Each package has a single defined responsibility. Crossing these boundaries creates untestable, unsafe, and unmaintainable code.

## Applies To
- All packages and apps in the monorepo
- Any new feature spanning multiple packages

## Rule
Each package owns exactly one domain. Logic must live in the correct package. No exceptions.

| Package | Owns |
|---|---|
| `packages/api-contracts` | Zod schemas, shared TypeScript types |
| `packages/db` | SQL, repositories, migrations, transactions |
| `packages/providers` | External API calls, normalization, fallback routing |
| `packages/ingestion` | Canonical symbol mapping, ingestion pipelines |
| `packages/signals` | Pure signal derivation, indicator scoring |
| `packages/forecasting` | Pure forecasting, explainability, time-series |
| `packages/agents` | Trade workflows, broker adapters, risk gates |
| `packages/ai-market-intelligence` | AI recommendation composition |
| `packages/observability` | Logging, metrics, tracing |
| `packages/design-tokens` | CSS/TS design primitives |
| `apps/web` | Next.js routes, server actions, UI orchestration |
| `apps/worker` | Background jobs, ingestion workers |

## Forbidden
- Calling provider APIs from `apps/web` route files or components
- Writing SQL queries in `apps/web` services or routes
- Importing `packages/db` directly from `packages/signals` or `packages/forecasting`
- Duplicating Zod schemas from `packages/api-contracts` inside `apps/web`
- Calling `packages/providers` from `packages/signals`
- Importing `packages/agents` execution logic directly into React components
- Placing ingestion/canonicalization logic outside `packages/ingestion`

## Required Pattern
Before implementing any feature:
1. Identify which package owns the new logic
2. Define contracts in `packages/api-contracts` if shared
3. Implement domain logic in the owning package
4. Wire upward through services to `apps/web`
5. Never shortcut directly from UI to domain package internals

## Validation
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/providers typecheck
grep -r "from.*packages/providers" apps/web/components --include="*.ts" --include="*.tsx"
grep -r "postgres\|sql\`" apps/web/app --include="*.ts" --include="*.tsx"
```

## Good Example
```ts
// apps/web/server/queries/market-query.ts
import { getMarketSnapshot } from "@repo/providers"
// ✓ Query layer calls providers — correct boundary
```

## Bad Example
```ts
// apps/web/components/AssetCard.tsx
import { fetchQuote } from "@repo/providers"
// ✗ UI component calling provider — boundary violation
```

## Safety Notes
Boundary violations cause test isolation failures, undetectable regressions, and provider API keys leaking to client bundles. In an execution system, a boundary violation can mean unchecked data flows into trade decisions.
