# Aurox Intelligence — Current State

_A deterministic-first financial intelligence & simulation platform. Simulation is the default execution target; live trading is locked by design. Snapshot of the platform as currently deployed._

---

## 1. What it is

A multi-asset (stocks / ETFs / crypto) market-intelligence and **paper-trading** workstation: observe markets, derive explainable signals, run a deterministic simulation engine with full accounting, and surface everything through a localized financial-workstation UI. No real capital, no broker execution, no regulated order routing.

## 2. Stack & architecture

- **Frontend/runtime:** Next.js 16 (App Router, RSC), React 19, TypeScript strict.
- **Monorepo:** Turborepo + pnpm.
- **Data:** Neon Postgres via the raw `postgres` driver (no ORM), schema `app`, plain-SQL migrations.
- **Validation/contracts:** Zod-first, single source of truth in `@repo/api-contracts`.
- **Hosting:** Vercel (`aurox-intelligence-web`), domain `aurox.mitterbergerlab.at`. Git-connected: push to `main` → production build.

**Packages**

| Package | Owns |
|---|---|
| `api-contracts` | Zod schemas + shared types (roles, capabilities, simulation, quotes…) |
| `db` | SQL, repositories, migrations, transactions |
| `providers` | External market/macro/news adapters, fallback routing, health |
| `signals` / `forecasting` | Pure, deterministic derivation (no I/O) |
| `agents` | Trade workflows, risk gates, broker adapters (simulation-first) |
| `ai-market-intelligence` | Recommendation composition |
| `observability`, `design-tokens` | Logging/metrics, shared UI primitives |
| `apps/web` | Routes, server actions/services/mappers, UI |

**Canonical data flow:** `Query → Mapper → Service → Route → UI` (read) · `UI → Server Action → Zod → Domain Service → Repository (txn) → Revalidate` (write). UI renders pre-shaped read models; no domain math in components.

## 3. Feature areas (current behavior)

### Auth & identity
Hashed opaque session tokens, signed cookies, expiry + revocation, best-effort last-seen, **fail-closed reads** (DB outage → anonymous, never crashes the shell). Password policy + email-verification/reset token types modeled. OAuth (`auth_accounts`) scaffolded but unused.

### Roles & authorization (RBAC-lite)
- Flat DB role `member | admin` is the source of truth; **capabilities are derived from role** in `@repo/api-contracts` (`access_admin`, `manage_users`, `configure_providers`, `view_monitoring`, `activate_live`).
- Gates use **`requireCapability(...)`** (single seam), not scattered role checks. `/admin` renders an explicit **403** for non-admins (not a fake 404).
- **`activate_live` is deliberately NOT granted to admin** — enabling live execution will require explicit elevation beyond generic admin.
- **Admin → Manage Users:** make/revoke admin, **disable/reactivate** (disable also force-logs-out), **force-logout**. All admin-gated, Zod-validated, self-protected, and written **atomically with an append-only `admin_events` audit row**.
- **Bootstrap admin:** seeded via migration + a `before insert` trigger (race-proof regardless of registration order).

### Simulation engine
- Persisted ledger (accounts, portfolios, positions, orders, transactions, snapshots) with deterministic accounting and transactional multi-table writes.
- **Universe:** ~300+ symbols — ~39 curated first-class **`simulated`** assets (quoted, buyable) + the rest **`planned`** observation coverage. Individual symbols are promotable to first-class via a small allowlist (e.g. **COIN**). The tradable-universe explorer paginates the full set; the prior 120-item cap is gone.
- **Quote-usability gates before execution:** market-closed → uses last available quote (usable); missing price or stale-during-market-hours → blocked; the prepared ticket symbol is always quoted on demand.
- Risk/exposure checks (cash, per-asset cap, daily notional), watchlist, lane-tagged order audit, read-only **lane detail** view (`/invest/simulation/lanes/[laneId]`).
- The "1% rotation" setting is correctly surfaced as a **per-order micro-allocation cap** (config value; not enforced at execution today).

### Market data & providers
Adapters for polygon (default), twelve-data, tiingo, coingecko, finnhub, eodhd; explicit fallback routing, health checks, quote freshness/staleness metadata, batch quotes, per-render provider-call bounding. Admin monitoring at `/admin/monitoring` (+ `…/providers` config). Missing data → typed unavailable/low-confidence, never fabricated.

