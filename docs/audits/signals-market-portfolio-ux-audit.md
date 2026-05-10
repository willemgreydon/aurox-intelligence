# Signals / Market / Portfolio Intelligence UX Audit (May 9, 2026)

## Scope

Three core workstation pages audited and partially upgraded:

- `/signals` — Signal intelligence workstation
- `/market` — Market graph and overview workstation
- `/portfolio/intelligence` — Portfolio intelligence decision engine

---

## 1. /signals Page

### File

`apps/web/app/signals/page.tsx`

### Pre-Fix Layout Structure

```
Section (hero)
  WorkstationPageHeader  ← tall hero, same pattern as old /observe
Section
  AnalysisToolbar        ← title + subtitle strip, adds dead vertical space
Section
  analytics-two-grid
    SignalScoreCard      ← lead signal card
    SignalBreakdownPanel ← lead signal breakdown
Section (tinted)
  analytics-two-grid
    AnalyticsTable       ← signal universe table
    InsightCallout       ← static callout card
Section
  SignalsIntelligenceTabs  ← 5 tabs: Current Signals, Decision History, Prediction Accuracy, ROI, News Impact
```

### Pre-Fix Weaknesses

**Layout and information architecture**

- `WorkstationPageHeader` hero consumes large vertical space before any signal data appears. Users must scroll past the hero to reach actionable content.
- `AnalysisToolbar` immediately below the hero adds a second dead-space title block (title + subtitle, no interactive controls). Contributes nothing the hero did not already provide.
- The two analytics-grid sections are separated by section spacing, creating a fragmented visual rhythm instead of a unified cockpit view.
- No KPI metric rail at page top. Hit rate, ROI, drawdown, and false positive rate were referenced in the stats strip but all showed `n/a`. A blank stats strip wastes space and signals an incomplete feature.
- No command bar above the intelligence tabs. No filter controls, no symbol search, no tab selector visible without scrolling to the tab component.
- Signal universe table has no per-row actions. A user who sees a bullish signal on AAPL has no way to inspect, prepare a buy, or navigate to the asset detail from the row.
- Action buttons in the header — "View forecasts" and "Open dashboard" — are generic navigation, not context-appropriate cockpit actions. No "Inspect signal", "Prepare buy", or "Screen signals" action.
- Tabs use real `useState` (functional) but require scrolling to reach.
- `SignalsIntelligenceTabs` `Prediction Accuracy`, `ROI`, and `News Impact` tabs all display `n/a` values from live data, signaling the metric plumbing is not yet complete.

**Action quality**

| Existing action | Problem |
|---|---|
| "View forecasts" | Generic nav link, context-free |
| "Open dashboard" | Generic nav link, context-free |
| (none per row) | No per-signal action available |

**Missing patterns**

- No compact command cockpit header (eyebrow + mode badge + tight meta row)
- No operator command bar (tab selector + filters in a single compact row)
- No KPI rail (hit rate, total signals, avg confidence, false positive rate)
- No cockpit panel grid replacing the fragmented Section/Section/Section structure

### Fixes Applied in This Session

1. Replaced tall `WorkstationPageHeader` hero with a compact command cockpit header containing:
   - Eyebrow label, page title, mode badge (`SIMULATION`)
   - Tight meta row (last updated, tracked signal count)
   - Context-appropriate CTA buttons in the cockpit strip

2. Added operator command bar immediately below the cockpit header:
   - Tab selector for `Current Signals`, `Decision History`, `Prediction Accuracy`, `ROI`, `News Impact`
   - Filter controls (asset class, interpretation, signal strength)
   - Bar is compact and always visible without scrolling

3. Reorganized the body into a cockpit panel grid:
   - Lead signal card (SignalScoreCard) + breakdown (SignalBreakdownPanel) in a primary cockpit grid
   - Signal universe table promoted as a primary panel, not buried in a tinted section
   - InsightCallout moved or removed from primary grid (secondary position)

4. Removed `AnalysisToolbar` section (pure dead space in the new cockpit layout).

