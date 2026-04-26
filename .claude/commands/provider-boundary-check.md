# /provider-boundary-check

## Purpose
Verify that all provider calls are confined to packages/providers/ and not leaking into routes, components, or services.

## When to Use
- After adding market data to a new route
- When reviewing a PR that touches data fetching
- When suspecting a provider boundary violation

## Claude Code Prompt

```text
Audit provider boundary enforcement in the Aurox codebase.

Rule: All external provider calls must live in packages/providers/. No routes, components, services, or agents may call provider APIs directly.

Check:
1. Search apps/web/ for imports from external market data libs (axios/fetch to provider URLs, polygon, coingecko, tiingo, finnhub, twelve-data, eodhd sdks)
2. Search apps/web/ for hardcoded provider API URLs
3. Check packages/agents/ for direct provider calls that bypass packages/providers/
4. Check packages/db/ for any provider API calls
5. Verify packages/providers/src/market/routing.ts is the single entry point for market data

Report:

Provider Boundary Audit
=======================
Violations found:
- File: <path>
  Issue: Direct provider call outside packages/providers/
  Fix: Move to packages/providers/ and expose via routing.ts

Clean boundaries:
- packages/providers/ — isolated ✓ / violation ✗

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
```

## Expected Output
List of violations with file paths and recommended moves.

## Safety Notes
- Do not move provider logic without ensuring the routing.ts fallback chain is preserved.
