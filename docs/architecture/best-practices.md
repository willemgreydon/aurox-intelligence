# Best Practices

This guide defines implementation standards for contributors and coding agents.

## 1. Boundary Discipline

Always preserve monorepo boundaries.

- DB access: only `packages/db`
- Provider API access: only `packages/providers`
- Contracts/types: only `packages/api-contracts`
- Signal logic: only `packages/signals`
- Forecast logic: only `packages/forecasting`
- Route orchestration and rendering: `apps/web`

Never move provider or persistence logic into React components.

## 2. Read Architecture Standard

For new route families use:

1. Query (`apps/web/server/queries`)
2. Mapper (`apps/web/server/mappers`)
3. Service (`apps/web/server/services`)
4. Route page
5. UI components

Do not bypass mapper/service by building domain logic in page files.

## 3. Contract-First Development

- Add/extend Zod schemas before wiring business logic.
- Export types from contract packages and consume by inference.
- Prefer additive schema changes over breaking renames.
- If schema changes affect runtime persistence, keep backward-compatible parsing.

## 4. Simulation Safety Rules

- Simulation is persisted execution, not sample UI state.
- Enforce deterministic arithmetic and rounding strategy.
- Validate lane constraints and asset tradability server-side.
- Capture auditable metadata for fills and account effects.

## 5. UI Composition Rules

- Reuse existing workstation components for consistency.
- Keep action surfaces dense but readable.
- Support both list and grid for scanning vs execution speed.
- Prefer server-rendered state over unnecessary client state.

## 6. Data Truthfulness Rules

- Never fabricate market prices to fill gaps silently.
- Surface freshness and fallback status explicitly.
- Keep empty/loading/error states clear and actionable.
- Use partial data honestly rather than synthetic completeness.

## 7. Migration Strategy

For any major change:
- choose additive evolution first
- keep current flows operational
- introduce extension points with concrete integration path
- avoid dead abstractions

## 8. Testing and Verification

At minimum for non-trivial changes:
- package-level typecheck for modified packages
- route behavior smoke validation for affected surfaces
- deterministic scenario checks for execution math changes

## 9. Documentation Standard

Every meaningful vertical slice should document:
- source of truth contracts
- read/write flow
- invariants
- failure modes
- migration considerations

## 10. Anti-Patterns to Avoid

- domain calculations inside component render functions
- direct DB/provider imports in route components
- copy-paste models diverging from shared contracts
- hiding risk assumptions in implicit defaults
