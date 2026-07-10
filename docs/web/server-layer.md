# The `apps/web/server` Layer

**Scope:** [`apps/web/server`](../../apps/web/server). Companion:
[README.md](./README.md), [data-flow.md](./data-flow.md),
[../../.claude/rules/query-mapper-service-route-ui.md](../../.claude/rules/query-mapper-service-route-ui.md).

`apps/web/server` contains the server-side orchestration code that sits between the route
files in [`app/`](../../apps/web/app) and the domain packages in `packages/*`. It is split
into single-responsibility folders. The read path flows **queries → mappers → services**;
the write path flows **actions → services/`@repo/agents` → `@repo/db`**. Supporting
folders (`config`, `env`, `auth`, `i18n`, `lib`, `news`) provide cross-cutting helpers.

---

## 1. Folder responsibilities

| Folder | Responsibility | Purity / I/O |
|---|---|---|
| [`queries/`](../../apps/web/server/queries) | Gather raw domain data from `@repo/db`, `@repo/providers`, and other services into a read model. May run parallel fetches. No display formatting. | Async, I/O allowed |
| [`mappers/`](../../apps/web/server/mappers) | Transform a read model into a route-specific view model. Format numbers/dates, derive labels, replace nulls with display fallbacks. | **Pure, synchronous — no I/O** |
| [`services/`](../../apps/web/server/services) | Orchestrate queries + mappers, handle degraded/fallback states, expose the route-facing contract. | Async, orchestration only |
| [`actions/`](../../apps/web/server/actions) | `'use server'` mutation entrypoints. Validate input with Zod, enforce policy/risk, call domain service/repository, then `revalidatePath`. | Async, write path |
| [`config/`](../../apps/web/server/config) | Static server config registries. | Pure config |
| [`env/`](../../apps/web/server/env) | Validated environment access (server-only). | Config helpers |
| [`auth/`](../../apps/web/server/auth) | Session, cookies, password, routing for auth. | Async + crypto |
| [`i18n/`](../../apps/web/server/i18n) | Request-scoped locale resolution. | Async (cookie read) |
| [`lib/`](../../apps/web/server/lib) | Shared server utilities (caching, formatting, rate limit, runtime engines, timing). | Mixed |
| [`news/`](../../apps/web/server/news) | News source configuration. | Pure config |

---

## 2. `queries/` — gather

Each query returns a typed **read model** assembled from package boundaries. It does not
format for display.

| File | Read model |
|---|---|
| [`invest-query.ts`](../../apps/web/server/queries/invest-query.ts) | `InvestReadModel` — assets, observations, history series, linked accounts, news. Cached with `unstable_cache` (non-user data) + request-scoped `react.cache`. |
| [`portfolio-query.ts`](../../apps/web/server/queries/portfolio-query.ts) | `PortfolioReadModel` — workstation state, sparklines, asset map, watched ids. Wrapped in `withDbReadFallback` for DB-absence safety. |
| [`dashboard-query.ts`](../../apps/web/server/queries/dashboard-query.ts), [`dashboard-market-query.ts`](../../apps/web/server/queries/dashboard-market-query.ts) | Dashboard cockpit + market band read models. |
| [`stocks-query.ts`](../../apps/web/server/queries/stocks-query.ts), [`stock-detail-query.ts`](../../apps/web/server/queries/stock-detail-query.ts) | Stock catalogue + detail. |
| [`fx-query.ts`](../../apps/web/server/queries/fx-query.ts), [`fx-detail-query.ts`](../../apps/web/server/queries/fx-detail-query.ts) | FX overview + pair detail. |
| [`analysis-query.ts`](../../apps/web/server/queries/analysis-query.ts) | Signals/analysis inputs. |
| [`market-ticker-query.ts`](../../apps/web/server/queries/market-ticker-query.ts) | Market ticker band. |
| [`news-query.ts`](../../apps/web/server/queries/news-query.ts) | News stream read model. |
| [`admin-query.ts`](../../apps/web/server/queries/admin-query.ts) | Admin monitoring read model (tested: `admin-query.test.ts`). |
| [`health-query.ts`](../../apps/web/server/queries/health-query.ts) | Health/probe read model. |

---

## 3. `mappers/` — pure transform

Mappers are **synchronous and pure**: same input → same output, no `fetch`, no DB, no
`await`. They take a read model and return a view model, often validated against a Zod
contract from `@repo/api-contracts`.

