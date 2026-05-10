# ETF/Crypto Simulation Flow Audit

Date: 2026-05-09

## Current flow before fixes

- ETF/Crypto lane cards used `QuickTradeActions` with prepare links, but:
  - Sell was effectively always disabled in lane cards because `hasSimulatedPosition` was not wired from workspace holdings.
  - Disabled pre-checks in lane/detail pages required `lastUpdatedAt` freshness and blocked actions even when a quote price was visible.
- `/invest/simulation` did not render a focused prepared ticket from `intent=prepare` query params.
- URL params were not standardized with explicit `source`.
- Journal source context defaulted to `manual_ui` and did not preserve lane source (e.g. `etf-lane`, `crypto-lane`).

## Root causes

- Pre-trade UI guards were stricter than execution path and relied on `lastUpdatedAt` instead of actionable quote availability (`price`).
- Query params for prepare intent were not parsed/rendered into a ticket workflow on simulation page.
- Prepare URL generation was inline and not normalized/tested.

## Fixes applied

1. Standardized prepare URL builder:
- Added `buildSimulationPrepareHref(...)` in `quick-trade-actions.tsx`.
- Added `source` support and standardized query params:
  - `intent`, `side`, `symbol`, `assetClass`, `lane`, `source`.

2. Added parser for prepared ticket:
- New helper `apps/web/lib/simulation-prepare.ts` with `parsePreparedSimulationTicket(...)`.
- Handles case-insensitive side (`BUY`/`SELL`).

3. Added focused prepared ticket on `/invest/simulation`:
- Parses query params and renders a top ticket card above portfolio sections.
- Shows side/assetClass/lane badges, quote/freshness context, and a direct `SimulatedOrderForm`.

4. Fixed ETF/Crypto lane pre-check blocking:
- In `invest/etfs/page.tsx` and `invest/crypto/page.tsx`, pre-check now blocks only when actionable quote price is missing/invalid (not solely on timestamp freshness).
- Keeps clear asset-class-specific message when quote unavailable.

5. Enabled Sell correctly in ETF/Crypto lanes:
- Loaded workspace holdings and passed `hasSimulatedPosition` to `QuickTradeActions`.
- Sell now enables when holding exists and disables with clear reason otherwise.

6. Preserved source context in orders/journal:
- `SimulatedOrderForm` now supports `sourceContext` hidden input.
- `createSimulatedOrderAction` accepts optional `sourceContext` and writes it into order notes as `source=...`.
- Journal source parsing now reflects lane context (`etf-lane`, `crypto-lane`, etc.).

7. Asset-class-specific fresh quote errors in execution:
- `simulation-service.ts` now throws:
  - `Fresh ETF quote required before simulation execution. (...)`
  - `Fresh crypto quote required before simulation execution. (...)`
  - `Fresh stock quote required before simulation execution. (...)`
- Action error mapping updated for ETF/Crypto quote-required messages.

8. Detail page parity:
- ETF/Crypto detail forms now:
  - use actionable quote presence checks
  - pass `currentPrice/currentHeldQuantity`
  - pass `sourceContext`
  - disable sell when no position

## Remaining gaps

- Full e2e browser QA still required for lane → prepared ticket → submit flow confirmation.
- Additional source contexts may be added for portfolio-intelligence/observe prepare links if needed.

