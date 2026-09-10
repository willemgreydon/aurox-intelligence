# Web Data Flow & Caching

**Scope:** `apps/web`. Companion: [README.md](./README.md),
[server-layer.md](./server-layer.md), [routes.md](./routes.md).
Rules: [../../.claude/rules/cache-safety-rule.md](../../.claude/rules/cache-safety-rule.md),
[../../.claude/rules/next-cache-rule.md](../../.claude/rules/next-cache-rule.md),
[../../.claude/rules/user-specific-cache-rule.md](../../.claude/rules/user-specific-cache-rule.md),
[../../.claude/rules/portfolio-accounting-rule.md](../../.claude/rules/portfolio-accounting-rule.md).

---

## 1. Read path (current)

```
 BROWSER                          apps/web (server)                              packages/*
 ───────                          ─────────────────                             ──────────
                       ┌─────────────────────────────────────────┐
  request  ─────────►  │  app/**/page.tsx  (Route, RSC)           │
                       │   • export const dynamic / revalidate    │
                       │   • requireCurrentSession (if user data) │
                       │   • getRequestLocale                     │
                       └───────────────┬─────────────────────────┘
                                       │ calls ONE service
                       ┌───────────────▼─────────────────────────┐
                       │  server/services/*-service.ts            │
                       │   • orchestrate, fallback/degraded state │
                       └───────────────┬─────────────────────────┘
                          calls         │          calls (pure)
                ┌─────────────────────┐ │ ┌──────────────────────────┐
                │ server/queries/      │◄┘►│ server/mappers/          │
                │  *-query.ts          │   │  *-mapper.ts (sync/pure) │
                │  gather raw data     │   │  → typed view model      │
                └──────────┬───────────┘   └──────────────────────────┘
                           │ reads via boundaries
            ┌──────────────┼───────────────┬───────────────┐
            ▼              ▼                ▼               ▼
        @repo/db     @repo/providers  @repo/signals   @repo/agents
        (SQL,         (quotes,         (pure signal    (workflows,
         repos)        OHLCV,           math)           risk gates)
                       fallback)
                           │
                           ▼
                  view model returned UP to route ──► rendered into components/
                  (components render only — NO financial math)
```