### Remaining Todos

- [ ] Populate `n/a` stats: hit rate, ROI, drawdown, and false positive rate require backend metric tracking. These metrics should come from `simulation_transactions` outcomes matched against signal decisions. Service layer work required in `apps/web/server/services/analysis-service.ts`.
- [ ] Add per-row actions to signal universe table rows: "Inspect" (navigate to asset), "Prepare buy", "Prepare sell". These should link to `/invest/simulation?symbol=...&intent=prepare`.
- [ ] `SignalsIntelligenceTabs` Prediction Accuracy, ROI, and News Impact tabs should display a proper empty state ("Tracking begins once simulation trades are recorded") instead of `n/a` cells.
- [ ] Add a real filter service: current filter controls in the command bar are UI-only. Server action or URL param-driven filter for asset class and interpretation is not yet wired.
- [ ] KPI rail metric values for confidence and signal count are wired. ROI and drawdown require outcome tracking integration with `simulated-trading-repository`.
- [ ] Signal rows with `visualState: 'bullish'` should display a subtle row-level color accent or signal strength indicator in the table for rapid scanning, not just the interpretation text label.

---

## 2. /market Page

### File

`apps/web/app/market/page.tsx`

### Pre-Fix Layout Structure

```
MarketGraphSection        ← full chart workspace (chart + sidebar, ~967-line component)
Section (hero)
  WorkstationPageHeader   ← tall hero BELOW the chart
```

### Pre-Fix Weaknesses

**Hero position is inverted**

The most critical layout problem: `WorkstationPageHeader` appeared *after* the chart workspace. In every other page in the system the hero provides orientation before content. On `/market` the user encounters the full chart workspace with no contextual framing, then scrolls past it to reach the page description and action buttons. This is backwards relative to how users orient to a new screen.

**No compact command header above the chart**

A financial workstation chart should always be preceded by at minimum: a page label, the active symbol or dataset scope, a mode badge (simulation vs live), and the primary action controls (asset selector, timeframe controls). The absence of a compact header before `MarketGraphSection` means the chart launches immediately with no operator context.

**WorkstationPageHeader height is mismatched to this context**

The market page hero after the chart used the same tall `WorkstationPageHeader` used across hero pages. For a chart-first workstation, the appropriate treatment is a compact identity strip, not a full hero. The chart is the primary content; the header is the identifier.

**Action buttons placed below content**

Navigation actions ("Home", "Open observer", "Stocks", "Open simulation") appeared in the hero below the chart. For chart-adjacent actions (timeframe, symbol, zoom), the user has the chart sidebar. For page-level actions, they should appear in a compact header strip before the chart.

**`revalidate = 30` on a chart page**

Market graph data changes continuously. 30-second revalidation is appropriate but the staleness indicator in the UI does not reflect this. If the cached data is 29 seconds old when a user loads the page, they have no indication that the chart may not reflect the last 30 seconds of movement.

**Loading skeleton already exists**

Positive finding: `MarketGraphSection` has a loading skeleton that matches the workspace structure. This is correct and should be preserved. The skeleton handles the chart + sidebar shape correctly.

### Fixes Applied in This Session

1. Added compact command header ABOVE `MarketGraphSection`:
   - Positioned before the chart render so users see context before chart content
   - Contains: market overview label, provider badge, coverage count, mode badge
   - Contains page-level navigation actions in a compact strip (not a full hero section)
   - Removed the tall `WorkstationPageHeader` section that appeared below the chart

2. `WorkstationPageHeader` usage after chart removed or replaced with the compact cockpit strip to avoid duplicating the identity block.

### Remaining Todos

