# Simulation Trading UX Audit

## Scope audited
- Simulation service + repository:
  - `apps/web/server/services/simulation-service.ts`
  - `apps/web/server/actions/simulation-actions.ts`
  - `packages/db/src/repositories/simulated-trading-repository.ts`
- Trading UX surfaces:
  - `apps/web/components/invest/simulation-action-form.tsx`
  - `apps/web/components/invest/quick-trade-actions.tsx`
  - `apps/web/app/invest/simulation/page.tsx`
  - `apps/web/app/invest/stocks/page.tsx`
  - `apps/web/app/invest/etfs/page.tsx`
  - `apps/web/app/invest/crypto/page.tsx`
  - `apps/web/app/invest/portfolio/page.tsx`
  - `apps/web/app/portfolio/intelligence/page.tsx`
  - `apps/web/app/observe/page.tsx`
  - `apps/web/components/observe/observe-workstation.tsx`

## Current buy flow (before patch)
- Most discovery surfaces exposed a generic `Simulate trade` action.
- Order ticket accepted quantity with a globally hardcoded step (`0.0001`), regardless of asset class.
- Submit path validated session + quote freshness + position/cash checks and then revalidated many routes.

## Current sell flow (before patch)
- Sell existed on ticket forms, but discoverability was weak in list/card actions.
- Sell availability context was not consistently explicit on row-level quick actions.
- Disabled sell reason text existed in form-level flows, not consistently in quick-action entry points.

## Where sell was hidden/missing
- Quick action blocks in discovery/portfolio surfaces prioritized a single generic CTA.
- No explicit paired Buy/Sell labels in quick-action controls on major lanes.

## Why simulate buy felt slow
- Submit action revalidated a broad route set (`/dashboard`, `/invest`, `/stocks`, `/invest/etfs`, `/invest/crypto`, etc.) for every order.
- This expanded post-submit server work beyond directly affected simulation surfaces.

## Current quantity-step rules (before patch)
- Global static input step (`0.0001`) across stocks, ETFs, crypto.
- No mode switching between quantity and notional.
- No centralized per-asset quantity rule helper.

## Portfolio state/reset behavior (before patch)
- One destructive reset action existed (`resetSimulationAccount`) with confirmation.
- Missing fine-grained controls (reset cash only, close all positions only, clear decision history only) in current implementation.

## Fixes applied in this slice
- Added centralized asset-aware quantity rules and conversion helpers:
  - `apps/web/lib/simulation-order-ticket.ts`
  - with tests in `apps/web/lib/simulation-order-ticket.test.ts`
- Upgraded order ticket UX:
  - quantity/notional mode toggle
  - asset-aware step instead of hardcoded `0.0001`
  - richer quantity hints
- Made Buy/Sell explicit in quick actions:
  - paired `Buy`/`Sell` actions
  - sell disabled reason: `No simulated position to sell`
  - holdings now pass `hasSimulatedPosition` for visible sell enablement
- Integrated simulation prepare actions into portfolio intelligence tables:
  - prepare buy/sell links route to `/invest/simulation` with `symbol`, `side`, `intent=prepare`, `source=portfolio-intelligence`, and optional `assetId` when available
- Enriched `/observe` operator rail:
  - added trade-ready and provider-degraded top stats
  - added clearer action links for alert/simulation workflows
- Improved submit performance path:
  - narrowed revalidation in `createSimulatedOrderAction` to primarily simulation portfolio/order surfaces.

## Remaining gaps
- Reset actions now implemented at repository/action level:
  - full reset
  - cash-only reset
  - close-all positions
  - clear decision-history (AI decision traces)
- Decision history fields currently available:
  - timestamp, side, symbol, asset class, quantity, price, notional, fee/slippage estimate (from execution record), source/lane (from notes), cash impact, realized PnL, outcome status.
- Missing decision journal fields still unavailable in current persisted model:
  - confidence, signal score, risk score, news impact, guardrail result detail, explicit position impact delta snapshots, replay linkage IDs for manual orders.
- Replay/outcome hooks:
  - outcome integrated through `observation-outcome-service`.
  - replay links remain conditional and mostly unavailable where no replay identifier exists.
- Observe grouping/dense/focus polish:
  - added summary-rail metrics and priority grouping cards.
  - focus mode now hides secondary panels.