| File | Produces |
|---|---|
| [`portfolio-mapper.ts`](../../apps/web/server/mappers/portfolio-mapper.ts) | `InvestPortfolioViewModel` (validated by `investPortfolioViewModelSchema`) |
| [`invest-mapper.ts`](../../apps/web/server/mappers/invest-mapper.ts) | `InvestOverviewViewModel` |
| [`dashboard-mapper.ts`](../../apps/web/server/mappers/dashboard-mapper.ts), [`dashboard-market-mapper.ts`](../../apps/web/server/mappers/dashboard-market-mapper.ts) | Dashboard view models |
| [`stocks-mapper.ts`](../../apps/web/server/mappers/stocks-mapper.ts) | Stock catalogue/detail view models |
| [`fx-mapper.ts`](../../apps/web/server/mappers/fx-mapper.ts) | FX view models |
| [`finance-mapper.ts`](../../apps/web/server/mappers/finance-mapper.ts) | Finance cockpit view model (tested: `finance-mapper.test.ts`) |
| [`analysis-mapper.ts`](../../apps/web/server/mappers/analysis-mapper.ts) | Signals/analysis view model |
| [`market-ticker-mapper.ts`](../../apps/web/server/mappers/market-ticker-mapper.ts) | Market ticker view model |
| [`admin-mapper.ts`](../../apps/web/server/mappers/admin-mapper.ts) | Admin view model |
| [`route-presentation.ts`](../../apps/web/server/mappers/route-presentation.ts) | Shared route status/presentation helpers |

> Rule: [../../.claude/rules/mapper-normalization-rule.md](../../.claude/rules/mapper-normalization-rule.md)
> — async mappers and I/O in mappers are forbidden.

---

## 4. `services/` — orchestrate + fallback

Services are the route-facing contract. They call one or more queries, invoke the mapper,
and decide what the route receives — including degraded states when data is unavailable.
There are ~30 services; representative ones:

| File | Orchestrates |
|---|---|
| [`portfolio-service.ts`](../../apps/web/server/services/portfolio-service.ts) | `getInvestPortfolioData` → query + mapper |
| [`invest-service.ts`](../../apps/web/server/services/invest-service.ts) | `getInvestOverviewData` → cached query + two-stage mapper |
| [`dashboard-executive-service.ts`](../../apps/web/server/services/dashboard-executive-service.ts) | Dashboard cockpit composition |
| [`market-graph-service.ts`](../../apps/web/server/services/market-graph-service.ts) | Market graph data |
| [`simulation-service.ts`](../../apps/web/server/services/simulation-service.ts), [`simulation-workstation-service.ts`](../../apps/web/server/services/simulation-workstation-service.ts) | Simulation portfolio + workstation state |
| [`trade-execution-service.ts`](../../apps/web/server/services/trade-execution-service.ts) | `executeTradeForUser` (write path; calls `@repo/agents`) |
| [`pre-trade-risk-service.ts`](../../apps/web/server/services/pre-trade-risk-service.ts) | Pre-trade risk surfacing |
| [`broker-health-service.ts`](../../apps/web/server/services/broker-health-service.ts), [`live-readiness-service.ts`](../../apps/web/server/services/live-readiness-service.ts) | Broker health + live readiness (FUTURE live path) |
| [`account-service.ts`](../../apps/web/server/services/account-service.ts), [`account-intelligence-service.ts`](../../apps/web/server/services/account-intelligence-service.ts) | Account cockpit + analytics |
| [`fx-service.ts`](../../apps/web/server/services/fx-service.ts), [`stocks-service.ts`](../../apps/web/server/services/stocks-service.ts), [`news-service.ts`](../../apps/web/server/services/news-service.ts) | FX / stocks / news pages |
| [`forecast-workstation-service.ts`](../../apps/web/server/services/forecast-workstation-service.ts), [`macro-intelligence-service.ts`](../../apps/web/server/services/macro-intelligence-service.ts) | Forecasts / macro |
| [`alert-center-service.ts`](../../apps/web/server/services/alert-center-service.ts), [`market-observation-service.ts`](../../apps/web/server/services/market-observation-service.ts), [`intelligence-replay-service.ts`](../../apps/web/server/services/intelligence-replay-service.ts) | Alerts / observe / replay |
| [`ai-simulation-agent-service.ts`](../../apps/web/server/services/ai-simulation-agent-service.ts) + [`ai-simulation-agent-guardrails.ts`](../../apps/web/server/services/ai-simulation-agent-guardrails.ts) | Assisted AI simulation agent (gated) |

---

## 5. `actions/` — the write path

`'use server'` functions that mutate state. Each: **validates with Zod → enforces
policy/risk → calls a service/repository → `revalidatePath`**.