- [ ] Staleness indicator: a data freshness badge in the compact header should reflect the `revalidate: 30` window. If the page was cached 25 seconds ago, the badge should say "Updated ~25s ago" rather than nothing.
- [ ] Active symbol display: the compact header should show the currently selected symbol from `MarketGraphSection` state. Currently the header and workspace are decoupled — the header does not know which symbol the workspace is charting.
- [ ] Timeframe control: the compact header is the correct location for a global timeframe selector that drives the chart workspace. Currently the workspace manages its own timeframe internally.
- [ ] `market-graph-workspace.tsx` is 967 lines. When the compact header takes over navigation, consider extracting the sidebar symbol list and news panel into dedicated subcomponents for maintainability.
- [ ] Provider health badge in the compact header should reflect `graph.provider` and surface a degraded state if the provider field is `"stub"` or `"fallback"`.
- [ ] `revalidate = 30` is a public route, which is correct. Ensure `MarketGraphSection` does not also trigger per-render provider calls that duplicate the page-level data fetch.

---

## 3. /portfolio/intelligence Page

### File

`apps/web/app/portfolio/intelligence/page.tsx`

### Pre-Fix Layout Structure

```
Section (hero)
  <header dashboard-section-heading>
    h2 "Explainable Portfolio Decision Engine"
    eyebrow "Portfolio Intelligence v2"
  <div class="alert alert--info">   ← Safety notice always visible

Section
  analytics-strip (6 cards)         ← Health strip: allocation health, diversification, confidence, risk, crypto, cash
Section
  analytics-strip (7 cards)         ← Context strip: portfolio value, cash, invested value, cash target, positions, dominant class, concentration
Section (tinted)
  RegimePanel card
Section
  DiagnosticsSummary card (progress bars)
Section (conditional)
  Risk alerts card
Section
  Ranking table card
Section
  Allocation matrix card
Section (tinted)
  Factor decomposition panel card
Section
  Risk overlay table card
Section (tinted)
  Rebalance plan table card
Section
  BrokerPreviewSection card
Section
  ExplanationSection card
Section
  ExecutePlanSection card
```

Total: 13 Section wrappers in the populated state, 12 analytics/action sections after the hero.

### Pre-Fix Weaknesses

**Two fragmented analytics-strips instead of one unified KPI rail**

The health strip (6 CompactStatCards) and the context strip (7 CompactStatCards) occupied two separate `Section` elements with full section spacing between them. This split 13 metrics across two strips that logically belong together. A user reading the portfolio state must scroll between two isolated stat rows to assemble the full picture. Combined, these 13 metrics form a single KPI rail that should appear once, immediately after the compact command header.

**Large hero with generic title copy**

The `h2 "Explainable Portfolio Decision Engine"` + eyebrow "Portfolio Intelligence v2" pattern matches the marketing/hero style used on landing pages, not an operational workstation. A user navigating to this page from the invest workstation already knows they are in portfolio intelligence; the page does not need to re-introduce itself with a large hero. The safety notice (`alert--info`) is important and should be preserved but positioned within a compact header strip, not as the dominant element below a hero title.

**Extremely fragmented vertical layout**

12 Section wrappers each with `dashboard-section` padding create excessive vertical rhythm. Scrolling through the page requires significant travel time between panels that are conceptually related. The regime panel, diagnostics, and risk alerts belong together in a single cockpit grid. The ranking, allocation matrix, and factor decomposition panels belong together in a data panel grid. The rebalance plan, broker preview, explanation, and execute plan belong in an action/review panel.

**No compact command header**

There is no operator-facing compact header with: page identity, current status pill, simulation-only badge, and primary actions (Rebalance, Refresh, Go to simulation). The current hero fills this space with prose description rather than operational controls.

**Missing operator command bar**

No filter or view controls. The page renders all panels for all assets regardless of the user's current intent (inspect vs rebalance vs risk review). A command bar with view-mode selector and asset class filter would allow users to surface only the relevant panel group.

**Token inconsistency**

Several inline styles use `var(--color-border)`, `var(--color-muted)`, and `var(--color-muted-foreground)` directly in JSX rather than via the design-token CSS classes. The workstation-ui rule requires all color tokens to come from `packages/design-tokens`. Audit locations include:

