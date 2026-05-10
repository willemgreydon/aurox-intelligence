# Provider Secret Safety

**Last updated:** 2026-05-10
**Applies to:** All packages and apps in the Aurox Intelligence monorepo

---

## Overview

This document describes how provider API keys and other secrets are handled throughout the system, which components access them, and what the safety constraints are.

---

## Secret Categories

| Category | Variables | Server-only | Client-accessible |
|---|---|---|---|
| Session auth | `AUTH_SECRET` | Yes | No |
| Database | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DIRECT_URL` | Yes | No |
| Market providers | `POLYGON_API_KEY`, `TIINGO_API_KEY`, `TWELVE_DATA_API_KEY`, `COINGECKO_API_KEY`, `FINNHUB_API_KEY`, `EODHD_API_KEY` | Yes | No |
| News providers | `NEWS_API_KEY`, `ALPHAVANTAGE_API_KEY`, `FMP_API_KEY` | Yes | No |
| Broker — Binance | `BINANCE_API_KEY`, `BINANCE_API_SECRET` | Yes | No |
| Broker — Coinbase | `COINBASE_API_KEY_ID`, `COINBASE_API_KEY_SECRET`, `COINBASE_BEARER_TOKEN` | Yes | No |
| AI agents | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Yes | No |
| Public config | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENABLE_MARKET_NEWS` | No | Yes (safe) |

`NEXT_PUBLIC_*` variables are inlined at build time and safe to expose. All other variables must remain server-side only.

---

## Where Secrets Are Accessed

### Market Data Providers

**Package:** `packages/providers`

All provider API key reads are centralized in `packages/providers/src/config.ts` (or equivalent provider config module). No component or route handler accesses provider keys directly.

Access pattern:
```
packages/providers/src/config.ts  ← reads process.env.POLYGON_API_KEY
packages/providers/src/market/polygon-adapter.ts  ← calls config helper
apps/web/server/queries/  ← calls providers package functions
```

**Never acceptable:**
- `process.env.POLYGON_API_KEY` in `apps/web/app/**`
- `process.env.POLYGON_API_KEY` in `apps/web/components/**`
- Any API key in a client component (`"use client"`)

### Session Auth Secret

**Location:** `apps/web/server/auth/config.ts`, `apps/web/server/auth/session-token.ts`

`AUTH_SECRET` is used only in:
- HMAC-SHA256 signing of session tokens (`session-token.ts`)
- Validation of Zod config schema (`config.ts`)

**Never acceptable:**
- `AUTH_SECRET` logged to console
- `AUTH_SECRET` returned in any API response
- `AUTH_SECRET` passed as a prop

### Database URL

**Location:** `packages/db/src/client.ts` (or equivalent)

`DATABASE_URL` is read only inside `packages/db`. No route handler or component reads it directly.

**Never acceptable:**
- `DATABASE_URL` in `apps/web/app/**`
- `DATABASE_URL` in any client bundle

### Broker Credentials

**Location:** `packages/agents/src/brokers/`

`BINANCE_API_KEY`, `BINANCE_API_SECRET`, `COINBASE_API_KEY_ID`, `COINBASE_API_KEY_SECRET` are read only by broker adapter implementations in `packages/agents`.

**Never acceptable:**
- Broker secrets in server actions
- Broker secrets in API route handlers
- Broker secrets in UI components

---

## Admin Provider Monitor Page

**File:** `apps/web/app/admin/monitoring/providers/page.tsx`

The provider monitoring page shows which providers are configured. It does **not** expose raw API key values.

Safety behaviors:
1. **Key masking** — `maskIdentifier()` function shows only first 2 + last 2 characters: `po***on`
2. **Boolean-only detection** — `hasEnvKey()` returns `Boolean(process.env.POLYGON_API_KEY)` — the boolean is shown, not the value
3. **Read-only UI** — No form fields allow editing API keys; configuration is limited to enable/disable toggles
4. **Admin-only** — The entire `/admin/monitoring` subtree requires `role === 'admin'`

**What is shown:**
- Provider name
- Masked provider key identifier (2 chars + *** + 2 chars)
- Configured: true / false
- Runtime status: Healthy / Degraded / Unavailable / Disabled
- Enable/disable toggles

**What is never shown:**
- Raw API key values
- API key length
- Any part of the key beyond the first/last 2 characters

---

## Secret Audit Commands

Run these to verify no secrets have leaked into the codebase:

```bash
# Check for hardcoded API keys (common patterns)
grep -r "sk-\|pk_\|Bearer \|apiKey.*=.*[a-zA-Z0-9]{20}" \
  --include="*.ts" --include="*.tsx" \
  apps packages \
  | grep -v ".env\|test\|spec\|\.d\.ts"

# Verify no database URL in app code
grep -r "postgresql://\|mysql://\|mongodb://" \
  --include="*.ts" --include="*.tsx" \
  apps packages \
  | grep -v ".env\|packages/db"

# Verify provider keys not in web app layer
grep -r "POLYGON_API_KEY\|TIINGO_API_KEY\|FINNHUB_API_KEY\|BINANCE_API_SECRET\|COINBASE_API_KEY_SECRET" \
  --include="*.ts" --include="*.tsx" \
  apps/web/app apps/web/components \
  | grep "process\.env"

# Verify AUTH_SECRET not logged
grep -r "AUTH_SECRET\|authSecret\|sessionSecret" \
  --include="*.ts" --include="*.tsx" \
  apps/web \
  | grep -v "config\.ts\|session-token\.ts\|\.env"

# Verify no NEXT_PUBLIC_ prefix on sensitive vars
grep -r "NEXT_PUBLIC_AUTH\|NEXT_PUBLIC_DATABASE\|NEXT_PUBLIC_API_KEY\|NEXT_PUBLIC_SECRET" \
  --include="*.ts" --include="*.tsx" --include="*.env*" \
  .
```

---

## Secret Rotation Procedure

### AUTH_SECRET rotation

1. Generate a new secret: `openssl rand -base64 48`
2. Update in Vercel environment variables
3. Redeploy (or restart server)
4. **All existing sessions are immediately invalidated** — users will need to log in again. This is expected and safe.

### Provider API key rotation

1. Generate new key in provider dashboard
2. Update env var in Vercel
3. No redeploy required (server-side env vars load at request time in serverless functions)
4. Revoke the old key in provider dashboard after confirming the new key works

### Broker credentials rotation

1. Generate new API key/secret in broker dashboard
2. Update env vars in Vercel
3. Test with `BROKER_DRY_RUN=true` before enabling live orders
4. Revoke old credentials in broker dashboard

---

## Security Rules (from `.claude/rules/env-secret-rule.md`)

- No secrets in source code — ever
- `.env`, `.env.local`, `.env.production` are never committed
- All secrets accessed via validated config helpers in the owning package
- Server-only secrets must never appear in client bundles
- `NEXT_PUBLIC_*` prefix must never be used on secrets

---

## Risk: Client Bundle Leakage

Next.js server components can accidentally serialize server-side data into the client bundle if data is passed through props or serialized to JSON without care. To prevent this:

1. API route handlers strip sensitive fields before `NextResponse.json()` (see login/register/verify-email routes)
2. Session cookies contain only a signed opaque token — no user data
3. The `authenticatedSessionSchema` in `apps/web/server/auth/session.ts` explicitly selects only safe fields from DB rows
4. `getOptionalCurrentSession()` returns only `AccountUser` fields — never `passwordHash`
