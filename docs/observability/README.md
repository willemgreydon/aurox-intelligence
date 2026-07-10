# Observability — Aurox Intelligence

**Status:** Authoritative reference for logging, metrics, tracing, and operational monitoring.
Current implementation is a **deliberately minimal baseline** (`packages/observability`) plus
in-app monitoring routes. This document describes what exists today (CURRENT) and the invariants
that must hold as it hardens (FUTURE).

---

## 1. The `@repo/observability` package

Lightweight, dependency-free primitives shared across the monorepo. Source:
[`packages/observability/src`](../../packages/observability/src).

| Export | File | Behaviour (CURRENT) |
|---|---|---|
| `createLogger(scope)` | [`logger.ts`](../../packages/observability/src/logger.ts) | Returns `{ info, error }`; writes to `console.log` / `console.error` prefixed with `scope` |
| `recordMetric(name, value)` | [`metrics.ts`](../../packages/observability/src/metrics.ts) | Returns `{ name, value }` (sink not yet wired) |
| `startTrace(name)` | [`tracing.ts`](../../packages/observability/src/tracing.ts) | Returns `{ name, startedAt }` span stub |
| `normalizeError(error)` | [`errors/normalize-error.ts`](../../packages/observability/src/errors/normalize-error.ts) | Returns `{ message }`; safe for unknown throwables |

`index.ts` re-exports the logger and tracing surfaces. The package owns logging/metrics/tracing
only — **no domain logic** (see
[`.claude/rules/architecture-boundaries.md`](../../.claude/rules/architecture-boundaries.md)).

> **FUTURE:** `recordMetric` and `startTrace` are stubs; wiring them to a real
> metrics/trace backend must not change call sites. Prefer `createLogger(scope)` over bare
> `console.*` so a future structured-logging swap is centralized.

---

## 2. Log level

`LOG_LEVEL` controls verbosity and defaults to `info`. It is validated in both runtimes:

- Web: [`apps/web/lib/env.ts`](../../apps/web/lib/env.ts) — `z.string().default('info')`
- Worker: [`apps/worker/src/env.ts`](../../apps/worker/src/env.ts) — `z.string().default('info')`

`LOG_LEVEL` is **server-only**. See [`CONFIGURATION.md`](../../CONFIGURATION.md) (Worker / Logging).

---

## 3. Error normalization

All caught throwables that cross a boundary should pass through `normalizeError` so unknown
values become a safe `{ message }` shape before logging. Never log raw provider/broker payloads
that might contain secrets (see
[`.claude/rules/env-secret-rule.md`](../../.claude/rules/env-secret-rule.md)). Provider and
execution failures must be **propagated as typed results**, not swallowed — surfacing degraded
state is required, not optional (see
[`.claude/rules/no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md)).

---

## 4. Critical financial flows that must log

Observability is a financial-safety requirement. The following flows must emit a log entry with
sufficient context (account/order/symbol, reason) to reconstruct what happened:

| Flow | What must be logged | Governing rule |
|---|---|---|
| **Risk rejection** | Every failed pre-trade check with the failure reason and order context | [`risk-gates-required.md`](../../.claude/rules/risk-gates-required.md) |
| **Order lifecycle** | Transitions `PENDING → SUBMITTED → FILLED/REJECTED/CANCELLED`, with `source` and rejected reason | [`order-lifecycle-rule.md`](../../.claude/rules/order-lifecycle-rule.md), [`simulation-auditability-rule.md`](../../.claude/rules/simulation-auditability-rule.md) |
| **Provider failure / fallback** | Each provider attempt and outcome; fallback engaged; all-providers-failed | [`provider-fallback-rule.md`](../../.claude/rules/provider-fallback-rule.md), [`rate-limit-rule.md`](../../.claude/rules/rate-limit-rule.md) |
| **Halt / kill switch activation** | Activation as a system event, with account and reason | [`kill-switch-rule.md`](../../.claude/rules/kill-switch-rule.md) |
| **Stale / insufficient data** | Symbol, timeframe, required vs available bars; staleness | [`insufficient-data-rule.md`](../../.claude/rules/insufficient-data-rule.md), [`quote-snapshot-rule.md`](../../.claude/rules/quote-snapshot-rule.md) |
| **Live readiness gate** | Which readiness checks failed when live execution is blocked | [`live-trading-lock.md`](../../.claude/rules/live-trading-lock.md) |

These logs form the audit trail. In simulation they explain wrong PnL; in any future live path
they are a compliance artifact. Audit records (orders, transactions) are append-only and must
never be deleted.

---

## 5. Monitoring & admin routes

Operational state is surfaced in-app (all server-rendered, `dynamic = 'force-dynamic'`):

| Route | File | Purpose |
|---|---|---|
| `/admin/monitoring` | [`apps/web/app/admin/monitoring/page.tsx`](../../apps/web/app/admin/monitoring/page.tsx) | Operational status: provider configuration/health, ingestion pipeline status, warnings |
| `/admin/monitoring/providers` | [`apps/web/app/admin/monitoring/providers/page.tsx`](../../apps/web/app/admin/monitoring/providers/page.tsx) | Per-provider detail |
| `/observe` | [`apps/web/app/observe/page.tsx`](../../apps/web/app/observe/page.tsx) | Market observation workstation (watchlist signals, session-scoped) |
| `/observe/[id]` | [`apps/web/app/observe/[id]/page.tsx`](../../apps/web/app/observe/[id]/page.tsx) | Single observation detail |
| `/invest/broker-health` | [`apps/web/app/invest/broker-health/page.tsx`](../../apps/web/app/invest/broker-health/page.tsx) | Broker connectivity / execution health |
| `GET /api/health` | [`apps/web/app/api/health/route.ts`](../../apps/web/app/api/health/route.ts) | Liveness probe — returns `{ ok: true, service: 'web' }` |
| `GET /api/observe/events/[id]/state` | [`apps/web/app/api/observe/events/[id]/state/route.ts`](../../apps/web/app/api/observe/events/[id]/state/route.ts) | Observation event state |

These routes follow the canonical read path (Query → Mapper → Service → Route → UI); they read
from services/mappers and do not call providers or SQL directly.

---

## Related Documentation

- [`CONFIGURATION.md`](../../CONFIGURATION.md) — `LOG_LEVEL` and runtime config
- [`docs/testing/README.md`](../testing/README.md) — verification & reporting
- [`docs/RISK.md`](../RISK.md) — risk metrics and rejection semantics
- [`docs/EXECUTION.md`](../EXECUTION.md) — execution flow and audit points
