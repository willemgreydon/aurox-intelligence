# Form Validation Number Input Audit

Date: 2026-05-09
Scope: simulation order inputs, stock detail forms, AI simulation broker agent numeric caps

## Inputs Audited

1. `apps/web/components/invest/simulation-action-form.tsx`
- `quantity` input:
  - Before: `min=max(minQuantity, rules.minQuantity)`, `step=rules.step` from mixed helper usage.
  - Risk: attribute drift could create invalid default values in some render paths.
  - After: centralized rules via `simulation-number-rules`:
    - stock/ETF whole-share: `min=1`, `step=1`, default `1`
    - stock/ETF fractional: `min=0.01`, `step=0.01`, default `1`
    - BTC/ETH/high-price crypto: `min=0.0001`, `step=0.0001`, default `0.001`
    - other crypto: asset-aware `min/step` with deterministic defaults
- `notional` input:
  - Before: `min=rules.minNotional` (10), `step=1`
  - After: `min=1`, `step=1`, common chips added (`25,50,100,250,500`)
- Form validation:
  - Before: partial custom validation with potential browser conflicts
  - After: `noValidate`, strict inline custom validation and step-alignment checks.

2. `apps/web/app/stocks/[symbol]/page.tsx`
- Buy/Sell form wiring:
  - Before: no explicit `currentPrice/currentHeldQuantity` wiring for detailed hints/limits.
  - After: wired `currentPrice` and `currentHeldQuantity`; sell explicitly disabled with:
    - `No open {SYMBOL} position is available to sell.`

3. `apps/web/components/invest/ai-simulation-agent-panel.tsx`
- Numeric cap inputs:
  - Before: `step=10`, default values present, risk of mismatch with browser validation if min/step base drifted.
  - After: centralized cap rules:
    - `min=1`, `step=1`
    - defaults: `500`, `2000`, `5000`
    - common quick chips: `500,1000,2000,5000,10000`
- Validation UX:
  - `noValidate` retained
  - inline validation kept
  - quota/rate-limit error normalized to safe message
  - raw details moved to collapsible `<details>`

4. `apps/web/app/globals.css`
- Stock detail action area and ticket controls:
  - tightened watchlist button sizing (no oversized blob treatment)
  - improved mode toggle and chip spacing
  - improved form-field alignment and mobile stacking behavior inherited from existing breakpoint

## Centralized Rule Helper

Added:
- `apps/web/lib/simulation-number-rules.ts`

Provides:
- `getSimulationQuantityRules(...)`
- `getAgentCapRules()`
- `isStepAligned(...)`

## Exact Fixes Applied

- Replaced mixed numeric-rule behavior with one canonical helper for simulation forms.
- Ensured stock whole-share values `1,2,3,10` validate by design.
- Ensured AI cap values `100,500,1000,2000,5000,10000` validate by design.
- Added common chips that always set values aligned with min/step constraints.
- Removed browser-native validation bubble path by combining `noValidate` and aligned attributes.
- Added deterministic step-alignment validation for quantity in custom inline error handling.

## i18n Cleanup (finalization pass)

- Added `simulation.validation.*` keys for inline validation and disabled sell messaging.
- Added `simulation.chips.*` keys for common quantity/notional/sell chip labels.
- Added `simulation.agent.*` keys for AI panel labels and safe provider error copy.
- Wired stock detail and simulation AI panel to locale-driven labels.
- Remaining literals intentionally kept:
  - Some generic operational copy inside the AI decision detail block.
  - Generic hints in `simulation-action-form` defaults for non-stock pages not yet passing translated label props.
