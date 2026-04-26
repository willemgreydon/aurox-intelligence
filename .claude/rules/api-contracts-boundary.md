# API Contracts Boundary Rule

## Purpose
`packages/api-contracts` is the single source of truth for all shared Zod schemas and TypeScript types. Duplicating or forking contracts elsewhere causes type drift, silent validation gaps, and cross-package inconsistency.

## Applies To
- `packages/api-contracts/`
- `apps/web/server/`
- All packages that define or consume shared domain types

## Rule
Any type or schema used by more than one package must live in `packages/api-contracts`.

The canonical pattern:
```text
packages/api-contracts → defines Zod schema + inferred TypeScript type
packages/db → uses inferred type for repository return shapes
packages/signals → uses inferred type as input/output contract
apps/web → uses inferred type for read models and server actions
```

Route-specific view models that are only consumed by a single route may live in `apps/web/server/mappers/`. But the underlying domain types must come from `packages/api-contracts`.

## Forbidden
- Defining a `SimulationOrder` type locally in `apps/web/server/services/`
- Duplicating `SignalOutput` schema in `apps/web`
- Creating a second `ExecutionMode` enum in `packages/agents`
- Importing from `packages/api-contracts` and then re-exporting with modifications
- Using `z.infer<typeof SomeLocalSchema>` when the schema duplicates an existing contract
- Defining provider response shapes outside `packages/api-contracts` or `packages/providers`

## Required Pattern
```ts
// packages/api-contracts/src/signal.ts
export const SignalOutputSchema = z.object({
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  explanation: z.string()
})
export type SignalOutput = z.infer<typeof SignalOutputSchema>

// packages/signals/src/trend.ts
import type { SignalOutput } from "@repo/api-contracts"
export function deriveTrendSignal(data: OHLCV[]): SignalOutput { ... }
```

## Validation
```bash
pnpm --filter @repo/api-contracts typecheck
grep -r "z\.object\|z\.string\|z\.number" apps/web/server --include="*.ts" | grep -v "view-model\|mapper\|route-specific"
```

## Good Example
```ts
// apps/web/server/services/portfolio-service.ts
import type { PortfolioReadModel } from "@repo/api-contracts"
// ✓ Using canonical contract from api-contracts
```

## Bad Example
```ts
// apps/web/server/services/portfolio-service.ts
type PortfolioReadModel = {
  totalValue: number
  positions: { symbol: string; quantity: number }[]
}
// ✗ Local duplicate of a shared contract — will diverge from canonical
```

## Safety Notes
Duplicated contracts mean a Zod schema validation change in `packages/api-contracts` is silently ignored by the local copy. In execution flows this means an order with invalid fields can bypass Zod validation and reach the broker adapter unchecked.
