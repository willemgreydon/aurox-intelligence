# Production Deployment Checklist

**Last updated:** 2026-05-10
**Applies to:** Aurox Intelligence — `apps/web` on Vercel + Neon/Postgres

---

## Pre-deployment Checklist

### 1. Required Environment Variables

These **must** be set before deployment. The app will fail to start or behave incorrectly without them.

| Variable | Description | Requirements |
|---|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection string | Starts with `postgresql://`; SSL required |
| `AUTH_SECRET` | HMAC signing key for session tokens | Minimum **32 characters**; use `openssl rand -base64 48` |
| `AUTH_SESSION_DAYS` | Session lifetime in days | Recommended: `30` (range: 1–90) |
| `NEXT_PUBLIC_APP_URL` | Canonical production URL | e.g. `https://app.aurox.ai` — no trailing slash |
| `APP_BASE_URL` | Server-side base URL (same as above) | Same value as `NEXT_PUBLIC_APP_URL` |
| `NODE_ENV` | Runtime environment | Must be `production` |

### 2. Auth / Session Variables

| Variable | Value in Production |
|---|---|
| `AUTH_SECRET` | Long random secret (≥32 chars) — **never reuse dev secret** |
| `AUTH_SESSION_DAYS` | `30` (default) or your chosen value |

**Verification:** If `AUTH_SECRET` is missing or < 32 characters, the app throws on startup. Check `apps/web/server/auth/config.ts`.

### 3. Database Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection (use pgBouncer pooled URL) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection (for migrations only) |
| `DIRECT_URL` | Same as `DATABASE_URL_UNPOOLED` if using Prisma |
| `ENABLE_PRISMA_DB` | `true` in production |
| `DB_READ_TIMEOUT_MS` | `2000` (default) — increase if latency is high |

**Migration command (run before deploy):**
```bash
node packages/db/scripts/migrate.mjs
```

### 4. Market Data Provider Variables

At least one market data provider must be configured. Recommended minimum: Polygon + CoinGecko.

| Variable | Provider | Required |
|---|---|---|
| `POLYGON_API_KEY` | Polygon.io — stocks, ETFs | Strongly recommended |
| `TIINGO_API_KEY` | Tiingo — stocks, ETFs | Optional fallback |
| `TWELVE_DATA_API_KEY` | Twelve Data — stocks, ETFs, crypto | Optional fallback |
| `COINGECKO_API_KEY` | CoinGecko — crypto | Recommended for crypto |
| `FINNHUB_API_KEY` | Finnhub — stocks | Optional |
| `EODHD_API_KEY` | EOD Historical Data | Optional |

**What happens without provider keys:** Market data routes return 503; charts show "data unavailable". Simulation still works (uses last stored prices).

### 5. Broker Execution Variables

Default is simulation-only. Do not enable live trading until fully validated.

| Variable | Production Default | Notes |
|---|---|---|
| `BROKER_EXECUTION_PROVIDER` | `simulation` | Keep as `simulation` until live validated |
| `BROKER_DRY_RUN` | `true` | Keep `true` until live trading is approved |
| `BROKER_SANDBOX_MODE` | `true` | Keep `true` until live trading is approved |
| `BROKER_ALLOWED_LIVE_MODE_IDS` | _(empty)_ | Only set when live trading is explicitly approved |

### 6. AI / Simulation Agent Variables (Optional)

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Required for AI simulation agent |
| `OPENAI_API_KEY` | Optional fallback AI provider |
| `AI_PRIMARY_PROVIDER` | `anthropic` (default) |
| `AI_FALLBACK_PROVIDER` | `openai` (default) |

### 7. Vercel-Specific Settings

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | `apps/web` |
| Build command | `pnpm build:web` or `cd ../.. && pnpm build:web` |
| Output directory | `.next` (auto-detected) |
| Install command | `pnpm install --frozen-lockfile` |
| Node.js version | 20.x |

