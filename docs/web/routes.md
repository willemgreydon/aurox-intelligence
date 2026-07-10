# Web Route Catalogue

**Scope:** every route under [`apps/web/app`](../../apps/web/app). Grouped by area.
Companion: [README.md](./README.md), [data-flow.md](./data-flow.md).

**Legend**

- **Rendering** — value of `export const dynamic` / `export const revalidate` in the
  `page.tsx`. `force-dynamic` = rendered per request; `revalidate=N` = ISR with an N-second
  window; `default` = no explicit directive (static/route-segment default).
- **User-specific** — Yes when the route reads per-user financial/account state and so must
  be `force-dynamic` / `no-store` per
  [../../.claude/rules/user-specific-cache-rule.md](../../.claude/rules/user-specific-cache-rule.md).
  These routes call `requireCurrentSession` or render personalized portfolio/account data.
- **Auth** — `requireCurrentSession` redirects to `/login` when unauthenticated;
  `getOptionalCurrentSession` renders for guests with a degraded/CTA state.

> 47 page routes + 14 API route handlers catalogued (61 total).

---

## Root / shell

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/` | [`app/page.tsx`](../../apps/web/app/page.tsx) | Landing / market overview; market graph + news + simulation overview. Guest-aware (`getOptionalCurrentSession`). | `force-dynamic` | Partial |
| _layout_ | [`app/layout.tsx`](../../apps/web/app/layout.tsx) | Root HTML shell, providers, navigation. | — | — |

---

## Dashboard

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/dashboard` | [`app/dashboard/page.tsx`](../../apps/web/app/dashboard/page.tsx) | Mission-control cockpit; executive + intelligence services, next-best-actions. `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Markets

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/market` | [`app/market/page.tsx`](../../apps/web/app/market/page.tsx) | Market graph + news stream (market-graph-service, news-service). | `revalidate=30` | No |
| `/markets/intelligence` | [`app/markets/intelligence/page.tsx`](../../apps/web/app/markets/intelligence/page.tsx) | Market intelligence workstation. | `force-dynamic` | No |
| `/markets/rankings` | [`app/markets/rankings/page.tsx`](../../apps/web/app/markets/rankings/page.tsx) | Ranked assets / screener (invest-service + intelligence-service). | `revalidate=30` | No |
| `/macro` | [`app/macro/page.tsx`](../../apps/web/app/macro/page.tsx) | Macro regime intelligence. | `force-dynamic` | No |
| `/news` | [`app/news/page.tsx`](../../apps/web/app/news/page.tsx) | News stream + news intelligence. | `force-dynamic` | No |

---

## Stocks

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/stocks` | [`app/stocks/page.tsx`](../../apps/web/app/stocks/page.tsx) | Stock catalogue + market graph (`getStockCatalogPageData`). Guest-aware. | `force-dynamic` | Partial |
| `/stocks/[symbol]` | [`app/stocks/[symbol]/page.tsx`](../../apps/web/app/stocks/[symbol]/page.tsx) | Stock detail (dynamic segment). | `force-dynamic` | Partial |

---

## FX

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/fx` | [`app/fx/page.tsx`](../../apps/web/app/fx/page.tsx) | FX overview (fx-service). | `force-dynamic` | No |
| `/fx/[pair]` | [`app/fx/[pair]/page.tsx`](../../apps/web/app/fx/[pair]/page.tsx) | FX pair detail (dynamic segment). | `force-dynamic` | No |

---

