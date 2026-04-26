# /symbol-universe-audit

## Purpose
Audit the canonical symbol universe for completeness, normalization consistency, and provider coverage gaps.

## When to Use
- Adding a new asset class
- Provider returns unexpected symbols
- Symbol display is inconsistent across screens

## Claude Code Prompt

```text
Audit the Aurox symbol universe and normalization.

Check:
1. Where is canonical symbol normalization defined?
   - Look in packages/providers/src/ for normalizer functions
   - Look in packages/ingestion/ if present
2. Are all asset kinds (stock, etf, crypto) covered by at least one provider?
3. Are symbol formats consistent (e.g. BTC/USD vs BTCUSD vs BTC-USD)?
4. Are symbol-to-provider mappings explicit and not implicit?
5. Are unknown symbols handled gracefully (fallback, not crash)?
6. Is there a canonical symbol registry or is it implicit?

Check for:
- Duplicate normalization logic in multiple packages
- Hard-coded symbol lists that should be dynamic
- Missing crypto symbols
- Missing ETF coverage
- Provider-specific symbol formats leaking into UI

Report:

Symbol Universe Audit
=====================
Asset classes covered:
- Stocks: ✓ / ✗ (gaps: ...)
- ETFs: ✓ / ✗ (gaps: ...)
- Crypto: ✓ / ✗ (gaps: ...)

Normalization issues:
- ...

Duplicate normalization logic:
- ...

Unknown symbol handling:
- ...

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
```

## Expected Output
Asset class coverage map and normalization consistency findings.

## Safety Notes
- Do not invent symbol data. Only audit what exists.
