# /slow-page-debug

## Purpose
Debug a specific slow page in the Aurox web app by tracing the data path from route to provider.

## When to Use
- A specific page is slow and you need to find the bottleneck
- A user has reported latency on a specific route
- After a change made a previously fast page slow

## Claude Code Prompt

```text
Debug a slow page in the Aurox web app.

Target page: [USER PROVIDES: e.g. /invest/portfolio, /markets/stocks, /simulation]

Trace the full data path:
1. Find the route file in apps/web/app/[path]/page.tsx
2. Find the service it calls in apps/web/server/services/
3. Find the queries it calls in apps/web/server/queries/
4. Find which provider or DB calls those queries make
5. Identify any serial awaits, missing caching, or over-fetching

Check:
- Is the page doing unnecessary server-side work that could be cached?
- Is the page calling providers it doesn't need?
- Is the page waiting on slow provider chains when a faster one exists?
- Is the page building a read model that includes data not shown in UI?

Report:

Slow Page Debug Report
======================
Route: <path>
Service: <file>
Queries: <files>
Providers invoked: <list>

Bottleneck identified:
- Location: <file:line>
  Issue: <description>

Data not needed by UI but fetched:
- ...

Caching opportunities:
- ...

Recommended fix:
- ...
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Traced data path with specific bottleneck identified.

## Safety Notes
- Trace only. Do not edit without confirming the fix with the user.
