# /next-cache-audit

## Purpose
Audit Next.js App Router cache behavior for correctness and efficiency.

## When to Use
- Stale data appearing on pages
- Cache invalidation not working after writes
- Routes not revalidating after server actions
- Pages being over-fetched

## Claude Code Prompt

```text
Audit Next.js caching in the Aurox web app.

Check these patterns in apps/web/app/ and apps/web/server/:

1. Server components
   - Are fetch() calls using appropriate cache: 'no-store' or revalidate?
   - Are React cache() wrappers used for repeated data calls per request?

2. Server actions
   - After mutations, are revalidatePath() or revalidateTag() called?
   - Are simulation order writes triggering portfolio read model revalidation?

3. Route handlers
   - Do market data routes set appropriate Cache-Control headers?
   - Are stale market data routes marked with revalidate intervals?

4. Layout vs page boundaries
   - Is data fetched too high (layout) when it should be page-scoped?
   - Are nested layouts causing redundant fetches?

Report:

Next.js Cache Audit
===================
Routes with incorrect cache strategy:
- Path: <route>
  Issue: <description>
  Fix: <recommendation>

Server actions missing revalidation:
- Action: <name>
  Missing: revalidatePath / revalidateTag

Stale data risks:
- ...

Recommended fixes:
- ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
List of routes and actions with cache strategy issues and specific fixes.

## Safety Notes
- Cache changes can affect data freshness. Verify that simulation data is not stale after cache changes.
