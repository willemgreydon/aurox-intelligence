# /market-provider-add

## Purpose
Guide safely adding a new market data provider following the Aurox provider abstraction pattern.

## When to Use
- Adding polygon, tiingo, coingecko, finnhub, eodhd, twelve-data, or a new provider
- Replacing a provider adapter
- Extending provider coverage to new asset classes

## Claude Code Prompt

```text
Add a new market data provider to Aurox following the canonical provider pattern.

Provider to add: [USER PROVIDES: e.g. "finnhub for news sentiment"]

Steps:
1. Inspect packages/providers/src/ for existing provider structure
2. Create a new adapter file following the existing pattern:
   - packages/providers/src/<provider-name>/client.ts
   - packages/providers/src/<provider-name>/normalizer.ts
3. Implement the canonical market data interface (check packages/api-contracts for the interface)
4. Add provider to packages/providers/src/market/routing.ts fallback chain
5. Add health check for the new provider
6. Add API key to env config (do not hardcode)
7. Add normalization test

Rules:
- API key must come from environment, never hardcoded
- Response shape must be normalized to the canonical format
- Provider must degrade gracefully if API is unavailable
- Stale or missing data must lower the confidence score, not fake a value
- Never add provider calls outside packages/providers/

Report:

Provider Add Report
===================
Files created:
- ...

Files modified:
- packages/providers/src/market/routing.ts (fallback chain)

Env vars required:
- ...

Tests added:
- ...

Verification:
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/providers test
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/providers test
```

## Expected Output
New provider integrated into fallback chain with health check and normalization.

## Safety Notes
- API keys must never be committed to the repo.
- Stale data must degrade confidence, not fabricate values.
