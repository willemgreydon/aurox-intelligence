---
name: aurox-provider-integration
description: Add or modify market data provider logic while preserving canonicalization, fallback, quality scoring, and UI isolation.
allowed-tools: Read, Grep, Glob, LS, Edit, MultiEdit, Write, Bash
---

# Aurox Provider Integration Skill

Use when modifying:

- `packages/providers`
- provider routing
- market data clients
- symbol normalization
- quote/history/metadata reads
- provider health checks

## Rules

Provider-specific data must never leak beyond provider/ingestion boundary.

## Required Steps

1. Inspect existing provider registry and routing.
2. Add provider config only in provider package.
3. Normalize response into canonical market contracts.
4. Add provider health and fallback behavior.
5. Add data quality/freshness handling.
6. Ensure UI receives route read models only.
7. Add tests for mapping and fallback.

## Required Checks

- missing API key behavior
- timeout behavior
- rate limit behavior
- malformed response behavior
- unsupported symbol behavior
- stale data behavior
- provider disagreement behavior

## Output

```text
Provider integration summary:
- ...

Fallback behavior:
- ...

Data quality handling:
- ...

Verification:
- ...
```