| File | Representative actions | Revalidates |
|---|---|---|
| [`trade-actions.ts`](../../apps/web/server/actions/trade-actions.ts) | `submitTradeAction` — Zod `tradeIntentSchema` with `superRefine`, calls `executeTradeForUser` | yes |
| [`simulation-actions.ts`](../../apps/web/server/actions/simulation-actions.ts) | `createSimulatedOrderAction`, `toggleWatchlistAction`, `resetSimulationAccountAction`, `startSimulationSessionAction` | yes (6 calls) |
| [`account-actions.ts`](../../apps/web/server/actions/account-actions.ts) | `updateProfileAction`, `changePasswordAction`, `updateWorkspacePreferencesAction` | yes (14 calls) |
| [`broker-mode-actions.ts`](../../apps/web/server/actions/broker-mode-actions.ts) | `emergencyStopAction` (kill switch), `pauseSimulationAction` | yes (8 calls) |
| [`ai-simulation-agent-actions.ts`](../../apps/web/server/actions/ai-simulation-agent-actions.ts) | `runAiSimulationAgentAction`, `confirmAiSimulationTradeAction` (confirm-before-execute) | yes |
| [`admin-monitor-actions.ts`](../../apps/web/server/actions/admin-monitor-actions.ts) | `saveProviderMonitorConfigAction` | yes |
| [`finance-actions.ts`](../../apps/web/server/actions/finance-actions.ts) | `generateSimulatedBrokerActivityAction`, `saveSimulatedBrokerActivityToJournalAction` | yes |
| [`auth-actions.ts`](../../apps/web/server/actions/auth-actions.ts) | `loginAction`, `registerAction`, `signOutAction` | (cookie/redirect) |
| [`locale-actions.ts`](../../apps/web/server/actions/locale-actions.ts) | `setLocalePreferenceAction` | yes (12 calls) |

> Rule: [../../.claude/rules/server-action-write-path.md](../../.claude/rules/server-action-write-path.md).
> Execution actions additionally run risk gates
> ([../../.claude/rules/risk-gates-required.md](../../.claude/rules/risk-gates-required.md))
> and the kill switch ([../../.claude/rules/kill-switch-rule.md](../../.claude/rules/kill-switch-rule.md)).

---

## 6. Cross-cutting folders

### `config/`
- [`broker-mode-registry.ts`](../../apps/web/server/config/broker-mode-registry.ts) — static
  broker mode definitions (`getBrokerModeConfig`).

### `env/` (server-only)
- [`ai-agent-env.ts`](../../apps/web/server/env/ai-agent-env.ts) — validated AI agent config.
- [`broker-env.ts`](../../apps/web/server/env/broker-env.ts) — validated broker config. Secrets
  never leave the server ([../../.claude/rules/env-secret-rule.md](../../.claude/rules/env-secret-rule.md)).

### `auth/`
- [`session.ts`](../../apps/web/server/auth/session.ts) — `requireCurrentSession` (redirects),
  `getOptionalCurrentSession` (guest-aware).
- [`cookies.ts`](../../apps/web/server/auth/cookies.ts), [`session-token.ts`](../../apps/web/server/auth/session-token.ts) — cookie + token handling.
- [`password.ts`](../../apps/web/server/auth/password.ts) — hashing/verification.
- [`service.ts`](../../apps/web/server/auth/service.ts), [`config.ts`](../../apps/web/server/auth/config.ts), [`routing.ts`](../../apps/web/server/auth/routing.ts), [`forms.ts`](../../apps/web/server/auth/forms.ts) — auth orchestration.

> Known baseline: `server/auth/service.test.ts` has a pre-existing typing issue
> (CLAUDE.md §4) — not a regression.

### `i18n/`
- [`locale.ts`](../../apps/web/server/i18n/locale.ts) — `getRequestLocale` (request-scoped from cookie).

### `lib/`
Shared server utilities. Highlights:
- [`quote-display.ts`](../../apps/web/server/lib/quote-display.ts) — `formatUsdPrice`, `formatPercentChange`, `formatFreshnessLabel` (display formatting only).
- [`provider-cache.ts`](../../apps/web/server/lib/provider-cache.ts), [`cache-key.ts`](../../apps/web/server/lib/cache-key.ts), [`revalidation-targets.ts`](../../apps/web/server/lib/revalidation-targets.ts) — caching + revalidation helpers.
- [`db-runtime.ts`](../../apps/web/server/lib/db-runtime.ts) — `withDbReadFallback` for DB-absence safety.
- [`rate-limit.ts`](../../apps/web/server/lib/rate-limit.ts), [`with-timeout.ts`](../../apps/web/server/lib/with-timeout.ts), [`provider-error-normalizer.ts`](../../apps/web/server/lib/provider-error-normalizer.ts) — provider resilience.
- [`alert-engine.ts`](../../apps/web/server/lib/alert-engine.ts), [`market-observation-engine.ts`](../../apps/web/server/lib/market-observation-engine.ts), [`macro-regime-engine.ts`](../../apps/web/server/lib/macro-regime-engine.ts), [`cross-asset-relationship-engine.ts`](../../apps/web/server/lib/cross-asset-relationship-engine.ts) — runtime analytical engines.
- [`perf.ts`](../../apps/web/server/lib/perf.ts), [`performance-timer.ts`](../../apps/web/server/lib/performance-timer.ts) — timing/observability.
- [`ai/`](../../apps/web/server/lib/ai), [`brokers/`](../../apps/web/server/lib/brokers) — AI helpers and broker glue.

