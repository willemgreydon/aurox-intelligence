# Market Workstation Usability Audit

Date: 2026-05-08

## Files inspected
- `apps/web/app/market/page.tsx`
- `apps/web/components/charts/market-graph-section.tsx`
- `apps/web/components/charts/market-graph-workspace.tsx`
- `apps/web/components/layout/header.tsx`
- `apps/web/components/layout/header-client.tsx`
- `apps/web/components/layout/site-nav.tsx`
- `apps/web/app/globals.css`

## Root causes found
- Chart and sidebar height coupling relied on loose `--workstation-chart-height` and non-shell layout classes.
- Sidebar modules were individually capped, but there was no reliable single internal scroll container for the whole sidebar stack.
- Sidebar had only a mobile collapsible wrapper and no desktop collapse rail/toggle.
- Mega menu used grouped links but lacked full coverage and descriptive IA for new workstation/observer/legal surfaces.

## Fixes applied
- Replaced market shell with explicit workstation grid:
  - `--market-workstation-height`
  - `--market-sidebar-width`
  - `.market-workstation` and collapsed variant.
- Added desktop sidebar collapse toggle with localStorage persistence.
- Added sidebar internal scroll container and per-module accordion toggles.
- Added compact CTA module in sidebar:
  - `/observe`
  - `/invest/simulation`
  - `/signals`
- Improved mobile behavior:
  - shell stacks cleanly
  - sidebar toggle and accordion behavior maintained
  - chart height clamped for smaller viewports.
- Upgraded fullscreen overlay navigation groups and descriptions to include all major routes:
  - Core Workstations
  - Markets
  - Intelligence
  - Admin
  - Legal
- Added link description rendering for mega menu cards.
- Tightened post-chart section rhythm using `dashboard-section--after-market-graph` on market page.
