# Contributing to Aurox Intelligence

**Audience:** Engineers and AI agents working in this repository.
**Status:** Authoritative onboarding guide. Where this document and
[`.claude/rules/`](.claude/rules/) disagree, the rules are the executable source of truth.

Aurox Intelligence is a **deterministic-first financial intelligence, simulation, and
future live-trading platform** — not a generic SaaS dashboard. Treat every change as one
that may eventually move real capital. Read [`CLAUDE.md`](CLAUDE.md) and
[`.claude/CLAUDE.md`](.claude/CLAUDE.md) before your first change.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ (LTS) | `@types/node` is pinned to `^24`; any modern LTS works |
| pnpm | `10.0.0` | Declared as `packageManager` in `package.json`. Use pnpm only — never npm or yarn |
| PostgreSQL | 14+ | Optional for UI-first work (see `ENABLE_PRISMA_DB`); required for simulation/DB work |

This is a **Turborepo + pnpm monorepo**. All commands run from the repository root.

---

## 2. Setup

```bash
pnpm install
cp .env.example .env
```

Then set at minimum `AUTH_SECRET` (≥ 32 characters) in your root `.env`:

```bash
openssl rand -base64 32   # paste the result as AUTH_SECRET
```

Verify the environment is wired correctly (this never prints secret values, only presence):

```bash
pnpm env:check
```

For database-backed work, run migrations:

```bash
node packages/db/scripts/migrate.mjs
```

> The system boots without `DATABASE_URL` (stub client). Set `ENABLE_PRISMA_DB=false` for
> UI-first development without a hard DB dependency. See [`CONFIGURATION.md`](CONFIGURATION.md)
> for the complete environment-variable reference.

---

## 3. Development Commands

```bash
pnpm dev            # all apps via turbo
pnpm dev:web        # Next.js web app only (@repo/web)
pnpm dev:worker     # background ingestion worker only (@repo/worker)

pnpm build          # build everything
pnpm build:web      # build the web app (run this when apps/web changes)

pnpm typecheck      # all packages via turbo
pnpm test           # all package test suites via turbo
pnpm lint           # all packages
pnpm clean          # clean turbo caches + node_modules
```

Package-scoped commands (preferred for verification — see §7):

```bash
pnpm --filter @repo/<package> typecheck
pnpm --filter @repo/<package> test
```

> **Stuck on a perpetual loading state?** Wipe `apps/web/.next` and restart. Do not run
> `build:web` and `dev:web` against the same `.next` directory simultaneously.

---

## 4. Package Boundary Rules (summary)

Each package owns exactly one domain. Logic must live in the correct package — no exceptions.
Full detail in [`.claude/rules/architecture-boundaries.md`](.claude/rules/architecture-boundaries.md)
and [`docs/packages/README.md`](docs/packages/README.md).

| Package | Owns | Must NOT contain |
|---|---|---|
| `packages/api-contracts` | Zod schemas, shared TypeScript types | Duplicated/forked contracts elsewhere |
| `packages/db` | SQL, repositories, migrations, transactions | — (it is the only SQL home) |
| `packages/providers` | External API calls, normalization, fallback routing | UI or signal logic |
| `packages/ingestion` | Canonical symbol mapping, ingestion pipelines | Duplicated canonicalization |
| `packages/signals` | **Pure** signal derivation, indicator scoring | I/O, DB, providers, randomness |
| `packages/forecasting` | **Pure** forecasting, explainability | I/O, `Date.now()`, `Math.random()` |
| `packages/agents` | Trade workflows, broker adapters, risk gates | Risk bypasses |
| `packages/ai-market-intelligence` | Recommendation/intelligence composition | Provider/DB calls |
| `packages/observability` | Logging, metrics, tracing | Domain logic |
| `packages/design-tokens` | Shared CSS/TS design primitives | Logic |
| `apps/web` | Next.js routes, server actions, mappers, UI | SQL, provider calls, domain math |
| `apps/worker` | Background jobs, ingestion workers | Domain math outside packages |

Hard prohibitions:

- No `import postgres` or `sql\`...\`` outside `packages/db`.
- No provider/`fetch()` calls to market APIs outside `packages/providers`.
- No `@repo/db` or `@repo/providers` imports inside `packages/signals` / `packages/forecasting`.
- No financial math (PnL, signal scores, risk) inside React components or route files.
- No duplicated Zod schemas in `apps/web`.

---

## 5. Canonical Data Flow

### Read path (mandatory for every major screen)

```text
Query → Mapper → Service → Route → UI
```

- **Query** (`apps/web/server/queries/`) — gathers raw data from packages. No formatting.
- **Mapper** (`apps/web/server/mappers/`) — pure sync transform to display-ready view models.
- **Service** (`apps/web/server/services/`) — orchestrates queries + mappers, handles fallback.
- **Route** (`apps/web/app/*/page.tsx`) — calls service, chooses rendering strategy.
- **UI** (`apps/web/components/`) — renders the read model. No computation.

See [`docs/web/README.md`](docs/web/README.md) and
[`.claude/rules/query-mapper-service-route-ui.md`](.claude/rules/query-mapper-service-route-ui.md).

### Write path (mandatory for every mutation)

