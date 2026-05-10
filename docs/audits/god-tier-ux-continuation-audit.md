# God-Tier UX Continuation Audit

**Date:** 2026-05-09  
**Scope:** Full Aurox Intelligence workstation — post-upgrade continuation pass  
**Status:** ACTIVE — implementation in progress

---

## 1. What Currently Works Well

### Premium-grade routes
- **Dashboard** — executive cockpit with 10+ data streams, KPI strip, status indicators, CTA band
- **Portfolio Intelligence** — factor decomposition, regime panel, risk overlay, broker preview, rebalance plan, rich tone helpers
- **Simulation Workstation** — multi-level UX: sessions, controls, journal, watchlist, AI agent panel, micro-trading guardrails, lane metrics
- **Observe Workstation** — rich filtering, dense/focus modes, anomaly radar, relationship insights, timeline, watchlist intelligence

### Architecture and data-flow integrity
- Every route uses `force-dynamic` or appropriate revalidation
- Simulation-first throughout — no live execution default
- Zod-validated server actions
- Clean Query → Mapper → Service → Route → UI pattern
- Risk gates present and auditable

### Visual system
- Design tokens imported from `@repo/design-tokens`
- `font-feature-settings: "tnum" 1` for tabular numbers globally
- `status-pill` system with consistent semantic tones
- `data-table` class used consistently
- Loading skeletons implemented for most premium routes

---

## 2. What Is Still Fragmented or Weak

### A. Action language inconsistencies (HIGH IMPACT)
| Location | Current | Problem |
|---|---|---|
| `quick-trade-actions.tsx` | "Buy" / "Sell" / "Live trade locked" | Bare verb, no simulation context |
| `simulation-journal-table.tsx` row actions | "Buy · Sell · Replay unavailable" | Dots as separators, bare verbs, "unavailable" not explanatory |
| `command-palette.tsx` actions | "Open alert center" / "Open observer feed" | Mixed verb styles vs. nav which says "Open simulation cockpit" |
| Dashboard CTAs | "Continue in Market Workstation" / "Review Alert Center" / "Run Simulation Check" | Inconsistent verb structure |
| Observe workstation | Dense/Focus mode toggle text changes on click (confusing) | State label should be stable |
| Asset lane pages | "Previous / Next" pagination | Bare labels, no page context |

### B. Missing or weak empty states
| Route | Missing empty state |
|---|---|
| Dashboard relationships panel | Shows "Unavailable" with no explanation or suggestion |
| Signals page | `leadSignal` optional chain silently hides whole section |
| Asset lane pages (stocks/ETFs/crypto) | No empty state when zero tradable assets returned |
| Observe watchlist section | No guidance when watchlist is empty |
| Simulation journal | Shows empty table with no CTA to start trading |

### C. Command palette gaps
- All 40 asset entries hardcode `/stocks/SYMBOL` — ETF/crypto assets route incorrectly
- No dedicated action keywords: `buy`, `sell`, `simulate`, `risk`, `news`, `journal`, `export`, `reset`, `replay`
- Missing entries: `/signals`, `/portfolio/intelligence`, `/invest/stocks`, `/invest/etfs`, `/invest/crypto`, `/news`, `/replay/[id]`
- No grouped display when empty query (shows all 24 mixed entries)
- No keyboard arrow navigation within results

### D. Quick trade actions accessibility failures
- `disabled` buttons use `title` attribute only — screen readers typically skip these
- "Live trade locked" is a Link to `/admin/live-readiness` — should be an info state, not a broken nav link
- No visible simulation context near buy/sell buttons on asset cards
- `disabledReason` shown via `title` hover only — invisible on touch devices

### E. Simulation journal UX gaps
- Row actions use `·` dot separators between bare link text — not semantic buttons
- "Replay unavailable" shown as `<span title="Replay unavailable">` — not descriptive
- `Export CSV` link exports all data, ignoring active client-side filters
- Empty filtered state shows blank table body — no "no results" row
- `outcomeStatus` column shows raw string (e.g. `"success"`) — needs badge treatment
- Source column shows raw internal strings (`"manual_ui"`, `"portfolio-intelligence"`) — needs display labels
- No empty-journal state with onboarding CTA

### F. Observe workstation minor issues
- Dense/focus mode button label changes when active ("Dense mode" → "Dense mode on") — toggle label should stay stable, use active styling only
- Alert queue panel shows critical/warning items as plain `<p>` tags — no clear action affordance
- Feed filter dropdowns have no "clear filters" mechanism
- Event state actions (pin/read/dismiss) call `router.refresh()` but give no optimistic feedback
- Panel eyebrows are inconsistent: some use `section__eyebrow`, some inline styles

### G. Global CSS gaps
- No `.aurox-empty-state` utility — each component implements its own empty state differently
- No `.aurox-toolbar` utility — filter bars are styled ad-hoc with `style={{ marginBottom: '0.75rem' }}`
- No `.aurox-action-row` utility — button groups use ad-hoc flex containers
- `status-pill--neutral` used for both "disabled" and "no data" states — semantically overloaded
- Journal and observe filter bars use inline styles instead of CSS classes

---

## 3. Which Routes Have Inconsistent Layouts

