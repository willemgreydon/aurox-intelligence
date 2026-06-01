# Account / Dashboard Layout Polish Audit

**Date:** 2026-06-01
**Scope:** `apps/web` UI only (presentation layer). No domain, provider, DB, or
risk logic touched. No read-model shapes changed.

## 1. Problem statement (from screenshot review)

1. Account overview "highlighted simulation KPI tiles" rendered in a **4-column**
   grid → money values + descriptions were cramped/crowded.
2. Small numeric indicators across the app (market-graph candle counts,
   asset-level moneyflow counts, etc.) rendered as **unstyled raw numbers** with
   no consistent bubble treatment.
3. `/dashboard` content **stuck to the viewport edges** — no responsive page
   container.

## 2. Audit findings — where things live

### KPI grid (the 4-col problem)
- Account hero strip: `apps/web/components/account/account-intelligence-cockpit.tsx`
  used `<div className="analytics-strip">` (6 `CompactStatCard`s).
- `.analytics-strip` is defined in `apps/web/app/globals.css:2823` as
  `grid-template-columns: repeat(4, minmax(0, 1fr))` — the source of the 4-up
  crowding. It is shared by other analytics surfaces, so it was **not** edited
  globally; a modifier class was introduced instead.
- Mission-control KPI strip (`dashboard-mission-control.tsx`) uses
  `.mission-control__kpis` (`globals.css:10165`, `auto-fit, minmax(140px,1fr)`) —
  an intentionally dense exec strip; left unchanged.

### Numeric indicators (raw numbers)
- Market-graph time-range count: `apps/web/components/charts/timeframe-select.tsx`
  rendered `activePointCount` inside `.market-graph__timeframe-meta`
  (`globals.css:10069`) as a bare `aria-hidden` number.
- Asset-level moneyflow count: `account-intelligence-cockpit.tsx` passed
  `hint={String(vm.moneyflow.assetFlows.length)}` to `Disclosure`
  (`components/ui/disclosure.tsx`), rendered as plain `.home-disclosure__hint`.
- `market-graph__meta-row` (provider/coverage debug strip) — left as-is; it is a
  detailed technical meta row, not a floating count chip.

### Dashboard page container (edge-sticking)
- `/dashboard` renders via `DashboardShell` (`components/dashboard/dashboard-shell.tsx`),
  which emitted raw `<section className="dashboard-section ...">` bands.
- `.dashboard-section` (`globals.css:2367`) has **vertical padding only**
  (`padding: var(--space-8) 0 …`) and no width constraint → content spanned the
  full `<main className="page-main">` width to the edges.
- Contrast: `Section` (`components/ui/section.tsx`) wraps children in
  `.shell-container` (`globals.css:182`,
  `width: min(calc(100% - var(--space-8)), var(--layout-max-width))`) — which is
  why `/account` (built from `Section`) was already contained, but `/dashboard`
  was not.

### Reusable classes that already existed (reused, not duplicated)
- Status/role tokens: `--status-{info,success,warning,danger}-{bg,text}`,
  `--border-{subtle,default}`, `--surface-base`, `--text-{secondary,tertiary}`,
  `--radius-pill`, `--font-family-mono` — all token-driven, light/dark aware.
- `.shell-container` for the contained read surfaces.
- Note: `--surface-hover` / `--surface-2` are **referenced** in some existing
  rules but **not defined** anywhere (silent transparent fallback). The new
  num-bubble system deliberately avoids them and uses `color-mix(...)` over
  defined tokens.

## 3. Fixes applied

### Phase 2 — Account KPI grid (3 / 2 / 1)
New modifier appended to `globals.css` (does not mutate shared `.analytics-strip`):
```
.account-metric-grid, .account-overview__metrics,
.simulation-summary-grid, .analytics-strip--wide {
  display: grid; gap: var(--space-5); margin-top: var(--space-6);
  grid-template-columns: repeat(3, minmax(240px, 1fr));
}
@media (max-width: 1100px) { … repeat(2, minmax(220px, 1fr)) }
@media (max-width: 720px)  { … 1fr }
```
Applied as `className="analytics-strip account-metric-grid"` on the account hero
strip. Children get `min-width: 0` so values wrap safely instead of overflowing.

### Phase 3/4 — Numeric bubble system
New `.num-bubble` family appended to `globals.css`, theme-aware via `--bubble-*`
custom properties, variants: `neutral / info / success / warning / danger /
muted` + sizes `small / inline`. Applied to:
- `timeframe-select.tsx` candle count → `num-bubble num-bubble--muted num-bubble--small`
  with `aria-label="{n} visible candles"`.
- `account-intelligence-cockpit.tsx` asset-flow count (via `Disclosure` hint) →
  `num-bubble num-bubble--info num-bubble--small` with an accessible label.
- `Disclosure.hint` prop widened from `string` → `ReactNode` (backward
  compatible) so counts can render as bubbles.

Not applied to: money values, large KPI values, in-table tabular counts.

### Phase 5/6 — Dashboard page container
New `.dashboard-page-container` / `.aurox-page-container` appended to `globals.css`:
```
width: min(100% - clamp(2rem, 5vw, 4.5rem), 82.5rem);
margin-inline: auto;
```
`DashboardShell` now wraps every band (hero, kpis, mission-control band, the two
grid bands, and the CTA band) in this container. Grid bands keep their grid class
on the inner container so layout is preserved. Side gutters scale ~16px (mobile)
→ ~24px (tablet) → ~36px (desktop); max content width ≈ 1320px.

### Phase 8 — Static guards
`apps/web/lib/layout-polish.test.ts` asserts the CSS primitives exist and the
components are wired to them.

## 4. Files changed
- `apps/web/app/globals.css` — appended container, wide grid, num-bubble system.
- `apps/web/components/dashboard/dashboard-shell.tsx` — page container wrapping.
- `apps/web/components/account/account-intelligence-cockpit.tsx` — wide grid + count bubble.
- `apps/web/components/charts/timeframe-select.tsx` — candle-count bubble.
- `apps/web/components/ui/disclosure.tsx` — `hint` accepts `ReactNode`.
- `apps/web/lib/layout-polish.test.ts` — new static guard test.

## 5. Light/dark QA
All new styling resolves through semantic tokens (`--status-*`, `--surface-*`,
`--text-*`, `--border-*`) and `color-mix` over those — no hardcoded hex. Verified
both `:root` (light) and `[data-theme="dark"]` define every token referenced.

## 6. Remaining TODOs / follow-ups
- Optionally widen `.mission-control__kpis` min track (currently 140px) if the
  exec band feels cramped at large counts; left unchanged to preserve density.
- `--surface-hover` / `--surface-2` are referenced-but-undefined in legacy rules;
  worth defining or removing in a future tokens pass (out of scope here).