```text
UI → Server Action → Zod Validation → Domain Service → Repository Transaction → Read Model Revalidation
```

- Every write validates input with Zod (schemas from `packages/api-contracts` where shared).
- Trade operations run the **pre-trade risk check before** the repository call.
- Multi-table writes (order + transaction + position + balance) must be **atomic** (`db.begin`).
- Call `revalidatePath()` / `revalidateTag()` after every successful mutation.

See [`.claude/rules/server-action-write-path.md`](.claude/rules/server-action-write-path.md).

---

## 6. Branch & Commit Discipline

- Branch off `main`. Never commit directly to `main`.
- Keep changes as small coherent vertical slices. Avoid unrelated cosmetic edits during
  risky execution, DB, or provider work.
- Preserve public contracts unless the change is intentional and scoped.
- Commit/push **only when explicitly asked**. Co-author trailer for agent commits:

  ```text
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

- Every change session ends with a structured change summary: what changed, why, package
  boundaries respected, verification performed, residual risks, follow-ups. See
  [`.claude/rules/change-summary-rule.md`](.claude/rules/change-summary-rule.md).

---

## 7. Verification & Pre-Push Checklist

Run the **narrowest meaningful** check for what you changed — do not run unrelated checks
and report them as failures. See [`docs/testing/README.md`](docs/testing/README.md).

| Changed area | Minimum verification |
|---|---|
| `packages/api-contracts` | `pnpm --filter @repo/api-contracts typecheck` |
| `packages/db` | `pnpm --filter @repo/db typecheck` + `node packages/db/scripts/migrate.mjs` |
| `packages/signals` | `pnpm --filter @repo/signals typecheck && pnpm --filter @repo/signals test` |
| `packages/forecasting` | `pnpm --filter @repo/forecasting typecheck && ... test` |
| `packages/providers` | `pnpm --filter @repo/providers typecheck && ... test` |
| `packages/agents` | `pnpm --filter @repo/agents typecheck && ... test` |
| `apps/web` routes/actions | `pnpm build:web` |

### Pre-push checklist (run in order)

```bash
git status                                   # clean / committed
pnpm --filter @repo/<changed> typecheck      # PASS for every changed package
pnpm --filter @repo/<changed> test           # PASS — no new failures
pnpm lint                                    # PASS
pnpm build:web                               # PASS if apps/web changed
```

Manual risk checklist before any push:

- [ ] No risk gate removed or weakened
- [ ] Simulation remains the default execution target
- [ ] Live execution remains gated; autonomous live remains disabled
- [ ] No provider/broker secrets in code, logs, or output
- [ ] No `.env` file committed

Reporting format (always separate run / not-run / failures / baseline):

```text
Checks run:
- pnpm --filter @repo/signals typecheck: PASS
- pnpm --filter @repo/signals test: PASS

Checks not run:
- @repo/db (not changed)

Failures:
- none

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts — pre-existing typing issue (CLAUDE.md §4)
```

---

## 8. Known Baseline Issue

`apps/web/server/auth/service.test.ts` has a **pre-existing** TypeScript typing
inconsistency (CLAUDE.md §4).

Rules:

- **Never** rely on a full `apps/web` typecheck as truth. Validate at package boundaries.
- Do **not** treat this failure as a regression introduced by your change.
- Do **not** silently "fix" it unless explicitly assigned — that expands scope and touches
  the auth core.

See [`.claude/rules/baseline-failure-rule.md`](.claude/rules/baseline-failure-rule.md) and
[`.claude/rules/known-issues-rule.md`](.claude/rules/known-issues-rule.md).

---

## 9. Where the Rules Live

All operating constraints for contributors and AI agents live in
[`.claude/rules/`](.claude/rules/) and are loaded automatically into agent context.
Start with [`.claude/rules/README.md`](.claude/rules/README.md) and
[`.claude/rules/index.md`](.claude/rules/index.md). Key entry points:

- Architecture: `architecture-boundaries.md`, `db-boundary.md`, `provider-boundary.md`,
  `api-contracts-boundary.md`, `pure-domain-packages.md`
- Financial safety: `simulation-first-rule.md`, `risk-gates-required.md`,
  `live-trading-lock.md`, `kill-switch-rule.md`, `no-fake-market-data.md`
- Read/write patterns: `query-mapper-service-route-ui.md`, `server-action-write-path.md`,
  `repository-transaction-rule.md`, `read-model-rule.md`
- Verification: `targeted-validation-rule.md`, `pre-push-validation-rule.md`,
  `baseline-failure-rule.md`, `change-summary-rule.md`

---

## 10. Related Documentation

- [`docs/packages/README.md`](docs/packages/README.md) — per-package reference
- [`docs/web/README.md`](docs/web/README.md) — `apps/web` architecture and conventions
- [`docs/adr/README.md`](docs/adr/README.md) — Architecture Decision Records
- [`docs/testing/README.md`](docs/testing/README.md) — test strategy
- [`docs/observability/README.md`](docs/observability/README.md) — logging/metrics/tracing
- [`CONFIGURATION.md`](CONFIGURATION.md) — environment-variable reference
- [`GLOSSARY.md`](GLOSSARY.md) — domain glossary