**Environment variable scoping:**
- All `NEXT_PUBLIC_*` vars must be set as "Preview + Production" (they are inlined at build time)
- All server-side secrets (`AUTH_SECRET`, `DATABASE_URL`, API keys) must be set as "Production" only

### 8. Domain / DNS

- [ ] Custom domain configured in Vercel project settings
- [ ] DNS A/CNAME record pointing to Vercel
- [ ] SSL certificate issued (Vercel handles this automatically)
- [ ] `NEXT_PUBLIC_APP_URL` set to the final domain (e.g. `https://app.aurox.ai`)
- [ ] `APP_BASE_URL` set to the same value

---

## Build Commands

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run database migrations (before first deploy and after schema changes)
node packages/db/scripts/migrate.mjs

# Build web app
pnpm build:web

# Type check (run before every deploy)
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/providers typecheck

# Run tests
pnpm test
```

---

## Smoke Tests (Post-Deploy)

Run these manually after each production deployment:

- [ ] **Home page loads** — `GET /` returns 200 with no JS errors in console
- [ ] **Market data** — `/market` shows at least one price update
- [ ] **Login flow** — can register a new account and log in
- [ ] **Session persistence** — refresh page stays logged in
- [ ] **Logout** — session cookie is cleared, redirects to login
- [ ] **Admin protection** — visiting `/admin` when logged out redirects to `/login`
- [ ] **Admin role gate** — non-admin user visiting `/admin` gets 404
- [ ] **Simulation trade** — can submit a simulation buy order (if DB connected)
- [ ] **Security headers** — verify with `curl -I https://<domain>/` that headers are present:
  - `x-content-type-options: nosniff`
  - `x-frame-options: SAMEORIGIN`
  - `referrer-policy: strict-origin-when-cross-origin`
  - `permissions-policy: camera=(), ...`

---

## Rollback Checklist

If a deploy fails or produces regressions:

1. **Vercel instant rollback** — In Vercel dashboard → Deployments → click previous deployment → "Promote to Production"
2. **DB migration rollback** — Only applicable if a destructive migration was run. See migration file for `-- Rollback:` comment.
3. **Secret rotation** — If `AUTH_SECRET` is changed, all existing sessions are invalidated (users must log in again). This is expected.
4. **Provider key rotation** — Replace the env var in Vercel dashboard; redeploy is not required (server-side env vars are loaded at request time in Next.js edge/server functions).

---

## Security Verification Checklist

Before every production deploy:

- [ ] `AUTH_SECRET` is not the dev placeholder (`replace_with_a_long_random_secret`)
- [ ] `AUTH_SECRET` is at least 32 characters
- [ ] `BROKER_DRY_RUN=true` (unless live trading explicitly approved)
- [ ] `BROKER_SANDBOX_MODE=true` (unless live trading explicitly approved)
- [ ] No API keys are hardcoded in source (run: `grep -r "sk-\|pk_" apps packages --include="*.ts"`)
- [ ] `.env` file is not committed (run: `git status | grep -E "\.env"`)
- [ ] `NODE_ENV=production` is set
- [ ] Security headers are served (verify with curl post-deploy)
- [ ] All simulation accounting tables are present in DB (run migrate.mjs)

---

## Security Smoke Tests (Post-Deploy)

Run these after each production deployment to verify the security posture is intact.

### Auth Flows

```bash
BASE=https://app.aurox.ai   # replace with your domain

# 1. Login smoke — valid credentials return a session cookie, not a 500
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"testpassword"}' \
  # Expected: 401 (bad credentials) or 200 (if smoke account exists) — NOT 500

# 2. Register with duplicate email should return 409, not 500
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"existing@example.com","password":"Password1!"}' \
  # Expected: 409 or 400 — NOT 500

# 3. Forgot-password always returns 200 regardless of whether email exists
curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent-user-xkcd@example.com"}'
  # Expected: 200 with "If an account exists..." message — NOT 404 or 500
```

