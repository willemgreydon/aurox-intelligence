# ADR 0004: Monorepo package boundaries

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

Aurox is a multi-asset financial system spanning data ingestion, market providers, pure signal and
forecasting math, agent execution workflows, persistence, and a Next.js workstation UI. Without
hard ownership boundaries, domain logic leaks into routes and components, provider calls scatter
across the app, SQL appears outside the DB layer, and contracts get duplicated. In a system where
unchecked data can flow into a trade decision, boundary erosion is a safety problem, not just a
maintainability one — and it leaks provider API keys into client bundles.

## Decision

Each package owns exactly one domain, and crossings are restricted to a defined upward flow.

| Package | Owns |
|---|---|
| `api-contracts` | Zod schemas and shared TypeScript contracts |
| `db` | SQL, repositories, migrations, transactions |
| `providers` | External API calls, normalization, fallback routing, health checks |
| `ingestion` | Canonical symbol mapping, ingestion pipelines |
| `signals` | Pure signal derivation, indicator scoring (no I/O) |
| `forecasting` | Pure forecasting, explainability (no I/O) |
| `agents` | Trade workflows, broker adapters, risk gates, readiness |
| `ai-market-intelligence` | Recommendation/intelligence composition |
| `observability` | Logging, metrics, tracing |
| `design-tokens` | Shared design primitives |
| `apps/web` | Next.js routes, server actions, services, mappers, UI — orchestration only |
| `apps/worker` | Background jobs, ingestion workers |

The canonical web read path is `Query → Mapper → Service → Route → UI`; the write path is
`UI → Server Action → Zod → Domain Service → Repository Transaction → Read Model Revalidation`.
`apps/web` orchestrates and presents — it never owns domain logic. Provider calls go only through
`packages/providers`; SQL only through `packages/db`; `signals`/`forecasting` never import `db` or
`providers`.

## Consequences

**Positive**

- Domain logic is isolated, independently testable, and auditable.
- Provider keys stay server-side in one package; no leakage into the client bundle.
- The layered read/write paths make every transformation testable in isolation and keep risk and
  accounting logic out of components.
- New features have an obvious home, reducing duplicated or conflicting implementations.

**Negative**

- More indirection: a value often passes through query → mapper → service → route → component
  rather than being fetched inline where it is displayed.
- More files and packages to navigate; small features can feel heavyweight.
- Cross-cutting changes (e.g. a new field end-to-end) touch several packages in sequence.

**Risks**

- Boundary violations (provider/DB calls in routes or components, duplicated contracts, domain math
  in React) reintroduce untestable, unsafe paths. Mitigated by the architecture-boundaries,
  provider-boundary, db-boundary, and app-orchestration rules plus grep-based validation.
- Over-abstraction (god services, needless generics) is the opposite failure mode and is explicitly
  discouraged.

## Alternatives considered

- **Layered modules inside a single app package.** Rejected: nothing enforces purity or import
  direction; provider keys and SQL leak too easily.
- **Per-feature vertical packages.** Rejected: would duplicate provider, DB, and contract logic
  across features and fragment the single sources of truth.
- **Allow routes to call providers/DB directly for speed.** Rejected: inconsistent fallback and
  caching behavior, unaudited financial math, and key-exposure risk.

## References

- [`../../.claude/rules/architecture-boundaries.md`](../../.claude/rules/architecture-boundaries.md)
- [`../../.claude/rules/provider-boundary.md`](../../.claude/rules/provider-boundary.md)
- [`../../.claude/rules/db-boundary.md`](../../.claude/rules/db-boundary.md)
- [`../../.claude/rules/app-orchestration-boundary.md`](../../.claude/rules/app-orchestration-boundary.md)
- [`../../.claude/rules/query-mapper-service-route-ui.md`](../../.claude/rules/query-mapper-service-route-ui.md)
- [`../../.claude/rules/read-model-rule.md`](../../.claude/rules/read-model-rule.md)
- [`../architecture/overview.md`](../architecture/overview.md), [`../architecture/PACKAGES_AND_AGENTS_STATE.md`](../architecture/PACKAGES_AND_AGENTS_STATE.md)
- Packages: [`packages`](../../packages), [`apps/web`](../../apps/web)
- See also: ADR 0003 (db boundary), ADR 0005 (api-contracts), ADR 0006 (pure packages)