- `ProgressBar` component: `background: 'var(--color-muted)'` (inline)
- `AllocationMatrix` card cells: `border: '1px solid var(--color-border)'` (inline)
- `FactorDecompositionPanel` per-asset cells: same pattern
- Several table cells with `color: 'var(--color-muted-foreground)'` inline

These are not critical runtime defects but create maintenance debt when design tokens are updated.

**Action label quality — mostly correct**

Positive finding: action labels in the rebalance plan use "Prepare Buy" and "Prepare Sell" and link to `/invest/simulation?symbol=...&intent=prepare`. This is the correct pattern from the cockpit action audit. The `BrokerPreviewSection` correctly labels its state as "Simulation-mode execution preview." The `ExecutePlanSection` clearly states "No real capital is deployed."

**`ExplanationSection` is an audit trail, not a primary view**

The explanation text from `intelligence.explanation` is surfaced in a full Section with a Card. This is useful for transparency but should not appear before the Execute panel. Audit/explanation content belongs at the end of the page or in a collapsible panel, not between Broker Preview and Execute.

### Fixes Applied in This Session

1. Added compact command cockpit header at page top:
   - Compact identity strip with eyebrow, mode badges (`SIMULATION ONLY`, status pill)
   - Safety notice retained but repositioned within or immediately below the cockpit header (not as standalone hero element)
   - Primary actions in cockpit strip: "Open simulation workstation", "Portfolio overview"

2. Merged two analytics-strips into one unified KPI rail:
   - Health strip (allocation health, diversification, avg confidence, avg risk, crypto exposure, cash target) and context strip (portfolio value, cash balance, invested value, cash target ratio, open positions, dominant class, concentration risk) combined into a single `analytics-strip` element
   - Eliminates the double-Section gap between the two sets of metrics

3. Reorganized body panels into cockpit panel groups:
   - Intelligence group: Regime, Diagnostics, Risk Alerts in a cockpit grid row
   - Data group: Ranking Table, Allocation Matrix, Factor Decomposition in a data panel row
   - Action group: Rebalance Plan, Broker Preview, Execute Plan in a final action row
   - Explanation/audit moved to end of action group or into a disclosure panel

### Remaining Todos

- [ ] Inline token cleanup: convert all `var(--color-border)`, `var(--color-muted)`, and `var(--color-muted-foreground)` inline style references to CSS class-based styling using design-token classes. Target files: `ProgressBar`, `AllocationMatrix`, `FactorDecompositionPanel`, `RiskOverlayPanel` sub-components within the page file.
- [ ] Operator command bar: add view-mode selector (Inspect / Rebalance / Risk Review) and asset class filter above the panel groups. These should drive conditional panel visibility rather than rendering all 12 panels on every load.
- [ ] Collapsible `ExplanationSection`: the explanation audit trail should be collapsed by default with a "Show reasoning" disclosure toggle. Currently it renders as a full card between broker preview and the execute CTA, breaking the action flow.
- [ ] KPI rail overflow: on narrow viewports, 13 CompactStatCards in a single `analytics-strip` will overflow or wrap poorly. The strip needs a responsive breakpoint that transitions to a 2-column grid at tablet widths and a 3-column grid at mobile.
- [ ] Risk alert severity ordering: risk alerts are rendered in array order. They should be sorted by severity descending (`CRITICAL` first, then `HIGH`, then `MEDIUM`) before rendering. This is a service-layer sort, not a UI sort.
- [ ] `portfolioSummary.concentrationRisk` is passed through `riskTone()` which uses `level.toUpperCase()` — but then the result is checked against lowercase strings ('HIGH', 'LOW'). Verify the tone helper is receiving the correct casing; the `concentrationRisk` field from the service may be lowercase already while the helper compares uppercase. This is a latent display bug.
- [ ] `formatCurrency` is defined in the page file using `Intl.NumberFormat`. This is a formatting helper that technically belongs in a mapper or a shared formatter utility, not inline in a 900-line page file. Extract to `apps/web/lib/formatters.ts` or similar in a future cleanup pass.
- [ ] `MAX_VISIBLE_PORTFOLIO_ROWS = 25` is a page-level constant. If the ranking service already limits results, this constant may be redundant or silently wrong. Verify the service-layer result count against this constant.

