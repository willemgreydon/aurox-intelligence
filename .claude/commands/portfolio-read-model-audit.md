# /portfolio-read-model-audit

## Purpose
Audit the portfolio read model for correctness, completeness, and proper derivation from DB state.

## When to Use
- Portfolio values look wrong in UI
- After changing position sizing or fee logic
- After a DB migration that touches portfolio tables

## Claude Code Prompt

```text
Audit the Aurox portfolio read model.

Trace from DB to UI:
1. Find portfolio repository in packages/db/src/
2. Find portfolio query in apps/web/server/queries/
3. Find portfolio mapper in apps/web/server/mappers/
4. Find portfolio service in apps/web/server/services/
5. Find portfolio route in apps/web/app/
6. Find portfolio UI component in apps/web/components/

Verify correctness:
- Is total value = cash + sum of (position quantity × current price)?
- Is unrealized PnL = (current price - avg cost) × quantity per position?
- Is realized PnL summed from closed transaction history?
- Are fees included in cost basis?
- Is the read model derived from DB, not recomputed in UI?

Check for:
- Any PnL computation inside React components
- Any stale read model that isn't revalidated after trades
- Any missing fields in the portfolio view model

Report:

Portfolio Read Model Audit
===========================
Read model derivation path: correct / incorrect
PnL computation location: server (correct) / client (violation)
Cost basis includes fees: YES / NO
Read model revalidated after trades: YES / NO

Issues found:
- ...

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/db typecheck
pnpm build:web
```

## Expected Output
Correctness assessment of portfolio value calculations and read model freshness.

## Safety Notes
- PnL must never be computed in React components.
- Stale read models must not silently show incorrect balances.
