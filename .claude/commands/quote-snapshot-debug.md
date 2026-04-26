# /quote-snapshot-debug

## Purpose
Debug a specific symbol's real-time or snapshot quote that is missing, stale, or incorrect.

## When to Use
- A symbol shows wrong price on a screen
- Quote is not updating
- Price differs between screens
- Provider returning null for a symbol

## Claude Code Prompt

```text
Debug a quote snapshot issue in Aurox.

Symbol: [USER PROVIDES: e.g. "AAPL" or "ETH/USD"]

Trace the quote fetch path:
1. Find where the quote is requested:
   - apps/web/server/queries/ — which query fetches this symbol?
   - apps/web/server/services/ — which service calls it?
2. Find the provider call:
   - packages/providers/src/market/routing.ts
   - packages/providers/src/<provider>/client.ts quote method
3. Check normalizer output for the symbol
4. Check if there is a DB snapshot cache that may be stale
5. Check if the provider health is degraded for this symbol's asset type

Check:
- Is the symbol in the correct format for the provider?
- Is the provider returning null, undefined, or empty?
- Is stale data being served without a freshness flag?
- Is the UI reading from a stale read model?

Report:

Quote Snapshot Debug
====================
Symbol: <symbol>
Provider: <provider>

Quote returned: <value or null>
Expected: <description>

Issue found:
- Location: <file:line>
  Description: <issue>

Freshness: fresh / stale / unknown
Confidence: <value if present>

Root cause:
- ...

Recommended fix:
- ...
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
```

## Expected Output
Traced quote path with specific issue identified.

## Safety Notes
- Stale or degraded quotes must never silently show as fresh.
