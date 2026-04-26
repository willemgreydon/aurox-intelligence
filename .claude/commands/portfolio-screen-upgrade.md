# /portfolio-screen-upgrade

## Purpose
Upgrade the portfolio screen with better position display, PnL visualization, and risk indicators.

## When to Use
- When the portfolio screen needs more information density
- After PnL read model improvements
- When adding risk overlays to the portfolio view

## Claude Code Prompt

```text
Upgrade the Aurox portfolio screen.

Current screen location: apps/web/app/ (find the portfolio route)

Audit what the current screen shows:
1. Does it show all positions with quantities and values?
2. Does it show realized and unrealized PnL per position?
3. Does it show portfolio-level PnL?
4. Does it show position weight (% of portfolio)?
5. Does it show cash balance and total portfolio value?
6. Are there any risk indicators (concentration, drawdown)?
7. Is there a simulation vs live mode indicator?

Upgrade to include (using read model — no component calculations):
- Position table with: symbol, quantity, avg cost, current price, value, unrealized PnL, weight
- Portfolio summary: total value, cash, invested, overall PnL
- Risk summary: largest position weight, drawdown from peak
- Simulation context badge (always visible on simulation accounts)

Rules:
- All PnL and value calculations must be in the read model (server-side)
- No financial math in React components
- Show data freshness if market data is stale
- Handle zero-position portfolios gracefully

Report:

Portfolio Screen Upgrade
========================
Added sections:
- ...

Read model fields used:
- ...

Files changed:
- apps/web/components/<portfolio-component>
- apps/web/server/mappers/<portfolio-mapper> (if extended)

Verification:
pnpm build:web
```

## Validation Commands
```bash
pnpm build:web
pnpm --filter @repo/db typecheck
```

## Expected Output
Upgraded portfolio screen with full position data and risk indicators.

## Safety Notes
- PnL must be computed server-side. Never in the React component.
