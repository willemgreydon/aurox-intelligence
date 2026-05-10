# Security Route Protection Matrix

**Last updated:** 2026-05-10
**Applies to:** `apps/web` (Next.js App Router)

---

## Protection Layers

Aurox uses three independent protection layers:

| Layer | Location | Enforces |
|---|---|---|
| **Edge middleware** | `apps/web/proxy.ts` | Session cookie presence (authentication) |
| **Layout guard** | `apps/web/app/*/layout.tsx` | Role-based authorization |
| **Route/API guard** | API route handlers | Session presence + user scope |

---

## Page Routes

### Public routes — no authentication required

| Route | Middleware | Layout guard | Notes |
|---|---|---|---|
| `/` | Not matched | None | Public home page |
| `/market` | Not matched | None | Public market overview |
| `/stocks/[symbol]` | Not matched | None | Public asset detail |
| `/invest/crypto/[symbol]` | Not matched | None | Public crypto detail |
| `/invest/etfs/[symbol]` | Not matched | None | Public ETF detail |
| `/signals` | Not matched | None | Public signal overview |
| `/news` | Not matched | None | Public news feed |
| `/alerts` | Not matched | None | Public alert center (read) |
| `/observe` | Not matched | None | Public market observation |
| `/dashboard` | Not matched | None | Public dashboard |
| `/watchlist` | Not matched | None | Public watchlist |
| `/portfolio/intelligence` | Not matched | None | Public intelligence view |
| `/legal/privacy` | Not matched | None | Legal page |
| `/legal/terms` | Not matched | None | Legal page |

### Guest-only routes — redirect authenticated users away

| Route | Redirect behavior |
|---|---|
| `/login` | Authenticated users → `/account` (or `?next=` target) |
| `/signup` | Authenticated users → `/account` (or `?next=` target) |

Enforced by: `isGuestOnlyPath()` in `proxy.ts` + `redirectIfAuthenticated()` called from page.

### Auth-required routes — redirect unauthenticated users to login

| Route | Middleware | Layout guard | Unauthenticated behavior | Non-admin behavior |
|---|---|---|---|---|
| `/account` | `isProtectedPath()` → redirect `/login?next=/account` | `requireCurrentSession()` | → `/login` | Allowed |
| `/account/profile` | `isProtectedPath()` | `requireCurrentSession()` | → `/login` | Allowed |
| `/account/settings` | `isProtectedPath()` | `requireCurrentSession()` | → `/login` | Allowed |
| `/account/activity` | `isProtectedPath()` | `requireCurrentSession()` | → `/login` | Allowed |

### Admin-only routes — authentication + admin role required

| Route | Middleware | Layout guard | Unauthenticated behavior | Non-admin behavior |
|---|---|---|---|---|
| `/admin` | `isProtectedPath()` → redirect `/login` | `requireCurrentSession()` + role check | → `/login` | 404 (via `notFound()`) |
| `/admin/monitoring` | `isProtectedPath()` | Inherits admin layout | → `/login` | 404 |
| `/admin/monitoring/providers` | `isProtectedPath()` | Inherits admin layout | → `/login` | 404 |
| `/admin/live-readiness` | `isProtectedPath()` | Inherits admin layout | → `/login` | 404 |

**Defense in depth:** Even if middleware is bypassed (e.g. direct server render), `apps/web/app/admin/layout.tsx` re-checks `role === 'admin'` and calls `notFound()`.

---

## API Routes

### Public — no authentication required

| Route | Method | Notes / Risk |
|---|---|---|
| `GET /api/health` | GET | Returns `{ok:true,service:'web'}`. Intentionally public for load balancer health checks. Low information exposure. |
| `GET /api/market/quote` | GET | Public read-only market data. No user-specific data returned. Accepts `symbol` + optional `assetClass`. |
| `GET /api/market/history` | GET | Public read-only OHLCV bars. No user-specific data. |

**Risk note:** Market data routes are intentionally public to support unauthenticated charting and dashboard views. They do not expose any user or account data.

### Auth-required — session required, returns 401 otherwise

| Route | Method | Guard | Notes |
|---|---|---|---|
| `POST /api/auth/login` | POST | n/a (auth entry point) | Returns safe user DTO; strips `passwordHash` |
| `POST /api/auth/register` | POST | n/a (auth entry point) | Returns safe user DTO |
| `POST /api/auth/logout` | POST | `requireCurrentSession()` | Revokes session token; clears cookie |
| `GET /api/auth/session` | GET | `getOptionalCurrentSession()` | Returns current safe user or null |
| `POST /api/auth/forgot-password` | POST | n/a (public reset initiation) | Always returns generic response (timing-safe) |
| `POST /api/auth/reset-password` | POST | n/a (token-based) | Validates token; returns `{success, message}` only |
| `GET /api/auth/verify-email` | GET | n/a (token-based) | Strips `passwordHash` before response |
| `POST /api/auth/verify-email` | POST | n/a (token-based) | Strips `passwordHash` before response |
| `POST /api/alerts/[id]/state` | POST | `requireCurrentSession()` at route level | Scoped to `session.user.id` |
| `POST /api/observe/events/[id]/state` | POST | `requireCurrentSession()` at route level | Scoped to `session.user.id` |
| `GET /api/invest/simulation/journal` | GET | `getOptionalCurrentSession()` at route level + `requireCurrentSession()` inside service | Returns CSV; scoped to current user |

---

## Protection Rules Summary

### `AUTH_PROTECTED_PREFIXES`
```
['/account', '/admin']
```

### `AUTH_GUEST_ONLY_ROUTES`
```
['/login', '/signup']
```

### Middleware matcher (`proxy.ts`)
```
['/account/:path*', '/admin/:path*', '/admin', '/login', '/signup']
```

---

## Known Gaps / Intentional Decisions

| Item | Decision | Rationale |
|---|---|---|
| `/api/market/quote` public | Intentional | Unauthenticated charts and dashboards require market data |
| `/api/market/history` public | Intentional | Same as above |
| `/api/health` public | Intentional | Load balancer / uptime monitoring |
| No rate limiting on auth endpoints | Gap — see deployment checklist | Should be handled at reverse proxy / Vercel WAF layer |
| No CSRF token on API routes | Covered by Next.js Server Actions + SameSite=Lax cookie | Direct API POST from cross-origin is blocked by SameSite |

---

## Role Values

| Role | Access |
|---|---|
| `member` | All `/account/*` routes; no admin |
| `admin` | All `/account/*` + all `/admin/*` routes |