### `news/`
- [`news-source-config.ts`](../../apps/web/server/news/news-source-config.ts) — news source registry.

---

## 7. Worked example: the portfolio vertical slice

This is a real end-to-end trace of the **read path** for `/portfolio`, using the actual
files. It is the cleanest 1:1 Query → Mapper → Service → Route slice in the app.

### Layer 1 — Query: [`server/queries/portfolio-query.ts`](../../apps/web/server/queries/portfolio-query.ts)

```ts
export type PortfolioReadModel = {
  workstation: Awaited<ReturnType<typeof getSimulationWorkstationStateForCurrentUser>>;
  sparklineBySymbol: Record<string, number[]>;
  assetBySymbol: Map<string, CatalogAsset>;
  watchedAssetIds: Set<string>;
};

export async function getPortfolioReadModel(): Promise<PortfolioReadModel> {
  const workstation = await withDbReadFallback(
    'portfolio-query:getSimulationWorkstationStateForCurrentUser',
    /* safe degraded default */,
    () => getSimulationWorkstationStateForCurrentUser(),
  );
  // + loadMiniHistorySeries for sparklines, asset map, watched ids
}
```

Gathers raw user state via the simulation workstation service and `@repo/db`. The
`withDbReadFallback` wrapper returns a `degraded` workstation state if the DB is absent —
never crashes. No formatting happens here.

### Layer 2 — Mapper: [`server/mappers/portfolio-mapper.ts`](../../apps/web/server/mappers/portfolio-mapper.ts)

```ts
export function mapInvestPortfolioViewModel(
  readModel: PortfolioReadModel,
  filters?: PortfolioFilterInput,
): InvestPortfolioViewModel { ... }
```

Pure, synchronous. Converts `PortfolioReadModel` into `InvestPortfolioViewModel`
(positions, allocation, recent trades, risk profile, route status), validated against
`investPortfolioViewModelSchema` from `@repo/api-contracts`. Derives `RouteStatus`
(`nominal` / `attention` / `degraded`) from `workstationStatus`. No I/O.

### Layer 3 — Service: [`server/services/portfolio-service.ts`](../../apps/web/server/services/portfolio-service.ts)

```ts
export async function getInvestPortfolioData(
  filters?: Partial<PortfolioFilterState>,
): Promise<InvestPortfolioViewModel> {
  const readModel = await getPortfolioReadModel();
  return mapInvestPortfolioViewModel(readModel, filters);
}
```

Orchestrates: calls the query, then the mapper, returning the route-facing view model.

### Layer 4 — Route: [`app/portfolio/page.tsx`](../../apps/web/app/portfolio/page.tsx)

```ts
export const dynamic = 'force-dynamic';            // user-specific → never cached

export default async function PortfolioRoutePage() {
  await requireCurrentSession('/login');           // auth gate
  const locale = await getRequestLocale();
  const portfolio = await getInvestPortfolioData({ // call service
    view: 'list', positionState: 'all', assetClass: 'all', lane: 'all',
  });

  if (portfolio.status === 'degraded' && !portfolio.summary) {
    return /* degraded Section */;                 // explicit degraded state
  }
  return /* render view model into components */;
}
```

The route enforces the session, sets `force-dynamic` (user-specific cache rule), calls
**only** the service, handles the degraded state, and passes the view model down.

### Layer 5 — UI: [`components/portfolio/`](../../apps/web/components/portfolio), [`components/stats/`](../../apps/web/components/stats), [`components/ui/`](../../apps/web/components/ui)

Components (`Section`, `Card`, `CompactStatCard`, position rows) render the pre-shaped view
model. They do **no** PnL/allocation math — those values arrive pre-computed from the DB
and mapper.

### Slice summary

```
getPortfolioReadModel()            getInvestPortfolioData()       PortfolioRoutePage()
portfolio-query.ts        ──►      portfolio-service.ts    ──►    app/portfolio/page.tsx
        │                                  │                              │
        │ raw read model         mapInvestPortfolioViewModel()    force-dynamic + auth
        └────────────────────────► portfolio-mapper.ts ──────────► <Section>/<Card>/<CompactStatCard>
                                   (pure view model)               (render only)
```
