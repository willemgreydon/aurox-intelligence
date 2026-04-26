# User-Specific Cache Rule

## Purpose
Data that belongs to a specific user (portfolio, account balance, simulation positions, trade history) must never be served from a shared cache. Shared caching of user-specific financial data is both a privacy violation and a correctness defect.

## Applies To
- `apps/web/app/`
- `apps/web/server/queries/`
- Any route that reads portfolio, account, or simulation state

## Rule
User-specific data includes:
- Simulation account balance and cash
- Simulation portfolio positions
- Simulation order history
- Simulation transaction history
- Simulation snapshots
- Any preference or setting tied to a user ID

For all user-specific data:
1. Use `cache: "no-store"` on fetch calls
2. Use `export const dynamic = "force-dynamic"` on the route
3. Never wrap user-specific DB queries with `unstable_cache`
4. Never use `revalidate` with a TTL on user-specific routes (use `force-dynamic`)
5. Include the user's ID in the query — never query without a user scope

Authentication check:
```ts
// Always verify session before reading user-specific data
const session = await getServerSession()
if (!session?.user?.id) redirect("/login")
const data = await getPortfolioForUser(session.user.id)
```

## Forbidden
- Fetching portfolio data without including `userId` in the query
- `unstable_cache(getPortfolio, ["portfolio"])` without a user-scoped cache key
- Layout-level caching that includes portfolio data
- CDN or edge caching on portfolio/invest/account pages
- Storing `userId` as a global variable and reading it in queries

## Required Pattern
```ts
// apps/web/app/invest/page.tsx
export const dynamic = "force-dynamic"  // prevent route-level caching

export default async function InvestPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/auth/signin")

  // Query scoped to authenticated user
  const portfolio = await getPortfolioForUser(session.user.id)
  return <InvestLayout portfolio={portfolio} />
}
```

## Validation
```bash
grep -r "getPortfolio\|getSimulationAccount\|getPositions" apps/web/server/queries --include="*.ts" | grep -v "userId\|accountId\|session"
grep -r "unstable_cache" apps/web --include="*.ts" | grep -i "portfolio\|account\|position"
grep -r "export const dynamic" apps/web/app/invest apps/web/app/portfolio --include="*.tsx" --include="*.ts"
```

## Good Example
```ts
// Scoped to user, never cached
const positions = await getSimulationPositions(session.user.id)
// ✓ No caching, user-scoped query
```

## Bad Example
```ts
// unstable_cache without user scope — all users share one cache entry
const getPortfolio = unstable_cache(
  async () => getAllPositions(),  // ✗ No user scope
  ["portfolio"]
)
```

## Safety Notes
User A's portfolio served to user B is both a privacy violation and a financial display error. In a trading application, showing the wrong balance to a user can cause them to make incorrect sizing decisions. This is a critical-severity defect.
