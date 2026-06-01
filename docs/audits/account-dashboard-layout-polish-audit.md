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

---

# Pass 2 — Premium Executive Terminal UX (2026-06-01)

## P1 — Global bubble rollout
- Counts → `.num-bubble` (rule: money never, counts always, status → pills):
  - market-graph candle count (pass 1), asset-flow count (pass 1)
  - signal snapshot BUY/SELL/HOLD → success/danger/neutral bubbles
  - asset-class `N assets` → info bubble
  - provider-health healthy/degraded/total → bubbles
  - portfolio "open positions", news "shock count" → bubbles
  - account membership "active sessions" → bubble
- Fix: `.num-bubble` gained `justify-self:start; width:fit-content` so it never
  stretches when used as a direct grid child of `.dashboard-exec-list__item`.

## P2 — Executive KPI cards
`CompactStatCard` extended with optional `icon`, `status` (pill), and `spark`
slots (backward compatible). Topline = icon + truncating label + status pill;
value wraps (`overflow-wrap:anywhere`) so it never overlaps. Account hero
headline card now carries a `SIMULATION` status pill. Grid stays 3/2/1
(`.account-metric-grid`, pass 1).

## P3 — Dashboard width
Evaluated 1320 / 1440 / 1480px. Chose **1440px** (`--layout-dashboard-width:
90rem`) for the executive terminal: the dense multi-panel groups (2–3 up) read
better with the extra width, while the per-group `auto-fit minmax(280px)` keeps
line lengths sane. 1480 felt loose for 2-up lead groups; 1320 (pass 1) was tight
for 3-up. Single reusable container: `.dashboard-page-container` /
`.aurox-page-container` (used by every dashboard band).

## P4 — Dashboard information architecture
New `DashboardGroup` component (heading + subheading + spacing + separator via
`.dashboard-group + .dashboard-group` border-top). `DashboardShell` now takes one
grouped `body` slot (removed `main`/`lower`). Dashboard page reorganised into five
named overviews: **Portfolio · Risk · Market · AI · Research** (2 panels each;
Portfolio & Market use the `--lead` 1.5fr/1fr layout).

## P5 — Provider status pills
`.status-pill--{live,delayed,degraded,offline,simulation,neutral}` with dedicated
theme-aware colours. `DashboardProviderHealth` derives a single state pill
(OFFLINE if no providers, DEGRADED if any degraded, else LIVE).

## P6 — Account sidebar polish
`account/layout.tsx` Email/Role/Status converted to `.account-meta-row`
structured rows; Role → info pill, Status → `SIMULATION` pill. Membership
disclosure (`account/page.tsx`) Role → pill, Active sessions → count bubble.
Added specificity-safe overrides so pills/bubbles keep their colour inside
element-qualified containers (`.account-stats dd`, `.account-sidebar__summary span`).

## P7 — Mobile pass
- `100vh` → `100dvh` (with `100vh` fallback) on `.loading-workspace`,
  `.market-loading`, and `--market-workstation-height` (via `@supports`).
  (Body/app-shell already had `100svh`; mobile-drawer already `100dvh`.)
- Safe-area padding: `.page-main` bottom inset; `.shell-container` and
  `.dashboard-page-container` inline insets (landscape notch). Covers dashboard /
  account / portfolio / simulation / market (all built on these containers).

## P8 — Validation (pass 2)
- `vitest run lib/layout-polish.test.ts` → **PASS (11 tests)**
- `pnpm --filter @repo/web typecheck` → changed files clean; same pre-existing
  baseline failures in `app/api/auth/register/route.test.ts` and
  `next.config.test.ts` (unmodified, unrelated).
- `pnpm build:web` → **✓ Compiled successfully**

## Files changed (pass 2)
- `apps/web/app/globals.css` — width token, dvh/safe-area, provider pills,
  executive KPI slots, dashboard groups, account meta rows, bubble no-stretch fix.
- `apps/web/components/stats/compact-stat-card.tsx` — icon/status/spark slots.
- `apps/web/components/dashboard/dashboard-group.tsx` — **new** group primitive.
- `apps/web/components/dashboard/dashboard-shell.tsx` — single grouped `body` slot.
- `apps/web/app/dashboard/page.tsx` — five named overview groups + count bubbles.
- `apps/web/components/dashboard/dashboard-signal-snapshot.tsx` — count bubbles.
- `apps/web/components/dashboard/dashboard-asset-class-snapshot.tsx` — count bubble.
- `apps/web/components/dashboard/dashboard-provider-health.tsx` — state pill + bubbles.
- `apps/web/components/account/account-intelligence-cockpit.tsx` — headline status pill.
- `apps/web/app/account/page.tsx` — role pill + sessions bubble.
- `apps/web/app/account/layout.tsx` — structured meta rows + pills.
- `apps/web/lib/layout-polish.test.ts` — expanded static guards.

## Remaining opportunities (pass 2)
- Roll bubbles/pills into remaining surfaces: watchlist counts, alert-center
  counters, portfolio positions table, market rankings counts.
- Wire real sparklines into KPI `spark` slot (server-provided series).
- Remove now-dead `.dashboard-exec-main-grid` / `__left` / `__right` /
  `-lower-grid` CSS (superseded by `.dashboard-group`).
- Provider pills currently derive LIVE/DEGRADED/OFFLINE from counts; surface a
  true DELAYED state when freshness/staleness metadata is threaded through.
