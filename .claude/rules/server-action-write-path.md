# Server Action Write Path Rule

## Purpose
Every mutation in Aurox must follow the canonical write path: UI → Server Action → Zod Validation → Domain Service → Repository Transaction → Read Model Revalidation. Skipping any step creates unvalidated, unaudited, or inconsistent state.

## Applies To
- `apps/web/server/actions/`
- `apps/web/server/services/`
- `packages/db/src/repositories/`
- Any form submit, button action, or trade operation

## Rule
The canonical write path is:

```text
UI
  → Server Action (apps/web/server/actions/)
  → Zod Validation (parse and reject invalid input at boundary)
  → Domain Service (apps/web/server/services/ or packages/agents)
  → Repository Transaction (packages/db repositories)
  → Read Model Revalidation (revalidatePath or revalidateTag)
```

### Server Action rules
- Must be in `apps/web/server/actions/` or colocated `action.ts` files
- Must call Zod `.parse()` or `.safeParse()` on all user input before proceeding
- Must return typed success/error discriminated union
- Must never call `fetch()` to external providers
- Must never contain SQL

### Zod Validation rules
- Use schemas from `packages/api-contracts` where shared
- For route-specific input, local Zod schema is acceptable
- Reject and return error before any DB or service call if validation fails

### Domain Service rules
- Enforce lane/scope/policy constraints before execution
- For trade operations, run risk check before calling repository

### Repository Transaction rules
- Use database transactions for multi-table writes
- Simulation order + transaction + position update must be atomic

### Read Model Revalidation rules
- Call `revalidatePath()` or `revalidateTag()` after every successful mutation
- Never leave stale cached state after a write

## Forbidden
- Server actions without Zod validation
- Mutations that skip the repository layer (direct SQL in actions)
- Trade operations that skip risk check
- Server actions that mutate portfolio state without transaction log
- Forgetting `revalidatePath()` after simulation order submission
- Client-side fetch to a route handler for mutations (use server actions)

## Validation
```bash
grep -r "export async function" apps/web/server/actions --include="*.ts" | head -20
grep -r "\.parse\|\.safeParse" apps/web/server/actions --include="*.ts"
grep -r "revalidatePath\|revalidateTag" apps/web/server/actions --include="*.ts"
pnpm build:web
```

## Good Example
```ts
// apps/web/server/actions/submit-trade.ts
"use server"
export async function submitSimulationTrade(formData: unknown) {
  const input = TradeInputSchema.safeParse(formData)
  if (!input.success) return { error: "Invalid input", issues: input.error.issues }
  const riskResult = await runRiskCheck(input.data)
  if (!riskResult.passed) return { error: "Risk check failed", reason: riskResult.reason }
  await createSimulationOrder(input.data)
  revalidatePath("/invest")
  return { success: true }
}
```

## Bad Example
```ts
// apps/web/server/actions/submit-trade.ts
"use server"
export async function submitSimulationTrade(formData: any) {
  // ✗ No Zod validation, no risk check, no transaction, no revalidation
  await db`INSERT INTO app.simulation_orders VALUES (${formData.symbol}, ${formData.qty})`
}
```

## Safety Notes
A server action that skips Zod validation allows malformed trade quantities to enter the simulation engine. A missing `revalidatePath` shows stale portfolio values after a trade — creating a confusing but invisible discrepancy between displayed and actual state.
