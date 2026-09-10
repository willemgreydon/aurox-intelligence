# Testing Strategy — Aurox Intelligence

**Status:** Authoritative test-strategy reference. Governed by
[`.claude/rules/aurox-testing-verification.md`](../../.claude/rules/aurox-testing-verification.md),
[`.claude/rules/targeted-validation-rule.md`](../../.claude/rules/targeted-validation-rule.md),
[`.claude/rules/test-data-rule.md`](../../.claude/rules/test-data-rule.md), and
[`.claude/rules/baseline-failure-rule.md`](../../.claude/rules/baseline-failure-rule.md).

Tests are the primary correctness mechanism for a system where every line influences capital.
Verification must be **targeted, deterministic, and honestly reported**.

---

## 1. Test runner

The repository uses **Vitest**. Each package's `test` script is `vitest run`. Two packages keep
an explicit `vitest.config.ts`
([`packages/ingestion`](../../packages/ingestion/vitest.config.ts),
[`packages/ai-market-intelligence`](../../packages/ai-market-intelligence/vitest.config.ts)); the
rest use Vitest defaults.

```bash
pnpm test                              # all package suites via turbo
pnpm --filter @repo/<package> test     # one package (preferred for verification)
vitest run                             # inside a package directory
```

---

## 2. Deterministic fixtures (mandatory)

Financial-logic tests use **fixed, realistic, deterministic** fixtures — never random or
wall-clock inputs.

- No `Math.random()` in test inputs or assertions.
- No `Date.now()` — timestamps are passed in or hardcoded (e.g. `'2026-01-01T00:00:00.000Z'`).
- Pre-computed expected values; assertions compare exact numbers (`toBeCloseTo` for floats).
- Cover the happy path **and** boundaries: minimum bars, below-minimum bars, flat series,
  zero volume, NaN/Infinity inputs, exact-balance edges.
- No live provider calls in tests.

Reference pattern: the forecasting suite builds plain-object snapshot fixtures and asserts that
producers echo the passed-in `producedAt` rather than calling `Date.now()`
([`packages/forecasting/src/__tests__/build-forecast.test.ts`](../../packages/forecasting/src/__tests__/build-forecast.test.ts)).

See [`.claude/rules/test-data-rule.md`](../../.claude/rules/test-data-rule.md).

---

## 3. What each package tests

Test files live in `src/__tests__/` (or colocated in `src/repositories/` for the DB package).

### `packages/signals` — pure indicators & signal derivation
- [`__tests__/indicators.test.ts`](../../packages/signals/src/__tests__/indicators.test.ts) — indicator math, minimum-bar guards, NaN handling
- [`__tests__/derive-signal-snapshot.test.ts`](../../packages/signals/src/__tests__/derive-signal-snapshot.test.ts) — composite `SignalOutput` derivation

### `packages/forecasting` — pure, deterministic forecasting
- [`__tests__/build-forecast.test.ts`](../../packages/forecasting/src/__tests__/build-forecast.test.ts) — forecast assembly, weights, determinism
- [`__tests__/engine-helpers.test.ts`](../../packages/forecasting/src/__tests__/engine-helpers.test.ts) — helper math

### `packages/agents` — execution, risk gates, brokers (highest-risk)
- `capital-guard`, `position-limit`, `money-limit-policy`, `drawdown-guard` — pre-trade risk gates
- `live-readiness-gate` — the live execution gate
- `fill-engine`, `simulation-broker-adapter`, `unified-trade-workflow` — order lifecycle & routing
- `broker-supervisor-agent`, `reconciliation-agent`, `ai-simulation-agent`, `news-impact-engine`
  — see [`packages/agents/src/__tests__/`](../../packages/agents/src/__tests__/)

### `packages/providers` — external data normalization & routing
- `provider-capabilities`, `provider-symbols`, `macro-client`, `macro-mapper`,
  `ai-provider-config`, `claude-finance` — see
  [`packages/providers/src/__tests__/`](../../packages/providers/src/__tests__/)

### `packages/ai-market-intelligence` — recommendation & intelligence composition
- `recommendation-engine`, `ranking-engine`, `macro-regime-engine`,
  `portfolio-intelligence-engine`, `news-intelligence-extractor`, `news-impact` — see
  [`packages/ai-market-intelligence/src/__tests__/`](../../packages/ai-market-intelligence/src/__tests__/)

### `packages/ingestion` — canonicalization & ingestion pipeline
- `symbol-normalization`, `canonicalize`, `mappers`, `adapters.transport`, `manager`,
  `run-lifecycle` — see [`packages/ingestion/src/__tests__/`](../../packages/ingestion/src/__tests__/)

### `packages/db` — repositories (colocated tests)
- [`simulated-trading-repository.test.ts`](../../packages/db/src/repositories/simulated-trading-repository.test.ts) — order lifecycle & accounting
- `alerts-repository`, `observation-events-repository`, `provider-monitor-config-repository`

> `packages/api-contracts`, `packages/design-tokens`, and `packages/observability` currently
> have no dedicated suites; their contracts are exercised through consuming packages.

---

## 4. Targeted verification

Run the **narrowest meaningful** check for what you changed — do not run unrelated suites and
report them as failures.

| Changed area | Minimum verification |
|---|---|
| `packages/<pkg>` | `pnpm --filter @repo/<pkg> typecheck` + `pnpm --filter @repo/<pkg> test` |
| `packages/api-contracts` | `pnpm --filter @repo/api-contracts typecheck` |
| `packages/db` | `pnpm --filter @repo/db typecheck` + `node packages/db/scripts/migrate.mjs` |
| `apps/web` routes/actions | `pnpm build:web` |

High-risk changes (signals, forecasting, agents/execution, simulation accounting) require a
before/after test comparison — note any test that flips PASS↔FAIL. See
[`.claude/rules/regression-safety-rule.md`](../../.claude/rules/regression-safety-rule.md).

---

## 5. Reporting format

Always separate run / not-run / failures / baseline:

```text
Checks run:
- pnpm --filter @repo/signals typecheck: PASS
- pnpm --filter @repo/signals test: PASS (N tests)

Checks not run:
- @repo/db (not changed)

Failures:
- none

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts — pre-existing typing issue (CLAUDE.md §4)
```

Never claim a suite passed if it was not run.

---

## 6. Baseline failure handling

`apps/web/server/auth/service.test.ts` carries a **pre-existing** TypeScript typing
inconsistency (CLAUDE.md §4). Therefore:

- Do **not** rely on a full `apps/web` typecheck as truth — validate at package boundaries.
- Do **not** attribute this failure to your change.
- Do **not** silently fix it; that expands scope into the auth core. Touch it only if
  explicitly assigned, and then remove it from CLAUDE.md §4.

When you discover a **new** pre-existing failure: confirm it predates your change
(`git log`/`git blame`), document it in CLAUDE.md §4, and report it as baseline — not as a
regression. See [`.claude/rules/baseline-failure-rule.md`](../../.claude/rules/baseline-failure-rule.md)
and [`.claude/rules/known-issues-rule.md`](../../.claude/rules/known-issues-rule.md).

---

## Related Documentation

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — verification & pre-push checklist
- [`docs/simulation-test-plan.md`](../simulation-test-plan.md) — simulation test plan
- [`docs/observability/README.md`](../observability/README.md) — logging/metrics/tracing
