# Intelligence + Observe Layout Polish Audit

Date: 2026-05-08

## Files inspected
- `apps/web/app/markets/intelligence/page.tsx`
- `apps/web/app/observe/page.tsx`
- `apps/web/components/observe/observe-workstation.tsx`
- `apps/web/components/markets/intelligence-workstation.tsx`
- `apps/web/components/asset/workstation-page-header.tsx`
- `apps/web/app/globals.css`

## Root causes
- Excessive vertical spacing came from generic `dashboard-section` padding on pages that need dense workstation rhythm.
- `/observe` regime strip used plain stat blocks without card/grid containment, so values looked detached and oversized.
- `/observe` panel sections inherited large section spacing and margins, creating large blank zones.
- `/markets/intelligence` selector/lane cards used raw inline styles and default input/button appearance, causing clipping/rhythm issues.
- Header destinations were collapsed by default, making the destination chip appear isolated.

## Fixes applied
- Added scoped compact section rhythm (`dashboard-section--compact`) and applied it on `/observe` and `/markets/intelligence`.
- Created `observation-regime-grid` + `observation-regime-card` KPI layout with responsive columns.
- Tightened `/observe` hero/summary/panel spacing and aligned panel starts.
- Added bounded internal scroll for observe feed/timeline with mobile fallback to natural flow.
- Refactored market intelligence selector/lane cards to class-based styling:
  - polished search input (dark, rounded, focus ring)
  - bounded internal asset list scroll
  - active state for selected asset/lane buttons
  - balanced top-card heights on desktop, natural stacking on small screens
- Set workstation header destinations to open by default to avoid floating-chip appearance.

## Notes
- No financial or intelligence logic was changed.
- Changes are scoped to layout/styling classes and page composition.
