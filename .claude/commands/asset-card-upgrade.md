# /asset-card-upgrade

## Purpose
Upgrade asset cards to display richer market data, signal scores, and visual hierarchy improvements.

## When to Use
- When asset cards feel bare
- After signals are wired to the read model
- When adding a new data field to the market list

## Claude Code Prompt

```text
Upgrade the Aurox asset card components.

Target: [USER PROVIDES: e.g. stock cards on the market discovery page, or crypto cards in the watchlist]

Audit current card:
1. What data is currently displayed?
2. What is available in the read model but not shown?
3. Is the signal score wired and displayed?
4. Is price change (absolute and %) shown?
5. Is volume shown?
6. Is market cap or rank shown?
7. Is there a mini chart or sparkline?
8. Is confidence/staleness indicated?

Upgrade to include (where data is available in read model):
- Price with proper decimal precision
- 24h / 1d change with color coding
- Signal score indicator (if available)
- Volume or market cap
- Mini sparkline chart (if available)
- Staleness indicator if data is older than threshold

Rules:
- Do NOT compute data inside the card component
- All displayed values must come from the read model
- Card must handle missing/null fields gracefully

Report:

Asset Card Upgrade
==================
Current fields: <list>
Added fields: <list>
Read model fields not shown: <list>

Files changed:
- apps/web/components/<card-component>
- apps/web/server/mappers/<mapper> (if read model extended)

Verification:
pnpm build:web
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Upgraded asset card with richer data, signal integration, and graceful null handling.

## Safety Notes
- No domain calculations in React components.
- Null/missing data must show gracefully, not crash or show 0.