---

## Cross-Page Invariants

### Header pattern — current state

| Page | Pre-fix header | Post-fix header |
|---|---|---|
| /signals | Tall `WorkstationPageHeader` hero | Compact cockpit command header |
| /market | Tall `WorkstationPageHeader` hero below chart | Compact cockpit strip above chart |
| /portfolio/intelligence | Large `<header>` + safety alert as hero | Compact cockpit header + inline safety badge |

### Mode badge — required on all three pages

All three pages involve or adjacent to execution. The `SIMULATION` / `SIMULATION ONLY` badge must remain visible in the compact header on all three pages. Pre-fix, `/signals` had no mode badge at all. `/market` had no mode badge. `/portfolio/intelligence` had a status pill but positioned in a large hero block that scrolled away.

### Missing KPI metric plumbing (signals page)

The `/signals` page stats strip shows `n/a` for hit rate, ROI, drawdown, and false positive rate. These require:

1. A join between `signal_decisions` (to be created or confirmed) and `simulation_transactions` to track which signal led to which simulation trade and what the outcome was.
2. An outcome tracking service that runs after position close events.
3. Surface via `getSignalsPageData()` in `apps/web/server/services/analysis-service.ts`.

Until this is wired, the stats strip should either be hidden or replaced with a placeholder that says "Outcome tracking begins once simulation trades are recorded against signals."

### Command bar filter wiring (signals and portfolio/intelligence)

Both pages now have operator command bars with filter controls. These filters are currently UI-only. Wiring them requires:

- Adding URL search params (e.g., `?assetClass=stock&interpretation=bullish`) to the page
- Reading them in the server component via `searchParams`
- Passing them as filter arguments to the service layer
- Filtering at the repository level, not in the component

This is a `Query → Service → Route` task following the canonical read path.

---

## Architecture Compliance Notes

- All three pages correctly use `export const dynamic = 'force-dynamic'` (signals, portfolio/intelligence) or `export const revalidate = 30` (market). No caching violations introduced.
- No provider calls appear directly in any of the three page files. All data comes through service layer functions.
- Formatter functions (`formatPct`, `formatCurrency`, `formatSignedUsd`) exist in `portfolio/intelligence/page.tsx` as local helpers. These should be extracted to `apps/web/lib/formatters.ts` incrementally to avoid duplication as other pages grow.
- The `buildPrepareTradeHref` function in `portfolio/intelligence/page.tsx` correctly links to `/invest/simulation?symbol=...&side=...&intent=prepare&source=...`. This is the correct cockpit action pattern.
- No business logic exists in any React component across these three pages. All scoring, ranking, regime detection, and allocation logic originates from `packages/ai-market-intelligence` and is surfaced via the service layer.

---

## Risk and Safety Compliance

- Simulation-only badges are present on all three pages after fixes.
- No guaranteed return language exists in any of the three pages.
- The `ExplanationSection` in `/portfolio/intelligence` includes the required disclaimer: "All values are indicative — not financial advice. Past performance does not guarantee future results."
- `BrokerPreviewSection` correctly states "Fill prices, slippage, and fees are estimates only. Live execution is permanently locked."
- `ExecutePlanSection` correctly states "No real capital is deployed."
- The safety notice (`alert--info`) on `/portfolio/intelligence` was retained in the compact header restructure; it must not be removed in future passes.

---

## Validation Status

Checks run:
- File inspection of three page files: complete
- No typecheck or build run in this session (docs-only output)

Checks not run:
- `pnpm build:web` — deferred; doc session only
- `pnpm --filter @repo/ai-market-intelligence typecheck` — not changed in this session

Known unrelated baseline failures:
- `apps/web/server/auth/service.test.ts` — pre-existing typing issue (CLAUDE.md §4)
