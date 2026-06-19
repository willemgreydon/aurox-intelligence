# `packages/observability`

Shared, dependency-free helpers for logging, tracing, metrics, and error normalization.
Today these are deliberately thin, `console`-backed stubs that establish a stable seam:
every package and app can depend on `@repo/observability` now, and the backing
implementations can be swapped for real sinks later without touching call sites.

Package name: `@repo/observability`. ESM, zero runtime dependencies.

## Purpose & Boundary

- **Owns:** the observability surface — `createLogger`, `startTrace`, `recordMetric`,
  `normalizeError`.
- **Depends on:** nothing. `package.json` `dependencies` is empty. This is a leaf utility.
- **Must not:** import other workspace packages, leak secrets, or contain domain logic.

Because it is a leaf with no dependencies, any package may safely import it without
risking a dependency cycle or a boundary violation.

## Directory Map

| Path | Responsibility | Exported via barrel? |
|---|---|---|
| `src/index.ts` | Public barrel. Currently `export * from './logger'` and `export * from './tracing'`. | — |
| `src/logger.ts` | `createLogger(scope)` — scoped `info`/`error` logger. | ✅ via `index.ts` |
| `src/tracing.ts` | `startTrace(name)` — returns a trace handle `{ name, startedAt }`. | ✅ via `index.ts` |
| `src/metrics.ts` | `recordMetric(name, value)` — returns `{ name, value }`. | ⚠️ **not** re-exported by `index.ts`; import directly. |
| `src/errors/normalize-error.ts` | `normalizeError(error)` — coerces `unknown` to `{ message }`. | ⚠️ **not** re-exported by `index.ts`; import directly. |

> **Current gap (real):** `src/index.ts` only re-exports `logger` and `tracing`.
> `recordMetric` and `normalizeError` exist but are **not** surfaced through the barrel.
> Consume them via deep import (`@repo/observability/dist/metrics`,
> `@repo/observability/dist/errors/normalize-error`) or add them to the barrel before
> relying on the package root.

## Public API

| Export | Signature | Returns |
|---|---|---|
| `createLogger` | `(scope: string) => { info(message: string, meta?: unknown): void; error(message: string, meta?: unknown): void }` | A scoped logger object. `info` → `console.log(scope, message, meta)`, `error` → `console.error(...)`. |
| `startTrace` | `(name: string) => { name: string; startedAt: number }` | A trace handle stamped with `Date.now()`. No span-end helper yet. |
| `recordMetric` | `(name: string, value: number) => { name: string; value: number }` | An echo of the metric (no sink yet). |
| `normalizeError` | `(error: unknown) => { message: string }` | `{ message: error.message }` for `Error`, else `{ message: 'Unknown error' }`. |

## Contracts

There are no Zod contracts in this package — the shapes are plain TypeScript object
literals returned by the helpers (above). If these become cross-package contracts (for
example a structured log or metric envelope), promote the types into
`@repo/api-contracts` rather than exporting shared shapes from here.

## Invariants

- **Zero dependencies.** This package must remain importable from anywhere without
  introducing cycles. Adding a workspace dependency here is forbidden.
- **No secrets in output.** Loggers must never receive provider API keys, broker
  credentials, DB URLs, or auth tokens. `normalizeError` returns only a `message` string —
  do not extend it to dump full error objects that might carry secrets.
  ([env-secret-rule.md](../../.claude/rules/env-secret-rule.md))
- **Stable seam.** The public function signatures are the contract. Backing
  implementations may change (console → real sink) but call sites should not need edits.
- **Determinism caveat.** `startTrace` uses `Date.now()` by design (wall-clock is the
  point of a trace). Do not import `startTrace`/`createLogger` into the pure packages
  `@repo/signals` or `@repo/forecasting`, which forbid I/O and non-deterministic calls.

## Failure Modes

| Condition | Behavior |
|---|---|
| `normalizeError` receives a non-`Error` (string, number, `undefined`) | Returns `{ message: 'Unknown error' }` — never throws. |
| `createLogger` called with any scope | Always returns a usable logger; logging itself never throws (delegates to `console`). |
| No metrics/trace backend configured | `recordMetric`/`startTrace` are inert echoes — they do not fail, they simply do not persist anywhere yet. |

The helpers are intentionally total (never throw) so observability code can never be the
cause of a failure in a financial-critical path.

## How to Extend

1. **Add a real sink:** keep the existing signatures; replace the `console`/echo bodies
   with the chosen backend (structured logger, OpenTelemetry exporter, metrics client).
   Read config through an approved config module, never inline `process.env` secrets.
2. **Surface metrics/errors through the barrel:** add
   `export * from './metrics'` and `export * from './errors/normalize-error'` to
   `src/index.ts` so consumers can import from the package root.
3. **Span lifecycle:** if traces gain an end/duration helper, return a handle with a
   `end()`/`finish()` method rather than changing `startTrace`'s return shape in a breaking
   way.
4. **Redaction:** when wiring a real logger, add a redaction layer for known secret keys
   before any sink call.

## Testing Notes

- Run: `pnpm --filter @repo/observability test` and
  `pnpm --filter @repo/observability typecheck`.
- The test script uses `vitest run --passWithNoTests`; there are currently no test files,
  so a clean run reports zero tests (this is expected, not a failure).
- When adding real implementations, add deterministic tests: assert `normalizeError`
  handles `Error`/non-`Error`/`null`/`undefined`, and that loggers never throw and never
  emit secret-shaped values.

## Current vs Future

| Capability | Status |
|---|---|
| `createLogger`, `startTrace`, `recordMetric`, `normalizeError` | Current (console/echo stubs) |
| `metrics` + `normalizeError` in the package barrel | Future (deep-import for now) |
| Real log/metric/trace sinks (OTel, exporters) | Future |
| Secret redaction layer | Future (add before any real sink ships) |

## Related

- Rules: [`architecture-boundaries.md`](../../.claude/rules/architecture-boundaries.md), [`env-secret-rule.md`](../../.claude/rules/env-secret-rule.md)
- [`docs/operations/`](../operations/) for operational/runbook context.
