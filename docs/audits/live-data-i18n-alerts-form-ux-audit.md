# Live Data + i18n + Alerts/Form UX Audit

Date: 2026-05-09

## State Reconstructed
- Existing staged/unstaged work already included broad simulation UX upgrades, order-ticket quantity mode support, market graph provider fallback changes, and large locale file parity updates.
- The interrupted pass had partial fixes in:
  - `apps/web/components/invest/simulation-action-form.tsx`
  - `apps/web/app/stocks/[symbol]/page.tsx`
  - `apps/web/components/invest/ai-simulation-agent-panel.tsx`
  - `apps/web/app/alerts/page.tsx`
  - `apps/web/components/alerts/alert-center-panel.tsx`
  - `apps/web/lib/i18n/messages.test.ts`
  - `apps/web/server/services/market-graph-service.test.ts`

## What Was Already Patched Before Continuation
- Alert page hero copy moved toward cockpit language.
- Alert panel added KPI cards, command-bar actions, grouped severity sections, and replay fallback text.
- Stock detail actions were moved into dedicated watchlist/order containers.
- Simulation action form introduced quantity/notional mode and client-side validation scaffold.
- AI simulation agent form switched to `noValidate`, added basic inline validation, and error normalization skeleton.
- i18n test added missing-key parity assertion against `en.json`.
- Market graph service test file introduced with one provider-history fallback test.

## Gaps Found
- Simulation form submit handler did not prevent invalid submission reliably.
- Quantity initialization/conversion had argument mismatch risk after refactor.
- Stock detail action layout classes had no scoped CSS yet, leaving odd spacing/shape in light mode.
- AI agent raw provider error was not separated cleanly from user-safe normalized copy.
- Market graph tests did not yet cover ETF missing-history path or explicit no-fake-bars behavior.
- This audit file was missing.

## Fixes Applied In This Continuation
- `apps/web/components/invest/simulation-action-form.tsx`
  - Enforced custom validation prevention via `event.preventDefault()` on invalid submit.
  - Fixed notional->quantity formatting path to respect effective min quantity.
  - Set default `minQuantity` to `1` at component boundary and continued using asset-aware rules.
  - Kept `noValidate` and inline validation error output.
  - Normalized validation copy to clear English safety messages.
- `apps/web/components/invest/ai-simulation-agent-panel.tsx`
  - Added `runErrorRaw` so main UI shows safe normalized quota error while raw error is only in collapsible details.
  - Preserved simulation-only safety posture and no live execution behavior.
- `apps/web/app/alerts/page.tsx`
  - Expanded header meta chips to include open/critical/warning/snoozed/simulation-only/last-refreshed.
- `apps/web/app/globals.css`
  - Added scoped layout and visual polish for:
    - stock detail action containers
    - simulation ticket form field sizing/validation states
    - mode toggle spacing
    - alerts KPI rail/command bar usability
    - compact action row behavior with mobile fallbacks
- `apps/web/server/services/market-graph-service.test.ts`
  - Added ETF missing-history provider fetch test.
  - Added explicit no-fake-bars test when provider fetch fails.

## Remaining Notes
- Locale files already had broad parity merge activity; key-parity validation must be confirmed by test run.
- Final confidence on visual polish and degraded-history UX requires manual QA in browser after build/typecheck.