## Invest (simulation-first execution surface)

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/invest` | [`app/invest/page.tsx`](../../apps/web/app/invest/page.tsx) | Invest overview: investable assets, quick trade, broker launchpad, ranked panel. | `force-dynamic` | Yes |
| `/invest/overview` | [`app/invest/overview/page.tsx`](../../apps/web/app/invest/overview/page.tsx) | Invest overview workstation. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/invest/portfolio` | [`app/invest/portfolio/page.tsx`](../../apps/web/app/invest/portfolio/page.tsx) | Invest-scoped portfolio view. | `force-dynamic` | Yes |
| `/invest/simulation` | [`app/invest/simulation/page.tsx`](../../apps/web/app/invest/simulation/page.tsx) | Simulation trade workstation. | `force-dynamic` | Yes |
| `/invest/orders` | [`app/invest/orders/page.tsx`](../../apps/web/app/invest/orders/page.tsx) | Simulation order history. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/invest/accounts` | [`app/invest/accounts/page.tsx`](../../apps/web/app/invest/accounts/page.tsx) | Linked / simulation accounts. | `force-dynamic` | Yes |
| `/invest/stocks` | [`app/invest/stocks/page.tsx`](../../apps/web/app/invest/stocks/page.tsx) | Investable stocks list. | `force-dynamic` | Partial |
| `/invest/stocks/[symbol]` | [`app/invest/stocks/[symbol]/page.tsx`](../../apps/web/app/invest/stocks/[symbol]/page.tsx) | Investable stock detail + simulate. | `force-dynamic` | Partial |
| `/invest/etfs` | [`app/invest/etfs/page.tsx`](../../apps/web/app/invest/etfs/page.tsx) | Investable ETFs list. | `force-dynamic` | Partial |
| `/invest/etfs/[symbol]` | [`app/invest/etfs/[symbol]/page.tsx`](../../apps/web/app/invest/etfs/[symbol]/page.tsx) | Investable ETF detail. | `force-dynamic` | Partial |
| `/invest/crypto` | [`app/invest/crypto/page.tsx`](../../apps/web/app/invest/crypto/page.tsx) | Investable crypto list. | `force-dynamic` | Partial |
| `/invest/crypto/[symbol]` | [`app/invest/crypto/[symbol]/page.tsx`](../../apps/web/app/invest/crypto/[symbol]/page.tsx) | Investable crypto detail. | `force-dynamic` | Partial |
| `/invest/broker-modes` | [`app/invest/broker-modes/page.tsx`](../../apps/web/app/invest/broker-modes/page.tsx) | Broker mode selection. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/invest/broker-health` | [`app/invest/broker-health/page.tsx`](../../apps/web/app/invest/broker-health/page.tsx) | Broker health panel. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/invest/live-readiness` | [`app/invest/live-readiness/page.tsx`](../../apps/web/app/invest/live-readiness/page.tsx) | Live readiness gate status (FUTURE live path). `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Portfolio

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/portfolio` | [`app/portfolio/page.tsx`](../../apps/web/app/portfolio/page.tsx) | Portfolio cockpit (positions, allocation, recent trades). `requireCurrentSession`. | `force-dynamic` | Yes |
| `/portfolio/intelligence` | [`app/portfolio/intelligence/page.tsx`](../../apps/web/app/portfolio/intelligence/page.tsx) | Portfolio intelligence analytics. | `force-dynamic` | Yes |
| `/watchlist` | [`app/watchlist/page.tsx`](../../apps/web/app/watchlist/page.tsx) | Watchlist + simulation portfolio page. `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Account

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/account` | [`app/account/page.tsx`](../../apps/web/app/account/page.tsx) | Account overview cockpit (moneyflow, P&L, activity analytics). `requireCurrentSession`. | `force-dynamic` | Yes |
| `/account/activity` | [`app/account/activity/page.tsx`](../../apps/web/app/account/activity/page.tsx) | Account activity feed. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/account/profile` | [`app/account/profile/page.tsx`](../../apps/web/app/account/profile/page.tsx) | Profile management. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/account/settings` | [`app/account/settings/page.tsx`](../../apps/web/app/account/settings/page.tsx) | Workspace preferences / settings. `requireCurrentSession`. | `force-dynamic` | Yes |
| _layout_ | [`app/account/layout.tsx`](../../apps/web/app/account/layout.tsx) | Account section shell. | — | — |

---

## Signals

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/signals` | [`app/signals/page.tsx`](../../apps/web/app/signals/page.tsx) | Signals workstation (analysis-service, `getSignalsPageData`). | `force-dynamic` | No |

---

## Forecasts

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/forecasts` | [`app/forecasts/page.tsx`](../../apps/web/app/forecasts/page.tsx) | Forecast workstation (`getForecastWorkstationData`). | `force-dynamic` | No |

---

## Observe

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/observe` | [`app/observe/page.tsx`](../../apps/web/app/observe/page.tsx) | Market observation feed. `requireCurrentSession`. | `force-dynamic` | Yes |
| `/observe/[id]` | [`app/observe/[id]/page.tsx`](../../apps/web/app/observe/[id]/page.tsx) | Observation detail (dynamic segment). `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Replay

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/replay/[id]` | [`app/replay/[id]/page.tsx`](../../apps/web/app/replay/[id]/page.tsx) | Intelligence/decision replay (replay-service). `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Alerts

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/alerts` | [`app/alerts/page.tsx`](../../apps/web/app/alerts/page.tsx) | Alert center (alert-center-service). `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Finance

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/finance` | [`app/finance/page.tsx`](../../apps/web/app/finance/page.tsx) | Claude finance cockpit (`getClaudeFinanceCockpitData`). `requireCurrentSession`. | `force-dynamic` | Yes |

---

