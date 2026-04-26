# /perf-audit

## Purpose
Identify performance bottlenecks in data loading, rendering, and service orchestration.

## When to Use
- Pages feel slow
- API routes have high latency
- Market data loading is sluggish
- Before a performance improvement sprint

## Claude Code Prompt

```text
Audit Aurox for performance bottlenecks.

Check these areas:

1. Data loading
   - Are queries in apps/web/server/queries/ doing N+1 fetches?
   - Are provider calls happening in series when they could be parallel?
   - Are DB queries missing indexes on common filter columns?

2. Next.js caching
   - Are route handlers using fetch() with proper cache headers?
   - Are server components using React cache() for repeated calls?
   - Are revalidate tags set correctly on market data routes?

3. Rendering
   - Are large lists virtualized?
   - Are heavy client components code-split?
   - Are unnecessary re-renders caused by context misuse?

4. Provider calls
   - Are provider calls batched where possible?
   - Is polling frequency appropriate?
   - Are rate limits being respected?

Report:

Performance Audit
=================
Critical bottlenecks:
- ...

Data loading issues:
- ...

Caching gaps:
- ...

Rendering issues:
- ...

Provider call issues:
- ...

Recommended fixes (prioritized):
1. ...
2. ...
3. ...
```

## Validation Commands
```bash
pnpm build:web
pnpm --filter @repo/providers typecheck
```

## Expected Output
Ranked list of bottlenecks with file paths and recommended fixes.

## Safety Notes
- Read-only audit. No code changes.
- Performance fixes must not alter execution or risk logic.