Key invariants:
- The **route calls exactly one service**; it never imports `@repo/db` or `@repo/providers` directly.
- **Mappers are pure/sync** — no `await`, no I/O. (See [server-layer.md §3](./server-layer.md#3-mappers--pure-transform).)
- **Queries** are the only place that fan out to package boundaries, ideally in parallel.
- **Components** receive display-ready view models — they never compute PnL, signal, or risk values.

---

## 2. Write path (current)

```
 BROWSER                              apps/web (server)                          packages/*
 ───────                              ─────────────────                         ──────────
  <form action={submitTradeAction}>
        │ FormData
        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ server/actions/*-actions.ts   ('use server')                  │
 │  1. requireCurrentSession            (auth)                    │
 │  2. zodSchema.safeParse(FormData)    (REJECT if invalid)       │
 │  3. policy / lane / mode resolution                            │
 └───────────────┬──────────────────────────────────────────────┘
                 │ validated payload
                 ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Domain service / @repo/agents workflow                        │
 │  • runPreTradeRiskCheck  (risk > policy > user)               │  ◄─ risk gate
 │  • kill-switch / halt-state check                             │  ◄─ kill switch
 │  • simulation-first routing (live is gated)                   │
 └───────────────┬──────────────────────────────────────────────┘
                 │ on pass
                 ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ @repo/db repository  — atomic db.begin() transaction          │
 │  order + transaction + position + account  (all-or-nothing)   │
 └───────────────┬──────────────────────────────────────────────┘
                 │ success
                 ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ revalidatePath('/invest') / revalidatePath('/portfolio') ...  │  ◄─ refresh read models
 └──────────────────────────────────────────────────────────────┘
```

Real example: [`trade-actions.ts`](../../apps/web/server/actions/trade-actions.ts) defines
`tradeIntentSchema` (Zod with `superRefine` for sizing-mode constraints), calls
`executeTradeForUser` ([`trade-execution-service.ts`](../../apps/web/server/services/trade-execution-service.ts)),
then revalidates. If validation fails it redirects with an error code — it never proceeds
on invalid input. See [server-layer.md §5](./server-layer.md#5-actions--the-write-path).

Invariants:
- **No write without Zod validation** at the action boundary.
- **No execution without risk + kill-switch checks** (in the service / `@repo/agents`).
- **Multi-table writes are transactional** ([../../.claude/rules/repository-transaction-rule.md](../../.claude/rules/repository-transaction-rule.md)).
- **`revalidatePath` follows every successful mutation** so the user never sees stale balances.

---

## 3. Caching strategy per route type

Cache behavior is declared explicitly on each route. Confirmed from the `page.tsx` files
(see [routes.md](./routes.md) for the full per-route list).

| Route type | Directive | Why | Examples |
|---|---|---|---|
| Portfolio / invest / account / simulation | `dynamic = 'force-dynamic'` | **User-specific financial state** must never be cached or shared. | [`/portfolio`](../../apps/web/app/portfolio/page.tsx), [`/invest`](../../apps/web/app/invest/page.tsx), [`/account`](../../apps/web/app/account/page.tsx), [`/invest/simulation`](../../apps/web/app/invest/simulation/page.tsx) |
| Dashboard / alerts / observe / replay / finance | `dynamic = 'force-dynamic'` | Personalized, session-gated cockpits. | [`/dashboard`](../../apps/web/app/dashboard/page.tsx), [`/alerts`](../../apps/web/app/alerts/page.tsx), [`/observe`](../../apps/web/app/observe/page.tsx) |
| Admin | `dynamic = 'force-dynamic'` | Live operational state, privileged. | [`/admin`](../../apps/web/app/admin/page.tsx), [`/admin/monitoring/providers`](../../apps/web/app/admin/monitoring/providers/page.tsx) |
| Market overview / rankings | `revalidate = 30` | Public, time-sensitive, not user-specific → short ISR window. | [`/market`](../../apps/web/app/market/page.tsx), [`/markets/rankings`](../../apps/web/app/markets/rankings/page.tsx) |
| Signals / forecasts / macro / news / FX / stocks | `dynamic = 'force-dynamic'` | Compose live intelligence/quote inputs each request. | [`/signals`](../../apps/web/app/signals/page.tsx), [`/forecasts`](../../apps/web/app/forecasts/page.tsx), [`/fx`](../../apps/web/app/fx/page.tsx) |
| Auth / legal | `default` (static-eligible) | Public, non-personalized content. | [`/login`](../../apps/web/app/login/page.tsx), [`/legal`](../../apps/web/app/legal/page.tsx) |

### Layered caching beneath the route

Even on `force-dynamic` routes, expensive **non-user** data is cached at lower layers
without leaking user state:

- **Request-scoped dedup** — `react.cache(...)` in queries (e.g.
  [`invest-query.ts`](../../apps/web/server/queries/invest-query.ts)) deduplicates identical
  provider/DB reads within a single render. Per-request, no cross-user contamination.
  ([../../.claude/rules/request-dedupe-rule.md](../../.claude/rules/request-dedupe-rule.md))
- **`unstable_cache`** — used only for **non-user** market data (e.g. the invest catalogue
  read model with a 60s TTL / 10s error TTL). It is **never** applied to portfolio, account,
  balance, or position queries.
- **Provider cache / rate limiting** — [`provider-cache.ts`](../../apps/web/server/lib/provider-cache.ts),
  [`rate-limit.ts`](../../apps/web/server/lib/rate-limit.ts) bound provider call budgets.
- **DB-absence fallback** — [`db-runtime.ts`](../../apps/web/server/lib/db-runtime.ts)
  `withDbReadFallback` returns a safe degraded read model instead of crashing.

> **Forbidden:** `force-cache` / `unstable_cache` on portfolio, account, balance, or
> position data; any shared cache keyed without the user id. User A's balance must never
> reach user B.

### Revalidation targets

After mutations, actions call `revalidatePath`/`revalidateTag`. Helpers live in
[`revalidation-targets.ts`](../../apps/web/server/lib/revalidation-targets.ts). Counts of
revalidation calls per action file are listed in
[server-layer.md §5](./server-layer.md#5-actions--the-write-path).

---

## 4. Where execution math is forbidden

Financial computation must happen **server-side, ideally in the DB / domain packages** —
never in routes or React components.

| Computation | Allowed location | Forbidden location |
|---|---|---|
| PnL, cost basis, position value, portfolio total | `@repo/db` repository (Postgres `NUMERIC`) | components, mappers, services |
| Signal score / confidence | `@repo/signals` (pure) | components, routes |
| Forecasts + intervals | `@repo/forecasting` (pure) | components, routes |
| Position sizing, risk checks | `@repo/agents` | actions (raw), components |
| Display formatting only | mappers + [`quote-display.ts`](../../apps/web/server/lib/quote-display.ts) | — |

```
   ┌──────────────┐
   │  @repo/db    │  ← canonical PnL / accounting (NUMERIC arithmetic)
   └──────┬───────┘
          │ pre-computed values
   ┌──────▼───────┐
   │   query      │  ← gathers, no math
   └──────┬───────┘
   ┌──────▼───────┐
   │   mapper     │  ← FORMAT only (currency, %, labels). NO formulas.
   └──────┬───────┘
   ┌──────▼───────┐
   │  component   │  ← RENDER only. NO (price - cost) * qty.
   └──────────────┘
```

Why: math in components runs outside the audit trail, uses JS float precision instead of
Postgres `NUMERIC`, and produces values that diverge from the canonical ledger. See
[../../.claude/rules/portfolio-accounting-rule.md](../../.claude/rules/portfolio-accounting-rule.md)
and [../../.claude/rules/aurox-ui-boundaries.md](../../.claude/rules/aurox-ui-boundaries.md).

---

## 5. Current vs future

| Aspect | Current | Future |
|---|---|---|
| Execution routing | Simulation-first; live gated | Live activation behind readiness gate (`/invest/live-readiness`, `/admin/live-readiness`) |
| AI agent writes | Assisted, confirm-before-execute ([`ai-simulation-agent-actions.ts`](../../apps/web/server/actions/ai-simulation-agent-actions.ts)) | Autonomous lane (gated, off by default) |
| Quote freshness | Surfaced as staleness labels in read models | Hard freshness gating on live execution |
