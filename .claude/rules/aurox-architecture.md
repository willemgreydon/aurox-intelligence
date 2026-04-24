# Aurox Architecture Rules

Apply these rules to all files.

## Mandatory Architecture

Aurox follows:

```text
Query → Mapper → Service → Route → UI
```

## Package Boundaries

- Contracts: `packages/api-contracts`
- DB: `packages/db`
- Providers: `packages/providers`
- Canonicalization: `packages/ingestion`
- Signals: `packages/signals`
- Forecasting: `packages/forecasting`
- Agents/execution: `packages/agents`
- UI orchestration: `apps/web`

## Forbidden

- Provider calls from UI
- SQL outside `packages/db`
- Domain math inside components
- Duplicate shared contracts
- Execution logic in routes
- Forecasting logic in route handlers

## Required

Before implementing behavior:

1. Check existing contract
2. Extend shared schema if needed
3. Implement package-level logic
4. Map to web service/read model
5. Render via UI
6. Add tests or verification
