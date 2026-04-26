# Next.js Cache Rule

## Purpose
Next.js 16 App Router has a layered cache system (Router Cache, Full Route Cache, Data Cache, Request Memoization). Each layer must be configured explicitly for financial data. Incorrect cache configuration causes stale portfolio state, cached execution forms, and cross-user data leaks.

## Applies To
- `apps/web/app/`
- `apps/web/server/services/`
- `apps/web/server/actions/`

## Rule
Cache configuration by route type:

| Route Type | Strategy | Rationale |
|---|---|---|
| Market overview (public) | `revalidate: 60` | Short-lived, not user-specific |
| Portfolio / invest | `dynamic = "force-dynamic"` or `cache: "no-store"` | User-specific, must be fresh |
| Simulation trade form | `dynamic = "force-dynamic"` | Always fresh, execution-critical |
| Market rankings | `revalidate: 300` | Updated every 5 min |
| Asset fundamentals | `revalidate: 3600` | Changes slowly |
| Signal scores | `revalidate: 300` | Updated every 5 min |

Declare at the top of each page or layout:
```ts
// For dynamic user-specific pages:
export const dynamic = "force-dynamic"

// For time-revalidated public pages:
export const revalidate = 60
```

After every server action mutation:
```ts
revalidatePath("/invest")            // revalidate the relevant path
revalidatePath("/portfolio")
revalidateTag("simulation-account")  // if using tag-based invalidation
```

## Forbidden
- Default caching on `/invest` or `/portfolio` pages (user-specific data must not be cached at route level)
- `revalidatePath()` missing from server actions that mutate simulation state
- Using `unstable_cache` on portfolio or balance queries
- `revalidate: 0` on pages (use `force-dynamic` instead)
- Layout caching that causes portfolio state to persist across navigation

## Required Pattern
```ts
// apps/web/app/invest/page.tsx
export const dynamic = "force-dynamic"  // never cache invest page

export default async function InvestPage() {
  const portfolio = await getPortfolioReadModel()  // always fresh
  return <InvestLayout portfolio={portfolio} />
}
```

```ts
// apps/web/server/actions/submit-trade.ts
"use server"
export async function submitTrade(input: TradeInput) {
  await processSimulationOrder(input)
  revalidatePath("/invest")        // ← required after every trade
  revalidatePath("/portfolio")
}
```

## Validation
```bash
grep -r "export const dynamic\|export const revalidate" apps/web/app --include="*.tsx" --include="*.ts"
grep -r "revalidatePath\|revalidateTag" apps/web/server/actions --include="*.ts"
grep -r "unstable_cache" apps/web/server --include="*.ts"
pnpm build:web
```

## Good Example
```ts
// Invest page — always dynamic
export const dynamic = "force-dynamic"
// ✓ User always sees their current portfolio state
```

## Bad Example
```ts
// apps/web/app/invest/page.tsx — no dynamic declaration
export default async function InvestPage() {
  const portfolio = await getPortfolioReadModel()
  // ✗ May be statically cached by Next.js — user sees stale balance after trade
}
```

## Safety Notes
A cached portfolio page shown after a trade fill causes the user to see pre-trade balances. If they submit another trade based on the stale view, they may exceed their risk limits without knowing. `force-dynamic` on execution-adjacent pages is a financial safety requirement, not a performance trade-off.
