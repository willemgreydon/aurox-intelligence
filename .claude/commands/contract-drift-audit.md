# /contract-drift-audit

## Purpose
Detect contract drift where local types in apps/web have diverged from or duplicated shared contracts in packages/api-contracts.

## When to Use
- After making changes to api-contracts schemas
- When type errors appear after updating a shared contract
- When suspecting duplicated types

## Claude Code Prompt

```text
Audit contract drift between packages/api-contracts and apps/web.

Check for:
1. Types defined locally in apps/web that should be imported from packages/api-contracts
2. Zod schemas defined in apps/web that duplicate schemas in api-contracts
3. Shared domain types (order, position, portfolio, signal, provider) defined in more than one place
4. apps/web importing from api-contracts but then re-exporting with local modifications

Search patterns:
- Local type interfaces for OrderStatus, Position, Portfolio, Signal, Forecast, etc.
- Local z.object() definitions that match api-contracts schemas
- Type aliases that wrap or extend shared contracts

Report:

Contract Drift Audit
====================
Duplicated types:
- Local: apps/web/<path> defines <TypeName>
  Should be: packages/api-contracts/<path>

Schema duplication:
- Local schema: <path>
  Matches shared: <api-contracts path>

Modified re-exports:
- ...

Recommended consolidations:
1. Delete local type, import from api-contracts
2. ...
```

## Validation Commands
```bash
pnpm --filter @repo/api-contracts typecheck
pnpm build:web
```

## Expected Output
List of duplicate or drifted types with consolidation plan.

## Safety Notes
- Only delete local types after verifying the api-contracts version is equivalent.
- Breaking changes to shared contracts affect all packages — check consumers first.