| Route | Issue |
|---|---|
| `/invest/stocks` | No market graph context-setter (ETF/crypto have it) |
| `/invest/etfs` | Compliance section is text, not a visual callout |
| `/invest/crypto` | Identical compliance text to ETF — not crypto-specific |
| `/observe` | Summary grid uses `observation-regime-grid` class but card content is in inline-styled `<article>` tags |
| `/alerts` | Page has filter panel but no summary header to orient users |
| `/signals` | "Intelligence tabs" section is non-functional placeholder |

---

## 4. Which Workflows Require Too Many Clicks

| Workflow | Current steps | Problem |
|---|---|---|
| Simulate buy from asset card | Card → click Buy → simulation page loads with params → form fills → submit | Good — 2 effective steps |
| Replay a journal entry | Simulation page → scroll to journal → find row → click Replay | 3 steps, scroll required |
| Clear observe filters | Select "all" in each of 4 dropdowns individually | No "clear all filters" button |
| Find signal for a specific symbol | Signals page → no symbol filter exists | Requires scrolling universe table |
| Navigate to portfolio intelligence from simulation | No direct link in simulation page | Must use nav menu |

---

## 5. Which Pages Lack Clear Next Actions

| Page | Missing next action |
|---|---|
| Dashboard (empty portfolio) | No "Start your first simulation" CTA |
| Signals page | No "Prepare simulation for top signal" CTA |
| Observe watchlist (empty) | No "Add assets to watchlist" guidance |
| Alert center (no alerts) | No "Open observer to generate observations" guidance |
| Replay page | No "Prepare simulation based on this event" CTA |

---

## 6. Which UI Elements Look Less Premium

| Element | Issue |
|---|---|
| Journal row actions | `link · link · span` pattern — looks like plain text |
| Quick trade "Live trade locked" | Looks like a broken button |
| Observe dense/focus toggles | Plain secondary buttons with no visual distinction |
| Alert action buttons | Inconsistent size relative to alert content |
| Dashboard portfolio snapshot | Bare key-value pairs with no visual hierarchy |
| Simulation journal empty state | Blank table with no guidance |

---

## 7. Which Features Exist But Are Hard to Discover

| Feature | Discovery gap |
|---|---|
| Command palette | Cmd+K not displayed anywhere in UI |
| Dense mode / Focus mode in Observe | Buried in top-right above summary grid |
| Simulation journal CSV export | Hidden in journal card header |
| Portfolio intelligence rebalance plan | Requires scrolling ~800px to reach |
| Cross-asset relationship engine | Only visible in dashboard and observe panels |
| Replay feature | Only accessible via alert action or journal row |

---

## 8. Which Performance Paths Still Feel Slow

| Path | Issue |
|---|---|
| Dashboard load | Depends on `getDashboardExecutiveViewModel` — may be sequential internally |
| Observe page | Full model loaded server-side including all observations, all watchlist, all regime data |
| Portfolio intelligence | 857-line page component, large data model |
| Simulation page | Loads full equity curve + journal + positions + transactions + orders simultaneously |

---

## 9. Exact Patch Plan (This Session)

### P1 — Command palette upgrade
- Add missing action entries: `buy`, `sell`, `simulate`, `risk`, `journal`, `signals`, `news`, `replay`
- Fix asset entry hrefs to route correctly per asset class
- Add `⌘K` hint visible in header or empty-query state
- Improve group labels and descriptions

### P2 — Quick trade actions upgrade
- Replace `title` attribute with visible `<span aria-live>` disabled reason
- Change "Live trade locked" from a Link to a visual indicator button
- Add "Simulate buy/sell" verb prefix for clarity
- Add simulation-only context badge

### P3 — Simulation journal table polish
- Replace `·` separator row actions with proper `<button>`/`<Link>` elements styled as chips
- Badge-ify `outcomeStatus` column
- Humanize `source` column display values
- Add empty-journal state with simulation CTA
- Add empty-filtered state with "clear filters" link
- Style "Replay unavailable" as muted badge

### P4 — Observe workstation polish
- Fix dense/focus toggle to use stable labels + active class only
- Add "Clear filters" button to feed filter bar
- Add `aria-live="polite"` to feed section for filter feedback
- Improve alert queue panel with action links per severity
- Add "Inspect in alerts →" link from critical queue

### P5 — Dashboard improvements
- Improve relationship panel empty state explanation
- Add "⌘K" command palette hint in hero or CTA area
- Unify CTA band verb structure

### P6 — Global CSS utilities
- Add `.aurox-empty-state`, `.aurox-toolbar`, `.aurox-action-row`, `.aurox-source-badge`
- Replace inline `style={{ marginBottom: '0.75rem' }}` patterns with CSS classes
- Add `aurox-outcome-badge` variants for success/failure/pending

### P7 — Typecheck and build validation

---

## 10. Files Changed (updated as work progresses)

- `docs/audits/god-tier-ux-continuation-audit.md` (this file)
- `apps/web/components/layout/command-palette.tsx`
- `apps/web/lib/command-palette.ts`
- `apps/web/components/invest/quick-trade-actions.tsx`
- `apps/web/components/invest/simulation-journal-table.tsx`
- `apps/web/components/observe/observe-workstation.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/globals.css`