### Signals / forecasting / AI
Pure deterministic packages: signals return `{score, confidence, explanation}`; forecasts include confidence intervals; insufficient data → `confidence: 0`. AI/provider failures fail safe (default HOLD / degraded state), never presented as genuine analysis.

### Dashboard & UX
Executive command header, KPI strip (3/2/1 responsive), Mission Control (simulated account, moneyflow, risk, activity, next-best-actions), and 6 side panels (observations, alerts, sim readiness, provider health, signals, asset classes).

### Internationalization
**12 locales** (en, de, fr, es, it, pt, nl, zh, ja, ko, ar, hi), key-parity enforced by test. Dashboard, Claude Finance cockpit, lane detail, and simulation CTAs are fully localized natively. USD prices render in `en-US` convention (`$1,234.56`, leading symbol) regardless of UI language; brand tokens (Claude/Anthropic, tickers) untranslated.

### Live trading
**Locked.** Simulation is the default target; live paths are gated behind readiness checks and (soon) the `activate_live` capability. No autonomous execution.

## 4. Maturity

| Feature area | Maturity | Notes |
|---|---|---|
| Identity & sessions | 🟢 Strong | Hashed opaque tokens, revocation, expiry, signed cookies, fail-closed. |
| Roles / RBAC-lite | 🟢 Solid | Capability seam, `requireCapability`, atomic audit, anti-lockout. Still 2-tier (no operator/analyst split yet). |
| Admin console & user lifecycle | 🟢 Solid | Role toggle + disable/reactivate/force-logout, all audited. |
| Audit trail | 🟡 Good (partial) | Role + status + session events audited; profile/password changes not yet. |
| Simulation engine | 🟢 Strong | Deterministic accounting, transactional, auditable, quote-gated. |
| Asset universe | 🟢 Solid | Curated `simulated` + `planned` coverage; promotable; paginated. |
| Market data / providers | 🟢 Solid | Fallback routing, health, freshness, budget bounding. |
| Signals / forecasting | 🟢 Solid | Pure, deterministic, explainable, confidence-scored. |
| Dashboard & workstation UI | 🟢 Solid | Dense, responsive, all states handled. |
| Internationalization | 🟢 Strong | 12 locales, parity-tested, dashboard fully native. |
| AI market intelligence | 🟡 Adequate | Explainable + fail-safe; depth/coverage evolving. |
| Live trading | 🔒 Locked (by design) | Simulation-first; live gated, not enabled. |
| Authorization granularity | 🟡 Early | Capability seam in place; no permission table / fine-grained roles yet. |
| OAuth / SSO | ⚪ Scaffolded | `auth_accounts` shape ready; no provider wired. |
| GDPR / account deletion | 🔴 Missing | No export/anonymize/delete flow yet. |
| Automated tests | 🟡 Improving | Strong in db/signals/i18n; server-action/UI coverage partial. |

## 5. Deployment & operations

- **Deploy:** push `main` → Vercel auto-builds production. Keep `apps/web/vercel.json` cron **daily** (Hobby-plan limit) or deploys fail validation.
- **Database:** Neon (provisioned via the Vercel–Neon integration). Connection strings live in Vercel env vars.
- **Migrations are NOT auto-applied on deploy** — run manually after deploying schema changes:
  ```bash
  DATABASE_URL_UNPOOLED='<neon-direct-url>' node packages/db/scripts/migrate.mjs
  ```
  Current head: `0019_admin_events_lifecycle_types`.
- **First admin** is seeded by migration; all further promotion is UI-driven at `/admin/users`.
- **Verification per change:** `pnpm --filter @repo/<pkg> typecheck|test` and `pnpm build:web`; i18n parity test guards locale drift.

## 6. Known limitations / roadmap (prioritized)

1. **Live-trading gate** — tie `assertLiveReadinessGate` to the `activate_live` capability so live needs explicit elevation. _(Next.)_
2. **Account-lifecycle & audit depth** — audit profile/password/status changes; capture a "reason" in the UI.
3. **Capability-based RBAC expansion** — operator/analyst/viewer split or a DB permission table (the seam exists).
4. **OAuth/SSO** (Google first) and **GDPR** data export/anonymize.
5. **Test coverage** — server actions, admin flows, and route smoke tests.

---

_Financial-safety invariants held throughout: simulation ≠ live, risk gates not bypassed, no fabricated market data, user-specific data never shared-cached, secrets server-side only._
