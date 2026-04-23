# Best Practices

This document captures the architectural and implementation practices that should be preserved as the platform evolves.

## Boundary Rules

- Keep provider access inside `packages/providers`.
- Keep DB access inside `packages/db`.
- Keep ingestion orchestration inside `packages/ingestion`.
- Keep signal logic pure inside `packages/signals`.
- Keep forecast logic pure inside `packages/forecasting`.
- Keep shared schemas and DTOs inside `packages/api-contracts`.
- Keep route rendering and read orchestration inside `apps/web`.
- Do not move provider logic into React components or page files.
- Do not move forecasting or signal logic into route handlers or components.

## Web Read Architecture

For any new product surface, prefer this pattern:

1. add or reuse a provider/DB read boundary
2. create a route-specific query in `apps/web/server/queries`
3. map raw results into a stable shape in `apps/web/server/mappers`
4. expose the final route-facing data through `apps/web/server/services`
5. keep page components focused on presentation and layout

Avoid skipping directly from page components to raw provider or DB access.

## UI and Design System

- Use the token system in `packages/design-tokens` as the single source of truth.
- Prefer semantic roles over raw color or spacing values.
- Keep the current workstation-style density and analytical tone.
- Add reusable primitives only when a pattern clearly repeats.
- Prefer a small number of strong components over many weak variants.
- Keep charts, tables, filters, and stat panels semantically consistent.

## Truthfulness Rules

- Prefer truthful partial data over fake completeness.
- When data is unavailable, render explicit empty or partial states.
- When historical data is missing, show a real empty state, not a synthetic chart.
- When signals or forecasts are derived from simplified logic, say so in the UI copy and docs.
- Do not label anything “live” unless it actually comes through the provider or persistence boundary.

## Route Design Guidance

### Dashboard

- Mix operational and market summaries carefully.
- Prefer live or persisted read models for top-level metrics.
- Keep placeholder analytical sections clearly separated from real operational data.

### Stocks and FX

- Overview routes should center on tracked universe, freshness, and current state.
- Detail routes should center on current quote, real history, and clear next modules.
- Keep unsupported modules structurally ready but visibly partial.

### Signals and Forecasts

- Expose them as analytical read surfaces, not marketing pages.
- Build them from shared pure package logic.
- Keep explainability first-class.
- Be explicit about calibration limits and unsupported horizons.

### Admin and Monitoring

- Treat admin surfaces as operational tools.
- Prefer explicit warnings, freshness, and health summaries.
- Keep provider and pipeline checks visible and typed.

## Package Export Guidance

Internal workspace packages used by Next.js should follow the repository’s current internal-source export pattern when appropriate:

- `main: "src/index.ts"`
- `types: "src/index.ts"`
- `exports: { ".": "./src/index.ts" }`

This pattern is currently used to keep workspace package resolution stable inside the app during local builds.

## State Handling Expectations

Every serious surface should explicitly consider:

- loading
- empty state
- missing provider data
- stale timestamps
- unsupported asset or pair
- partial signal/forecast coverage
- persistence not configured

Silent failure is worse than a visible partial-state message.

## Universe Expansion Guidance

If the tracked universe is broadened:

- avoid scattering hardcoded asset arrays across pages
- prefer provider config or a dedicated asset registry read model
- normalize symbols before they cross package boundaries
- keep stock and FX identity handling explicit in query/mapping layers

## Documentation Practices

- Keep documentation in-repo under `docs/architecture`.
- Update docs when adding new route families, provider capabilities, or package seams.
- Prefer documenting actual current state, not aspirational architecture.
- Link the README to deeper architecture documents instead of duplicating everything there.

## Recommended Next Priorities

The strongest post-v1 improvements are:

- move market history and tracked assets into persistence-backed read models
- expand the tracked universe through a formal asset registry
- persist signal and forecast outputs for dashboard/admin reuse
- add fundamentals and news read models only when they can be done truthfully
