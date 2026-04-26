# /history-data-debug

## Purpose
Debug missing, incomplete, or incorrect historical OHLCV data for a symbol.

## When to Use
- Charts are not showing full history
- Backtesting returns incomplete data
- Signal calculations show unexpected gaps

## Claude Code Prompt

```text
Debug historical market data for a symbol in Aurox.

Symbol to debug: [USER PROVIDES: e.g. "AAPL" or "BTC/USD"]
Timeframe: [USER PROVIDES: e.g. "daily bars, last 90 days"]

Steps:
1. Find the historical data fetch path:
   - packages/providers/src/market/routing.ts
   - packages/providers/src/<provider>/client.ts history method
2. Identify which provider is serving this symbol's history
3. Check the normalizer for OHLCV field mapping
4. Check if there are gaps in the DB:
   - packages/db/src/ for market observation tables
5. Check if the provider returns partial data for the requested range
6. Check if the fallback chain tries alternative providers on missing data

Report:

Historical Data Debug
======================
Symbol: <symbol>
Timeframe: <timeframe>
Provider serving: <provider>

Data gaps found:
- Date range: <from> to <to>
  Missing bars: <count>

Normalizer issues:
- ...

DB storage gaps:
- ...

Fallback behavior:
- Fallback triggered: YES / NO
- Fallback provider: <name>

Root cause:
- ...

Recommended fix:
- ...
```

## Validation Commands
```bash
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/db typecheck
```

## Expected Output
Root cause of data gap with specific fix.

## Safety Notes
- Do not fill data gaps with synthetic values.
- Missing data must lower confidence, not be fabricated.