Checklist:
- [ ] Login endpoint returns auth error (not 500) for invalid credentials
- [ ] Register returns consistent error for duplicate email
- [ ] Forgot-password returns 200 for nonexistent email (no info leak)

### Logout & Session

- [ ] POST to `/api/auth/logout` clears session cookie (verify `Set-Cookie` header clears the session)
- [ ] After logout, `GET /api/auth/session` returns `{ user: null }` or 401
- [ ] Refreshing a protected page after logout redirects to `/login`

### Protected Route Enforcement

```bash
# Protected API should reject unauthenticated requests
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/invest/simulation/journal"
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" "$BASE/api/alerts"
# Expected: 401 or redirect

# Public market API should work without auth
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/market/quote?symbol=AAPL"
# Expected: 200 or 503 (if provider key missing) — NOT 401
```

Checklist:
- [ ] `/api/invest/simulation/journal` → 401 when unauthenticated
- [ ] `/api/alerts` → 401 when unauthenticated
- [ ] `/api/market/quote` → 200/503 (not 401) when unauthenticated — public endpoint

### Admin Route Enforcement

```bash
# Unauthenticated admin access should redirect (302) or return 404/401
curl -s -o /dev/null -w "%{http_code}" -L "$BASE/admin"
# Expected: 302 redirect to /login (follow redirects to see final landing)

curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/monitoring/providers"
# Expected: 302 (unauthenticated) or 404 (non-admin logged in)
```

Checklist:
- [ ] `/admin` redirects unauthenticated users to `/login`
- [ ] Non-admin authenticated user sees 404 on admin pages (not the admin content)
- [ ] Admin monitoring page does not leak provider API keys in the HTML response:

```bash
curl -s "$BASE/admin/monitoring/providers" | grep -i "api_key\|apikey\|secret"
# Expected: no matches
```

### Security Headers

```bash
curl -sI "$BASE/" | grep -iE "x-content-type|x-frame|referrer-policy|permissions-policy|strict-transport|content-security"
```

Expected output (production):
```
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), ...
strict-transport-security: max-age=63072000; includeSubDomains; preload
content-security-policy: frame-ancestors 'self'
```

Checklist:
- [ ] `x-content-type-options: nosniff` present
- [ ] `x-frame-options: SAMEORIGIN` present
- [ ] `referrer-policy: strict-origin-when-cross-origin` present
- [ ] `permissions-policy` present (camera, mic, geolocation all denied)
- [ ] `strict-transport-security` present with `preload` flag (production only)
- [ ] `content-security-policy` includes `frame-ancestors 'self'`
- [ ] `strict-transport-security` is NOT present on staging/dev (check with `NODE_ENV !== production`)

### Rate Limiting

```bash
# Spam the forgot-password endpoint — should receive 429 after 5 requests
for i in $(seq 1 7); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimitcheck@example.com"}')
  echo "Request $i: $STATUS"
done
# Expected: first 5 return 200, requests 6+ return 429
```

Checklist:
- [ ] Auth endpoints return 429 after limit is exceeded
- [ ] 429 response includes `retry-after` header
- [ ] 429 response body is generic (no email or account state revealed)

### Provider Monitor Safety

```bash
# The admin provider monitor page must not expose API keys
curl -s "$BASE/admin/monitoring/providers" -H "Cookie: <admin-session>" | \
  grep -E "sk-|pk_|api_key|apiKey|[A-Za-z0-9]{32,}"
# Expected: no API key strings in response
```

Checklist:
- [ ] Provider monitor shows provider name and status only
- [ ] No raw API key values appear in the HTML or JSON response
- [ ] Provider error messages do not include key fragments

---

## Environment Variable Validation

The app validates critical secrets at startup. Check `apps/web/server/auth/config.ts` for the Zod schema that enforces:
- `AUTH_SECRET` ≥ 32 characters
- `AUTH_SESSION_DAYS` in range 1–90

If either fails, the server logs an error and session token operations fail.