## Admin

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/admin` | [`app/admin/page.tsx`](../../apps/web/app/admin/page.tsx) | Admin monitoring overview (`getAdminMonitoringData`). | `force-dynamic` | Yes (privileged) |
| `/admin/monitoring` | [`app/admin/monitoring/page.tsx`](../../apps/web/app/admin/monitoring/page.tsx) | System monitoring panel. | `force-dynamic` | Yes (privileged) |
| `/admin/monitoring/providers` | [`app/admin/monitoring/providers/page.tsx`](../../apps/web/app/admin/monitoring/providers/page.tsx) | Provider health monitoring + config. | `force-dynamic` | Yes (privileged) |
| `/admin/live-readiness` | [`app/admin/live-readiness/page.tsx`](../../apps/web/app/admin/live-readiness/page.tsx) | Live readiness operations (FUTURE live path). | `force-dynamic` | Yes (privileged) |
| _layout_ | [`app/admin/layout.tsx`](../../apps/web/app/admin/layout.tsx) | Admin section shell. | — | — |

---

## Auth

| Path | File | Purpose | Rendering | User-specific |
|---|---|---|---|---|
| `/login` | [`app/login/page.tsx`](../../apps/web/app/login/page.tsx) | Login form. | `default` | No |
| `/signup` | [`app/signup/page.tsx`](../../apps/web/app/signup/page.tsx) | Registration form. | `default` | No |
| `/forgot-password` | [`app/forgot-password/page.tsx`](../../apps/web/app/forgot-password/page.tsx) | Password reset request form. | `default` | No |

> Auth pages are public and render with the default (static-eligible) strategy; the
> mutation work happens in [`server/actions/auth-actions.ts`](../../apps/web/server/actions/auth-actions.ts)
> and the `/api/auth/*` handlers below.

---

## Legal

All under [`app/legal/`](../../apps/web/app/legal). Static content, `default` rendering,
not user-specific.

| Path | File |
|---|---|
| `/legal` | [`app/legal/page.tsx`](../../apps/web/app/legal/page.tsx) |
| `/legal/ai-disclaimer` | [`app/legal/ai-disclaimer/page.tsx`](../../apps/web/app/legal/ai-disclaimer/page.tsx) |
| `/legal/contact-support` | [`app/legal/contact-support/page.tsx`](../../apps/web/app/legal/contact-support/page.tsx) |
| `/legal/cookie-notice` | [`app/legal/cookie-notice/page.tsx`](../../apps/web/app/legal/cookie-notice/page.tsx) |
| `/legal/imprint` | [`app/legal/imprint/page.tsx`](../../apps/web/app/legal/imprint/page.tsx) |
| `/legal/market-data-disclaimer` | [`app/legal/market-data-disclaimer/page.tsx`](../../apps/web/app/legal/market-data-disclaimer/page.tsx) |
| `/legal/privacy` | [`app/legal/privacy/page.tsx`](../../apps/web/app/legal/privacy/page.tsx) |
| `/legal/risk-disclosure` | [`app/legal/risk-disclosure/page.tsx`](../../apps/web/app/legal/risk-disclosure/page.tsx) |
| `/legal/simulation-disclaimer` | [`app/legal/simulation-disclaimer/page.tsx`](../../apps/web/app/legal/simulation-disclaimer/page.tsx) |
| `/legal/terms` | [`app/legal/terms/page.tsx`](../../apps/web/app/legal/terms/page.tsx) |

---

## API route handlers

Under [`app/api/`](../../apps/web/app/api). These are thin transport endpoints — they
delegate to services/repositories and never embed domain math.

| Path | Method | File | Purpose |
|---|---|---|---|
| `/api/health` | GET | [`app/api/health/route.ts`](../../apps/web/app/api/health/route.ts) | Health probe. |
| `/api/market/quote` | GET | [`app/api/market/quote/route.ts`](../../apps/web/app/api/market/quote/route.ts) | Single-symbol quote (provider-backed via service). |
| `/api/market/history` | GET | [`app/api/market/history/route.ts`](../../apps/web/app/api/market/history/route.ts) | OHLCV history for a symbol. |
| `/api/invest/simulation/journal` | GET | [`app/api/invest/simulation/journal/route.ts`](../../apps/web/app/api/invest/simulation/journal/route.ts) | Simulation journal feed. `force-dynamic` (user-specific). |
| `/api/alerts/[id]/state` | POST | [`app/api/alerts/[id]/state/route.ts`](../../apps/web/app/api/alerts/[id]/state/route.ts) | Update alert state. |
| `/api/observe/events/[id]/state` | POST | [`app/api/observe/events/[id]/state/route.ts`](../../apps/web/app/api/observe/events/[id]/state/route.ts) | Update observation/event state. |
| `/api/auth/login` | POST | [`app/api/auth/login/route.ts`](../../apps/web/app/api/auth/login/route.ts) | Authenticate + set session cookie. |
| `/api/auth/logout` | POST | [`app/api/auth/logout/route.ts`](../../apps/web/app/api/auth/logout/route.ts) | Clear session. |
| `/api/auth/register` | POST | [`app/api/auth/register/route.ts`](../../apps/web/app/api/auth/register/route.ts) | Register a new user. |
| `/api/auth/session` | GET | [`app/api/auth/session/route.ts`](../../apps/web/app/api/auth/session/route.ts) | Current session lookup. |
| `/api/auth/forgot-password` | POST | [`app/api/auth/forgot-password/route.ts`](../../apps/web/app/api/auth/forgot-password/route.ts) | Trigger password reset. |
| `/api/auth/reset-password` | POST | [`app/api/auth/reset-password/route.ts`](../../apps/web/app/api/auth/reset-password/route.ts) | Complete password reset. |
| `/api/auth/verify-email` | POST | [`app/api/auth/verify-email/route.ts`](../../apps/web/app/api/auth/verify-email/route.ts) | Verify email token. |

> **Mutation note.** UI-driven writes (trades, watchlist, account, broker mode) go through
> **Server Actions** in [`server/actions/`](../../apps/web/server/actions), not these API
> handlers. The `/api/*` handlers exist for transport-style reads and the auth flow.
