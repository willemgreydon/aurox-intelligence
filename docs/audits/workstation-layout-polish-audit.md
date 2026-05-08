# Workstation Layout Polish Audit (May 8, 2026)

## Files Inspected
- `apps/web/components/charts/market-graph-workspace.tsx`
- `apps/web/components/charts/market-graph-section.tsx`
- `apps/web/components/sections/hero-section.tsx`
- `apps/web/components/sections/home-fancy-sections.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/market/page.tsx`
- `apps/web/app/globals.css`

## Root Causes
1. **Chart/sidebar imbalance and dead vertical space**
- Chart shells used very large viewport-based minimum heights (up to `72rem` / near-full viewport).
- Sidebar used `position: sticky` + `max-height: 100vh`, creating a different usable height profile than chart area.
- Sidebar lists did not have explicit internal scroll containers, so panel content could push overall layout height.

2. **Homepage workstation modules section excessive top whitespace**
- Global section padding (`.section { padding: var(--space-20) 0; }`) was too large for the modules section.
- The modules block (`home-fancy--ops`) had no section-specific vertical rhythm override.

## Exact Fixes Applied
1. **Balanced chart + sidebar workstation shell**
- Added shared desktop height token on the workstation grid:
  - `--workstation-chart-height: clamp(32.5rem, 68vh, 45rem);`
- Updated chart canvas to use this shared height on desktop:
  - `min-height` + `height` set to `var(--workstation-chart-height)`.
- Updated sidebar to align with chart height:
  - removed sticky viewport behavior,
  - set `min-height/max-height` to `var(--workstation-chart-height)`,
  - enabled bounded internal overflow behavior.
- Added dedicated scroll behavior for watchlist and news panel bodies via panel modifiers.

2. **Reduced oversized chart shell bounds**
- Reduced hero chart height envelope from oversized viewport range to tighter clamp.
- Replaced market-page fullscreen chart min-height rule with the shared workstation height token.

3. **Tighter modules-section spacing**
- Added section-specific spacing for `home-fancy--ops`:
  - `padding-top: clamp(3rem, 7vw, 6rem)`
  - `padding-bottom: clamp(3.5rem, 8vw, 7rem)`

4. **Responsive behavior safeguards**
- On `max-width: 768px`, workstation chart height token switches to `auto`.
- Sidebar returns to non-bounded stacked mode (no forced fixed height).
- Existing mobile collapsible sidebar behavior preserved.
