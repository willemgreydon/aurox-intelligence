# /market-query-optimize

## Purpose
Optimize market data queries for latency, batching, and provider efficiency.

## When to Use
- Market data pages are slow to load
- Provider API rate limits are being hit
- Bulk asset screens are sluggish

## Claude Code Prompt

```text
Optimize market data query performance in Aurox.

Inspect:
1. packages/providers/src/ — are provider calls batched where the API supports it?
2. apps/web/server/queries/ — are market queries fetching more data than needed?
3. apps/web/server/services/ — are parallel fetches used instead of sequential?
4. packages/db/src/ — are market observation queries using appropriate indexes?

Check for:
- Serial awaits that could be Promise.all()
- Over-fetching (fetching all fields when only a few are needed)
- Missing pagination on large symbol sets
- Provider calls inside loops
- Redundant provider calls for the same symbol in one request

Report:

Market Query Optimization Report
==================================
Serial fetches that should be parallel:
- File: <path>
  Fix: <description>

Over-fetching:
- File: <path>
  Fix: <description>

Provider call inefficiencies:
- ...

DB query issues:
- ...

Estimated impact:
- ...

Recommended changes (ranked by impact):
1. ...
2. ...
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/db typecheck
```

## Expected Output
Specific file locations and concrete optimization recommendations.

## Safety Notes
- Do not change execution paths. Optimize data fetch paths only.
- Parallel fetches must not race-condition simulation state reads.
