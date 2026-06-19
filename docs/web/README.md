# Aurox Web App (`apps/web`)

**Status:** Living reference · **Scope:** `apps/web` only · **Companion docs:**
[../architecture/overview.md](../architecture/overview.md),
[../EXECUTION.md](../EXECUTION.md),
[../RISK.md](../RISK.md),
[../SIMULATION_ENGINE.md](../SIMULATION_ENGINE.md),
[../../.claude/rules/query-mapper-service-route-ui.md](../../.claude/rules/query-mapper-service-route-ui.md)

`apps/web` is the **orchestration and presentation layer** of Aurox Intelligence. It is
a Next.js App Router application that renders the financial workstation UI and exposes a
small set of route handlers. It contains **no domain logic** — all signal math,
forecasting, execution accounting, provider routing, and persistence live in
`packages/*`. The web app gathers data from those packages, shapes it into display-ready
read models, and renders it.

> **Boundary rule.** `apps/web` never calls external providers, never writes SQL, and
> never computes PnL/signal/risk math in components. See
> [../../.claude/rules/app-orchestration-boundary.md](../../.claude/rules/app-orchestration-boundary.md).

---

## 1. Tech stack (current)

| Concern | Technology |
|---|---|
| Framework | Next.js 16 App Router (`apps/web/app`) |
| UI runtime | React 19 with React Server Components (RSC) |
| Server boundary | Server Components by default; `'use client'` only where interaction is required |
| Mutations | Server Actions (`'use server'`) in [`server/actions/`](../../apps/web/server/actions) |
| Validation | [Zod](https://zod.dev) at every write boundary |
| Shared types | `@repo/api-contracts` (Zod-first, single source of truth) |
| Data access | `@repo/db` repositories (no SQL in `apps/web`) |
| Market data | `@repo/providers` (no provider calls in `apps/web`) |
| Domain math | `@repo/signals`, `@repo/forecasting`, `@repo/agents` (pure / orchestrated) |
| i18n | request-scoped locale via [`server/i18n/locale.ts`](../../apps/web/server/i18n/locale.ts) |
| Auth | cookie session in [`server/auth/`](../../apps/web/server/auth) |
| Caching | Per-route `dynamic`/`revalidate`; request-scoped `react.cache`; `unstable_cache` for non-user data only |

---

## 2. The canonical read path

Every major screen follows **Query → Mapper → Service → Route → UI**. Each layer has a
single responsibility and lives in a dedicated folder.

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Query   │ → │  Mapper  │ → │ Service  │ → │  Route   │ → │    UI    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
 gather raw    pure/sync       orchestrate     call service   render the
 data from     transform to    query+mapper,   + choose       read model;
 @repo/*       view model      handle fallback  render mode    no math
```

| Layer | Folder | Responsibility |
|---|---|---|
| Query | [`server/queries/`](../../apps/web/server/queries) | Gather raw domain data from `@repo/db`, `@repo/providers`, services. No display formatting. |
| Mapper | [`server/mappers/`](../../apps/web/server/mappers) | **Pure, synchronous** transform of raw data → route-specific view model. No I/O. |
| Service | [`server/services/`](../../apps/web/server/services) | Orchestrate queries + mappers, handle degraded/fallback states, expose route-facing contract. |
| Route | [`app/**/page.tsx`](../../apps/web/app) | Call the service, choose render strategy (`force-dynamic` / `revalidate`), pass view model to UI. |
| UI | [`components/`](../../apps/web/components) | Render the read model. No provider calls, no SQL, no financial math. |

A real end-to-end trace through these layers is documented in
[server-layer.md](./server-layer.md#5-worked-example-the-portfolio-vertical-slice).

---

## 3. The canonical write path

Every mutation follows **UI → Server Action → Zod → Domain Service → Repository → revalidate**.

```
┌────┐   ┌───────────────┐   ┌──────┐   ┌────────────────┐   ┌────────────┐   ┌──────────────┐
│ UI │ → │ Server Action │ → │ Zod  │ → │ Domain Service │ → │ Repository │ → │ revalidatePath│
└────┘   └───────────────┘   └──────┘   └────────────────┘   └────────────┘   └──────────────┘
 form     'use server' fn     parse +     risk + lane          atomic           refresh read
 submit   in server/actions   reject      enforcement          transaction      models / route
```

- **Zod validation is mandatory** before any service call. See
  [`trade-actions.ts`](../../apps/web/server/actions/trade-actions.ts) for the trade-intent schema.
- **Execution flows run risk checks** before mutation
  (see [pre-trade-risk-service.ts](../../apps/web/server/services/pre-trade-risk-service.ts)
  and `@repo/agents`).
- **`revalidatePath` / `revalidateTag`** must follow every successful mutation so the user
  sees fresh state. Examples:
  [`simulation-actions.ts`](../../apps/web/server/actions/simulation-actions.ts),
  [`account-actions.ts`](../../apps/web/server/actions/account-actions.ts).

Details and per-route caching strategy: [data-flow.md](./data-flow.md).

---

## 4. UI component inventory

Top-level component groups under [`apps/web/components/`](../../apps/web/components):

| Group | Purpose |
|---|---|
| `account/` | Account cockpit, profile, activity, settings widgets |
| `admin/` | Admin monitoring, live-readiness, provider health panels |
| `alerts/` | Alert center cards, severity rows |
| `analytics/` | Cross-asset and analytical widgets |
| `asset/` | Shared asset detail view + workstation page header |
| `auth/` | Login / signup / password forms |
| `broker/` | Broker mode launchpad, live-readiness widget |
| `charts/` | Sparklines and chart primitives (server-fed data) |
| `dashboard/` | Mission-control top band, next-best-actions |
| `filters/` | Reusable filter controls |
| `finance/` | Finance cockpit widgets |
| `forecasting/` | Forecast confidence bars, bias glyphs |
| `invest/` | Investable asset cards, market rows, quick trade actions, ranked panels |
| `layout/` | App shell, navigation, page containers |
| `macro/` | Macro regime visual encoding |
| `market/` / `markets/` | Market graph, rankings, intelligence widgets |
| `news/` | News stream widgets |
| `observe/` | Observation feed and detail components |
| `portfolio/` | Position rows, allocation, recent trades |
| `sections/` | Section composition primitives |
| `signals/` | Signal badges, visual states |
| `stats/` | Compact stat cards, KPI bubbles |
| `tables/` | Data table primitives |
| `ui/` | Base UI: `Card`, `Section`, `Disclosure`, etc. |

Components receive **pre-shaped view models** only — see
[../../.claude/rules/read-model-rule.md](../../.claude/rules/read-model-rule.md).

---

## 5. Doc index

| Doc | Contents |
|---|---|
| [routes.md](./routes.md) | Full catalogue of every page route and API route handler, grouped by area, with rendering mode and user-specificity. |
| [server-layer.md](./server-layer.md) | The `apps/web/server` layers (queries, mappers, services, actions, config, env, auth, i18n, lib, news) with a worked end-to-end example. |
| [data-flow.md](./data-flow.md) | ASCII read/write diagrams, per-route caching strategy, and where execution math is forbidden. |

---

## 6. Current vs future

| Area | Current | Future |
|---|---|---|
| Execution | Simulation-first; persisted ledger in `simulation_*` tables | Live trading gated behind readiness checks (`invest/live-readiness`, `admin/live-readiness`) |
| AI trading | Assisted (suggestions); confirm-before-execute | Autonomous lane (gated, not enabled by default) |
| Brokers | Broker modes + sandbox; health/readiness surfaces | Live broker activation behind multi-step gate |

See [../EXECUTION.md](../EXECUTION.md) and [../SIMULATION_ENGINE.md](../SIMULATION_ENGINE.md)
for the execution and simulation contracts these routes orchestrate.
