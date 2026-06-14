# Aurox Intelligence — User Story Map

**Version:** 1.0
**Date:** 2026-06-13
**Sources:** PRD `aurox-intelligence.md` · Feature Spec `autonomy-mode-switch.md` · UX Heuristic Evaluation 2026-06-13 · Competitive Scan 2026-06-13 · Feature Gap Audit 2026-05-08 · Code Audit 2026-06-13

**Assumptions:**
- Navigation IA restructure (32 → 25 destinations, 4 decision-funnel groups) is **Done / recently shipped** — marked accordingly.
- "Roadmap / Gated" items are included in this map with explicit gating labels so they are not mistaken as immediately buildable.
- Personas from the master PRD are reused: **Sione** (Serious Self-Directed Investor) · **Marta** (Small Systematic Operator) · **Theo** (Analytically Curious Trader) · **Admin** (Operator/Platform Monitor) · **Engineer** (internal, platform quality).

---

## Activity Backbone

```
A. Discover & Observe Markets
B. Understand Intelligence
C. Simulate & Act
D. Prove → Promote to Live   [Roadmap / Gated]
E. Fund & Connect            [Roadmap / Gated]
F. Operate & Monitor
G. Trust, Safety & Compliance
H. Platform Quality & Hardening
```

---

## A. Discover & Observe Markets

### Epic A1 — Market Overview and Asset Cards

---

**AUR-001**
**Persona:** Theo
**Story:** As Theo, I want every asset card on /market to show a simulation mode badge, so that I always know I am viewing a simulation context before I take any action.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD UX-01 · UX Heuristic H4 (Severity: High) · financial-ui-safety-rule.md

**Acceptance Criteria:**
1. `/market`, `/signals`, and `/observe` routes each display a persistent `SIMULATION` badge visible without scrolling.
2. The badge uses the existing `WorkstationPageHeader` `statusLabel="simulation"` prop or an equivalent layout-level component — no new design tokens required.
3. Badge is present in the rendered HTML on every authenticated route where a trade action is reachable within one click.
4. A screenshot regression test confirms badge presence on all three routes after each deploy.
5. Badge meets WCAG 2.1 AA contrast requirements.

---

**AUR-002**
**Persona:** Theo
**Story:** As Theo, I want every displayed price to show a freshness indicator when data is stale, so that I never act on an outdated quote without knowing it.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD UX-02 · MD-02 · quote-snapshot-rule.md

**Acceptance Criteria:**
1. Any `Quote` with `isStale: true` renders a visible staleness indicator (e.g., clock icon, amber label) next to the price.
2. Indicator is shown on asset cards, asset detail price header, and trade ticket.
3. Tooltip or accessible label on the indicator states "Data last updated [timestamp]."
4. Signal confidence is visually reduced (amber/muted styling) when the underlying quote is stale.
5. No price is displayed without an associated `timestamp` field — a missing timestamp must render as "Data unavailable."

---

**AUR-003**
**Persona:** Theo
**Story:** As Theo, I want dashboard news items to never show "No source URL" dev copy, so that the news panel looks professional and does not confuse me with internal labels.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H2 (Severity: High) · `app/dashboard/page.tsx:155`

**Acceptance Criteria:**
1. News items with no `href` suppress the link element entirely — no "No source URL" text is rendered.
2. If the presence of the source field must be communicated, the fallback reads "Source unavailable" in muted style.
3. Fix applies to all news panels across dashboard and any other page that reuses the news item component.
4. No hardcoded English fallback strings — fallback copy must use an i18n key.

---

### Epic A2 — Market Ticker and Header Degraded States

---

**AUR-004**
**Persona:** Theo
**Story:** As Theo, I want the market ticker in the header to show a visible degraded state label when data is unavailable, so that I do not assume a blank ticker means a quiet market.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H1 (Severity: Low) · `header.tsx` `freshnessState === 'unavailable'`

**Acceptance Criteria:**
1. When `freshnessState === 'unavailable'`, the ticker bar renders an inline chip: "Market data loading…" or "Ticker unavailable."
2. The chip has an `aria-label` for screen readers.
3. Chip styling uses an existing design token (muted or amber).
4. Normal ticker resumes automatically when data becomes available without a page reload.

---

## B. Understand Intelligence

### Epic B1 — Confidence Display and Signal Explainability

---

**AUR-005**
**Persona:** Theo
**Story:** As Theo, I want the ConfidenceMeter to display a threshold legend alongside the percentage, so that I understand whether 62% confidence is high, moderate, or low without prior knowledge of the scale.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD EX-05 · UX Heuristic H1 (Severity: Medium) · `components/stats/confidence-meter.tsx` · confidence-score-rule.md

**Acceptance Criteria:**
1. The live `ConfidenceMeter` component (used in `signals-cockpit.tsx`) renders a legend below or beside the bar: "≥ 70% High · 40–69% Moderate · < 40% Low · 0% No signal."
2. Bar fill color changes semantically: green ≥ 70%, amber 40–69%, red < 40%, gray at 0%.
3. The standalone `confidence-meter.tsx` component (identified as dead code) is removed — wiring applies to the live signal cockpit path only.
4. Legend text uses i18n keys, not hardcoded English.
5. The meter passes WCAG 2.1 AA contrast on all color states.

---

**AUR-006**
**Persona:** Theo
**Story:** As Theo, I want a "Signal guide" tooltip on every signal badge, so that I can understand the score range and confidence scale without navigating away.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H10 (Severity: Medium) · `components/signals/signal-score-badge.tsx`

**Acceptance Criteria:**
1. A `?` icon button is present beside each `SignalScoreBadge`.
2. Activating the button (click or keyboard Enter/Space) opens a popover or tooltip: "Score −1 to +1 · Confidence 0–100% · < 40% = insufficient data."
3. Popover traps focus and is dismissible with Escape.
4. Tooltip/popover has `role="tooltip"` and is linked to the button via `aria-describedby`.
5. Does not render on screen sizes where it would obscure the primary data.

---

**AUR-007**
**Persona:** Sione
**Story:** As Sione, I want the signal detail page to include history, accuracy, and news-impact tabs, so that I can evaluate a signal's track record before acting on it.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** L
**Source:** PRD AN-08 · Feature Gap Audit (Signal detail/explainability views: partially integrated) · `apps/web/app/signals/page.tsx`

**Acceptance Criteria:**
1. Asset signal detail view includes tabs: "History" (past score timeline), "Accuracy" (hit rate over N periods), "ROI" (simulated return attribution), "News Impact" (news events correlated with score changes).
2. All tabs use pre-computed read models from the server — no client-side signal computation.
3. Each tab has loading, empty, error, and degraded states.
4. "History" tab shows signal score over time as a server-provided sparkline (no client-side fetch on mount).
5. No "guaranteed return" language appears in any accuracy or ROI display.

---

**AUR-008**
**Persona:** Sione
**Story:** As Sione, I want lane IDs to appear in human-readable form everywhere in the UI, so that I do not have to mentally decode internal identifiers like `manual_stock_lane`.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** PRD SL-05 · UX Heuristic H2 (Severity: Low) · `app/invest/simulation/page.tsx:965`

**Acceptance Criteria:**
1. A mapper function converts lane IDs to display names: `manual_stock_lane` → "Manual Stock Lane", `ai_copilot_lane` → "AI Copilot Lane", etc.
2. Mapper is located in `apps/web/server/mappers/` and applied to all routes that display lane names.
3. No raw underscored lane ID is visible to the user in any status pill, breadcrumb, or badge.
4. Mapper is unit-tested with all known lane ID values.

---

### Epic B2 — News Ingestion Enrichment

---

**AUR-009**
**Persona:** Theo
**Story:** As Theo, I want news items to include asset entity annotations and a "why this matters" explanation, so that I understand how a news event relates to a specific asset I am tracking.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** L
**Source:** PRD AC-06 · Feature Gap Audit (News stream/ingestion: partially integrated) · `packages/providers/src/news/*`

**Acceptance Criteria:**
1. Normalized news item schema includes: `assetIds[]`, `entities[]` (companies/tickers), `riskTags[]`, `whyItMatters: string` (per-asset explanation), and a stable `articleId` for deduplication.
2. `whyItMatters` is non-empty for any article associated with a tracked asset; it is labeled "AI-generated context" and carries its own confidence flag.
3. Missing or unavailable `whyItMatters` returns `null` — no placeholder dev copy appears in the UI.
4. News items with duplicate `articleId` are deduplicated at ingestion and not rendered twice.
5. Stale news (older than configurable threshold) is marked `isStale: true` in the read model.

---

## C. Simulate & Act

### Epic C1 — Authentication and Onboarding UX

---

**AUR-010**
**Persona:** Sione
**Story:** As Sione, I want a "Forgot password?" link on the login form, so that I can recover my account without knowing the direct reset URL.
**Priority:** P0 — Critical
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD UX-06 · UX Heuristic H3 (Severity: Critical) · `components/auth/login-form.tsx`

**Acceptance Criteria:**
1. A "Forgot password?" link appears below the password field on `login-form.tsx`, routing to `/forgot-password`.
2. The same link renders inside the error banner when `state.status === 'error'`.
3. Link text uses an i18n key.
4. Link meets WCAG 2.1 AA — minimum 44px tap target height, accessible focus indicator.
5. The existing `/api/auth/forgot-password` endpoint is confirmed to handle requests initiated from this link without modification.

---

**AUR-011**
**Persona:** Sione
**Story:** As Sione, I want auth forms to announce errors and validation states accessibly, so that I am notified of failures without relying on visual cues alone.
**Priority:** P0 — Critical (a11y)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD NFR 7.6 · accessibility-rule.md · Code Audit (auth/account forms missing role=alert/aria-live + aria-invalid/aria-describedby)

**Acceptance Criteria:**
1. Login and register form error banners have `role="alert"` and `aria-live="assertive"`.
2. Each invalid field has `aria-invalid="true"` and `aria-describedby` pointing to its error message element.
3. Success states use `role="status"` with `aria-live="polite"`.
4. Automated axe-core scan of the login and register pages returns zero accessibility violations after the fix.
5. Tab order is logical: email → password → "Forgot password?" → submit.

---

**AUR-012**
**Persona:** Sione
**Story:** As Sione, I want a "show/hide password" toggle on the login form, so that I can verify my password before submitting and reduce failed login attempts.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H5 (Severity: Medium) · `components/auth/login-form.tsx`

**Acceptance Criteria:**
1. A toggle button (eye icon) beside the password input switches the field between `type="password"` and `type="text"`.
2. The button is `type="button"` with `aria-label="Show password"` / `"Hide password"` that toggles dynamically.
3. Toggle applies to both login and registration forms.
4. No password value is logged or transmitted differently when in visible state.

---

### Epic C2 — Simulation Trade Flow

---

**AUR-013**
**Persona:** Sione
**Story:** As Sione, I want the 404 page to show a clear not-found message instead of a simulation legal disclaimer, so that I understand what happened and can navigate back without confusion.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD UX-07 · UX Heuristic H2 (Severity: High) · `app/not-found.tsx:14–15`

**Acceptance Criteria:**
1. `app/not-found.tsx` title reads "Page not found" (i18n key: `common.notFound.title`).
2. Description reads "The page you are looking for does not exist or has moved. Go back to the dashboard or use search (⌘K) to find what you need." (i18n key: `common.notFound.description`).
3. `messages.common.simulationDisclosure` is NOT used as the description.
4. The page includes a "Go to Dashboard" CTA link as an escape hatch.
5. The i18n key is present in all supported locale files.

---

**AUR-014**
**Persona:** Sione
**Story:** As Sione, I want the simulation order form to warn me when my estimated notional exceeds 25% of my available cash, so that I avoid accidentally over-sizing a position.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H5 (Severity: Low) · `components/invest/simulation-action-form.tsx`

**Acceptance Criteria:**
1. When `estimatedGross / availableCash > 0.25`, a soft warning appends to the hint line: "This represents approximately [X]% of your available cash."
2. Warning uses amber styling (design token `--color-warning`) — not red (not an error, just a caution).
3. Warning does not block submission — it is informational only.
4. Warning copy uses an i18n key.
5. The percentage shown is computed server-side in the mapper and passed as a prop — no financial math in the component.

---

**AUR-015**
**Persona:** Sione
**Story:** As Sione, I want the simulation cockpit to have a sticky section navigation strip, so that I can jump directly to Holdings, Watchlist, or Universe without scrolling through the full page.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** M
**Source:** UX Heuristic H8 (Severity: Medium) · `apps/web/app/invest/simulation/page.tsx`

**Acceptance Criteria:**
1. A `<nav>` element with fragment anchors (Metrics, Holdings, Watchlist, Universe, Tools) is rendered above the first content section on the simulation page.
2. The nav is sticky (`position: sticky; top: [header height]`) and remains visible while scrolling.
3. Each anchor link scrolls smoothly to the corresponding section.
4. Nav is keyboard-navigable and each link has a descriptive `aria-label`.
5. On mobile breakpoint, the nav collapses to a scrollable horizontal strip.

---

**AUR-016**
**Persona:** Sione
**Story:** As Sione, I want the "Clear prepared ticket" action to be visually prominent (a secondary button, not a text link), so that I can easily abandon a prepared trade without hunting for the control.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H3 (Severity: Medium) · UX Heuristic Part 4 (Severity: Medium) · `app/invest/simulation/page.tsx:591`

**Acceptance Criteria:**
1. "Clear prepared ticket," "Open asset detail," and "Open portfolio" in the simulation prepared ticket card are rendered as `button--secondary` styled elements, not text-link styled anchors.
2. Each has a minimum 44px tap target height.
3. All three retain their existing navigation behavior.
4. Visual weight is clearly secondary to the primary "Submit order" button.

---

**AUR-017**
**Persona:** Sione
**Story:** As Sione, I want the simulation lane selector to include a one-sentence description per lane, so that I understand what each lane means before choosing one for the first time.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H6 (Severity: Medium) and H10 (Severity: Medium) · `components/invest/broker-mode-launchpad.tsx`

**Acceptance Criteria:**
1. Each lane option in `BrokerModeLaunchpad` displays a one-sentence description beneath its name.
2. A collapsible "What is a simulation lane?" section appears above the selector for first-time context.
3. Descriptions use i18n keys.
4. Collapsible uses the existing `<Disclosure>` component pattern.
5. Descriptions do not contain guaranteed-return language.

---

**AUR-018**
**Persona:** Sione
**Story:** As Sione, I want the pre-trade risk gate results to be visible in the UI before I submit an order, so that I understand what the system checked and can make an informed decision.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** PRD RG-06 · Competitive Scan §8 "Make the pre-trade risk gate visible"

**Acceptance Criteria:**
1. Before order submission, the trade ticket displays a risk gate summary: each mandatory check (cash, max position, drawdown, slippage estimate, signal confidence) with a pass/fail icon and value.
2. Failed checks render in red with a short human-readable reason: "Max position limit: order would exceed 10% cap."
3. The Submit button is disabled when any check fails; the reason is shown above it.
4. Risk gate summary is computed server-side and passed as a view model prop — no risk logic in the component.
5. Risk gate summary is visible without scrolling on the trade ticket at 1280px viewport width.

---

### Epic C3 — Command Palette and Navigation Efficiency

---

**AUR-019**
**Persona:** Sione
**Story:** As Sione, I want the command palette (⌘K) to have a proper focus trap, so that keyboard navigation does not leak outside the palette while it is open.
**Priority:** P0 — Critical (a11y)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (command palette has no focus trap) · accessibility-rule.md · PRD NFR 7.6

**Acceptance Criteria:**
1. When the command palette is open, Tab and Shift+Tab cycle focus only within the palette overlay.
2. Escape closes the palette and returns focus to the triggering element.
3. Focus is set to the search input when the palette opens.
4. Automated axe-core scan with palette open returns no focus-trap violations.
5. Behavior is consistent on all routes where ⌘K is active.

---

**AUR-020**
**Persona:** Theo
**Story:** As Theo, I want ⌘K to be persistently surfaced in the header as a "Search ⌘K" chip, so that I discover fast navigation without having to see the dashboard CTA band first.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H6 (Severity: Low) and H7 (Severity: Medium) · `components/layout/header-client.tsx`

**Acceptance Criteria:**
1. A "Search ⌘K" chip or button is persistently visible in the header bar on all authenticated routes.
2. Clicking or pressing the chip activates the command palette.
3. Chip is keyboard-reachable via Tab.
4. Chip has `aria-label="Open command palette (⌘K)"`.
5. Chip does not appear on unauthenticated routes.

---

**AUR-021**
**Persona:** Sione
**Story:** As Sione, I want a "Resume simulation" shortcut in the account menu, so that I can jump directly back to my active simulation session without navigating through the invest page.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H7 (Severity: Medium) · `components/layout/account-menu.tsx`

**Acceptance Criteria:**
1. When the user has an active simulation portfolio (`portfolioSnapshot` is non-null), a "Resume simulation" link appears in the account menu dropdown.
2. The link shows the current portfolio equity value as a subtitle.
3. The link routes to `/invest/simulation`.
4. Data is sourced from the already-fetched `portfolioSnapshot` in `header.tsx` — no additional server fetch.
5. When no active simulation exists, the entry is absent (not disabled).

---

**AUR-022**
**Persona:** Sione
**Story:** As Sione, I want the dashboard CTA band to have a single primary CTA based on my session state, so that I have a clear next action rather than five equally weighted options.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** S
**Source:** UX Heuristic H8 (Severity: Medium) · `apps/web/app/dashboard/page.tsx:165–170`

**Acceptance Criteria:**
1. If simulation is active, "Open Simulation Cockpit" is styled `button--primary`; remaining CTAs are `button--secondary`.
2. If no active simulation, "Open Market Workstation" is the primary CTA.
3. State determination is server-side (based on `portfolioSnapshot`); no client-side conditional rendering for this logic.
4. The layout still renders all five CTA links — only visual weight changes.

---

## D. Prove → Promote to Live

*All epics in this Activity are Roadmap / Gated behind `assertLiveReadinessGate` and the LR-05 stage sequence. No story in this section is immediately buildable for live real-money execution.*

### Epic D1 — Live Readiness Gate UI

---

**AUR-023**
**Persona:** Marta
**Story:** As Marta, I want `/invest/live-readiness` to show a structured readiness checklist with per-check status and evidence, so that I have a principled, auditable basis for deciding whether my strategy is ready for live capital.
**Priority:** P1 — High [Roadmap]
**MVP:** MVP [Roadmap]
**Status:** Todo
**Size:** L
**Source:** PRD LR-03 · PRD G3 · User Journey B

**Acceptance Criteria:**
1. The page displays all mandatory readiness checks: broker sandbox passing, risk gate active, kill switch armed and tested, signal confidence meeting threshold, capital verified, data freshness confirmed, observability active.
2. Each check shows: current status (pass/fail/pending), evidence string (e.g., "Broker sandbox passed 47/47 test orders"), and last-check timestamp.
3. Failing checks show a link to the relevant configuration page.
4. No check may be bypassed or manually overridden from the UI — they must pass automatically.
5. The page is `export const dynamic = "force-dynamic"` and never served from a shared cache.

---

**AUR-024**
**Persona:** Marta
**Story:** As Marta, I want to download an audit export of my simulation run before promoting to live, so that I have a documented record I can review and retain.
**Priority:** P1 — High [Roadmap]
**MVP:** MVP [Roadmap]
**Status:** Todo
**Size:** L
**Source:** PRD LR-04 · NFR 7.2 (EU AI Act)

**Acceptance Criteria:**
1. A "Download audit export" action on `/invest/live-readiness` produces a human-readable file (PDF or CSV) containing: simulation run summary, signal history with explanations, risk gate outcome per order, P&L attribution by lane, and lane configuration at time of export.
2. Export is generated server-side — no client-side data assembly.
3. Export includes a `generatedAt` timestamp and the account ID.
4. Export never contains guaranteed-return language.
5. For the live path: export includes the funding-source verification record (masked account reference, verification timestamp) per PRD LR-10.

---

**AUR-025**
**Persona:** Marta
**Story:** As Marta, I want the live promotion action to be a privileged server action that sets my lane's execution mode in the database, so that live execution is never enabled via a URL parameter or form field.
**Priority:** P0 — Critical [Roadmap]
**MVP:** MVP [Roadmap]
**Status:** Todo
**Size:** M
**Source:** PRD LR-02 · live-trading-lock.md · simulation-first-rule.md

**Acceptance Criteria:**
1. A privileged server action (e.g., `promoteLaneToLive`) accepts a `laneId`, verifies session and role, calls `assertLiveReadinessGate`, and only then sets `execution_mode = 'live'` in the DB.
2. The action rejects if called with an invalid or non-owned `laneId`.
3. No URL parameter, form field, or environment variable alone activates live mode.
4. The action emits a system event logged in observability with actor ID, timestamp, and gate summary.
5. A confirmation dialog on the client states: "This is a LIVE lane. Risk gate: PASSED." before the action fires.

---

### Epic D2 — AI Autonomy Control

---

**AUR-026**
**Persona:** Marta
**Story:** As Marta, I want a global autonomy ceiling control on `/invest/autonomy` that shows a preflight summary of which lanes will activate, so that I have a coherent "go autonomous" moment rather than fragmented per-lane toggles.
**Priority:** P1 — High [Roadmap]
**MVP:** MVP [Roadmap - simulation slice buildable now]
**Status:** Todo
**Size:** L
**Source:** PRD SL-03 · SL-04 · Autonomy PRD AUT-01, AUT-05, AUT-16, AUT-17

**Acceptance Criteria:**
1. `/invest/autonomy` displays the global ceiling state (`CEILING_OFF` / `CEILING_ENABLED_SIM`) and a per-lane preflight table (lane name, configured level, preflight checks: capital ✓/✗, signal confidence ✓/✗, kill switch armed ✓/✗, data fresh ✓/✗).
2. Lanes failing preflight show a blocking reason and a link to resolve it.
3. "Enable Autonomous Mode (Simulation)" button is only active when at least one lane passes all preflight checks.
4. Confirmation dialog states: execution target (Simulation), number of lanes activating, and "You can deactivate instantly at any time."
5. The server action sets `global_autonomy_ceiling = CEILING_ENABLED_SIM` in the DB; emits an `autonomy_events` record per AUT-07.
6. `CEILING_ENABLED_LIVE` path is absent from the UI until live readiness is gated (AUT-06).

---

**AUR-027**
**Persona:** Marta
**Story:** As Marta, I want a persistent "Deactivate" control in the `/invest` header when autonomy is active, so that I can stop all autonomous order submission instantly from any page without navigating to settings.
**Priority:** P0 — Critical [Roadmap - simulation slice buildable now]
**MVP:** MVP [Roadmap - simulation slice buildable now]
**Status:** Todo
**Size:** M
**Source:** Autonomy PRD AUT-04, AUT-20, AUT-21, AUT-46 · PRD RG-04

**Acceptance Criteria:**
1. When `global_autonomy_ceiling !== CEILING_OFF`, the `/invest` header shows a persistent badge "AI Running — N Lanes Active" and a "Deactivate" button.
2. Clicking "Deactivate" opens a single confirmation dialog (no multi-step wizard): "Stop All Autonomous Activity."
3. The server action atomically: (a) sets `global_autonomy_ceiling = CEILING_OFF`, (b) cancels all `PENDING` autonomous orders, (c) logs a system event — all within one DB transaction (AUT-27).
4. After confirmation, the header badge changes to "Manual Control" and a timestamp is shown.
5. Target: no new autonomous order is submitted more than one scheduling tick (≤30s) after the DB write (AUT-21).

---

**AUR-028**
**Persona:** Marta
**Story:** As Marta, I want per-lane autonomy status panels to show orders today, daily P&L vs cap, and time to next cycle, so that I know my autonomous lanes are running correctly without checking the orders list manually.
**Priority:** P1 — High [Roadmap]
**MVP:** Nice-to-have [Roadmap]
**Status:** Todo
**Size:** M
**Source:** Autonomy PRD AUT-15, AUT-50 · PRD SL-06

**Acceptance Criteria:**
1. Each autonomous lane card displays: current effective autonomy level, last order timestamp, orders submitted today, daily P&L vs daily loss cap (as a percentage), current drawdown vs max drawdown cap, and time until next eligible scheduling cycle.
2. Panels poll for updates at ≤30s intervals using a lightweight endpoint (no full page reload).
3. A "Manual Override (Halt This Lane)" action is available per lane.
4. Panels use read models — no financial computation in component.
5. Polling stops when the page is hidden (using Page Visibility API) to avoid unnecessary server load.

---

**AUR-029**
**Persona:** Marta
**Story:** As Marta, I want the autonomy events log to be visible on `/invest/autonomy` as a timeline, so that I have a complete audit of when autonomy was enabled, disabled, and halted.
**Priority:** P1 — High [Roadmap]
**MVP:** MVP [Roadmap]
**Status:** Todo
**Size:** M
**Source:** Autonomy PRD AUT-37, AUT-40 · PRD NFR 7.2 (EU AI Act)

**Acceptance Criteria:**
1. A timeline of `autonomy_events` is rendered on `/invest/autonomy`: event type (enabled/disabled/halted/re-enabled), actor (user/operator/system), timestamp, and affected lanes.
2. Each event expands to show the preflight summary at time of transition.
3. Timeline is paginated (latest 50 events; "Load more" for older).
4. Autonomous orders in `/invest/orders` have a visible badge ("Auto") distinguishing them from manual orders (AUT-38).
5. The `autonomy_events` table is append-only — no entry may be deleted or mutated.

---

## E. Fund & Connect [Roadmap / Gated]

### Epic E1 — Banking and Funding Adapter

---

**AUR-030**
**Persona:** Marta
**Story:** As Marta, I want a bank-account funding adapter abstraction, so that deposit, withdrawal, and balance verification are normalized, server-side, and isolated from UI and domain logic — analogous to broker adapters.
**Priority:** P1 — High [Roadmap]
**MVP:** MVP [Roadmap]
**Status:** Todo
**Size:** L
**Source:** PRD BK-01 · BK-02 · architecture-boundaries.md

**Acceptance Criteria:**
1. A `BankingAdapter` interface is defined in `packages/agents/src/banking/` with methods: `verifyConnection()`, `getBalance()`, `deposit()`, `withdraw()`.
2. All banking API calls are server-side only; no banking credentials appear in client-accessible bundles.
3. Adapters default to sandbox endpoints; live credentials are distinct environment variables from sandbox credentials.
4. A provider-agnostic sandbox implementation exists for integration testing.
5. Banking adapter does not share a code path with broker adapters — they are independent abstractions.

---

**AUR-031**
**Persona:** Marta
**Story:** As Marta, I want all fund movements to be human-authorized actions that are transactional, auditable, and append-only, so that I have a complete record of every deposit or withdrawal that contributed to my trading capital.
**Priority:** P0 — Critical [Roadmap]
**MVP:** MVP [Roadmap]
**Status:** Todo
**Size:** L
**Source:** PRD BK-03 · BK-04 · simulation-auditability-rule.md

**Acceptance Criteria:**
1. Every deposit, withdrawal, and balance verification is a DB transaction recording: event type, pre-balance, post-balance, external reference, timestamp, and actor ID.
2. No fund movement may be initiated by the AI system — it requires an explicit privileged server action triggered by the authenticated user.
3. Fund movement records are append-only; no hard delete.
4. Stale or unverified funding sources block live readiness (PRD LR-09).
5. All fund-movement events are visible to the user in an account activity view.

---

## F. Operate & Monitor

### Epic F1 — Admin Monitoring and Provider Health

---

**AUR-032**
**Persona:** Admin
**Story:** As an Admin, I want `/admin/monitoring` to display a provider health matrix with last-call timestamp, status, and fallback chain position, so that I can confirm data pipeline health at a glance.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** PRD AO-01 · MD-05 · Feature Gap Audit (Admin monitor: partially integrated)

**Acceptance Criteria:**
1. The monitoring page shows a row per configured provider (polygon, twelve-data, tiingo, coingecko, finnhub, eodhd): last-successful-call timestamp, HTTP status of last call, latency (ms), rate-limit state, and position in the fallback chain.
2. A "Healthy/Degraded/Rate-limited/Unknown" status chip is rendered for each provider using existing design tokens.
3. Data is read from provider runtime health records stored in the DB (per the existing `provider_monitor_configs` migration).
4. Page is `export const dynamic = "force-dynamic"`.
5. Operator can trigger a manual health check for any provider without DB access (a server action calls the provider's `healthCheck()` method and updates the record).

---

**AUR-033**
**Persona:** Admin
**Story:** As an Admin, I want `/admin/monitoring` to show the `saveProviderMonitorConfigAction` behind proper auth and role checks, so that only authorized operators can change provider monitoring configuration.
**Priority:** P0 — Critical (security)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (admin server action has no auth/role check — privileged mutation)

**Acceptance Criteria:**
1. `saveProviderMonitorConfigAction` calls `requireCurrentSession()` and validates that the authenticated user has the `admin` or `operator` role before proceeding.
2. Unauthorized calls return a typed `{ error: "unauthorized" }` response without mutating any data.
3. The role check uses the existing auth session pattern; no new auth package is introduced.
4. An integration test confirms that an unauthenticated or non-admin call is rejected.
5. Audit log entry is written on every successful config change with actor ID and changed fields.

---

**AUR-034**
**Persona:** Admin
**Story:** As an Admin, I want live-readiness gate status per account and kill-switch states visible in the admin interface, so that I can confirm execution safety without direct database access.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** PRD AO-03 · AO-04 · Autonomy PRD AUT-08

**Acceptance Criteria:**
1. A "Live Readiness" panel on `/admin/monitoring` lists accounts with live-capable lanes: current readiness gate status, last gate check time, and which checks are failing.
2. A "Kill Switch" panel shows global and per-account halt states with last-activation timestamp.
3. Operators can trigger an account-level halt from the admin panel (requires a confirmation dialog); the action logs the operator's identity and reason.
4. Operators can inspect the global autonomy ceiling state per account (AUT-08, AUT-09).
5. All panels are server-rendered with `force-dynamic`; no user-specific data is served from a shared cache.

---

### Epic F2 — Performance and Caching Safety

---

**AUR-035**
**Persona:** Engineer
**Story:** As an Engineer, I want `/account/settings` and `/account/activity` routes to use `force-dynamic`, so that user-specific data is never served from a stale shared cache.
**Priority:** P0 — Critical (privacy/correctness)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (account/settings + account/activity missing force-dynamic) · user-specific-cache-rule.md

**Acceptance Criteria:**
1. `export const dynamic = "force-dynamic"` is present at the top level of `apps/web/app/account/settings/page.tsx` and `apps/web/app/account/activity/page.tsx`.
2. The Next.js build log confirms these routes are not statically generated.
3. A manual test confirms that after a settings change, the updated settings are immediately reflected on the next page load with no stale data.
4. CI build check (`pnpm build:web`) passes after the change.

---

**AUR-036**
**Persona:** Engineer
**Story:** As an Engineer, I want `loadLinkedAccounts` to use a user-scoped cache key, so that there is no risk of one user's linked account data being served to a different user.
**Priority:** P0 — Critical (privacy)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (`loadLinkedAccounts unstable_cache` has no user-scoped key — cross-user contamination risk) · user-specific-cache-rule.md

**Acceptance Criteria:**
1. The `unstable_cache` call wrapping `loadLinkedAccounts` is either removed (replaced with a `no-store` fetch) or has the authenticated user's ID included in the cache key array.
2. No linked account data is returned for a user ID that does not match the authenticated session.
3. A unit test confirms that two distinct user IDs produce independent cache entries.
4. `pnpm --filter @repo/db typecheck` passes after the change.

---

**AUR-037**
**Persona:** Engineer
**Story:** As an Engineer, I want sequential `await` chains in `portfolio-intelligence-service` and `ai-simulation-agent-service` to be converted to `Promise.all`, so that page load times are reduced by parallelizing independent fetches.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (sequential awaits in portfolio-intelligence-service + ai-simulation-agent-service) · slow-route-performance-rule.md

**Acceptance Criteria:**
1. All independent `await` calls within each service are grouped into `Promise.all([...])` where they have no data dependency on each other.
2. Dependent fetches (where result B requires result A) remain sequential.
3. `pnpm --filter @repo/... typecheck` passes for affected packages.
4. A before/after comparison (manual or via server timing headers) confirms reduced total fetch time on the portfolio and simulation pages.

---

## G. Trust, Safety & Compliance

### Epic G1 — Security Hardening

---

**AUR-038**
**Persona:** Engineer
**Story:** As an Engineer, I want login and register server actions to apply rate limiting, so that brute-force attacks on credentials are mitigated at the action level, not only at the route level.
**Priority:** P0 — Critical (security)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (login/register server actions bypass route-level rate limiting) · env-secret-rule.md

**Acceptance Criteria:**
1. Login and register server actions apply rate limiting consistent with their corresponding route handlers.
2. Exceeded rate limit returns a typed `{ error: "rate_limited", retryAfter: number }` without revealing whether the account exists.
3. Rate limit applies per IP address.
4. `pnpm --filter @repo/... typecheck` passes after the change.
5. An integration test confirms that exceeding the limit returns the rate-limit response.

---

**AUR-039**
**Persona:** Engineer
**Story:** As an Engineer, I want the rate limiter to use a shared persistent store rather than in-memory state, so that limits are enforced consistently across serverless instances and process restarts.
**Priority:** P1 — High (security)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (rate limiting is in-memory only — ineffective on serverless)

**Acceptance Criteria:**
1. The rate limiter is backed by a shared store (e.g., Redis, Upstash, or DB table) compatible with the deployment target.
2. Rate limit state persists across process restarts.
3. In-memory-only rate limiter state is removed.
4. Store connection failure degrades gracefully — rate limiter fails open with logging, not a 500 error.
5. The shared store credentials are accessed via the existing approved secrets pattern (validated config helper, never hardcoded).

---

**AUR-040**
**Persona:** Engineer
**Story:** As an Engineer, I want a Content Security Policy that includes `script-src`, `default-src`, and `object-src` directives, so that the risk of XSS and injection attacks is reduced.
**Priority:** P1 — High (security)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (CSP only sets frame-ancestors — missing script-src/default-src/object-src)

**Acceptance Criteria:**
1. The application CSP header includes at minimum: `default-src 'self'`, `script-src 'self' [approved hashes/nonces]`, `object-src 'none'`, and `frame-ancestors 'none'`.
2. CSP is delivered as an HTTP header (not a `<meta>` tag).
3. No inline scripts break under the new policy (use nonces or hashes as required by Next.js).
4. The `pnpm build:web` output does not include CSP-violating inline scripts without nonce/hash.
5. CSP is validated using a CSP evaluator tool before merging.

---

### Epic G2 — Dependency Security

---

**AUR-041**
**Persona:** Engineer
**Story:** As an Engineer, I want Next.js upgraded to ≥ 16.2.6 and Vitest upgraded to ≥ 3.2.6, so that known CVEs including the App Router auth/middleware bypass are resolved.
**Priority:** P0 — Critical (security)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (next 16.2.4→≥16.2.6 — 13 advisories incl. App-Router auth/middleware bypass; vitest→≥3.2.6 — 1 critical)

**Acceptance Criteria:**
1. `next` version in `package.json` is ≥ 16.2.6 after the upgrade.
2. `vitest` version is ≥ 3.2.6 after the upgrade.
3. `turbo` is upgraded to ≥ 2.9.14.
4. `brace-expansion` override is applied to resolve the known advisory.
5. `pnpm build:web` and `pnpm test` pass after all upgrades. No new breaking type errors are introduced.

---

### Epic G3 — Test Coverage for Financial-Safety-Critical Code

---

**AUR-042**
**Persona:** Engineer
**Story:** As an Engineer, I want `runUnifiedTradeWorkflow` to have unit tests covering the main execution paths, so that regressions in the core trade execution logic are caught before they reach production.
**Priority:** P0 — Critical (financial safety)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (runUnifiedTradeWorkflow — currently untested)

**Acceptance Criteria:**
1. Tests cover: simulation buy order success path, simulation sell order success path, risk gate failure (order rejected), kill switch active (order rejected), and mode routing (simulation remains default).
2. All tests use fixed, deterministic fixture data — no `Math.random()` in fixtures.
3. Tests are located in `packages/agents/src/workflows/unified-trade-workflow.test.ts`.
4. `pnpm --filter @repo/agents test` passes with all new tests included.
5. No test mocks the risk gate to bypass it — risk gate must run against test fixture data.

---

**AUR-043**
**Persona:** Engineer
**Story:** As an Engineer, I want `runBrokerSupervisor` to have integration tests covering the capital guard, policy guard, and position limit guard compositions, so that the composed guard chain is verified end-to-end.
**Priority:** P0 — Critical (financial safety)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (runBrokerSupervisor — untested; composition of capital+policy+position guards)

**Acceptance Criteria:**
1. Tests verify: all guards pass → order proceeds; capital guard fails → order rejected; position limit guard fails → order rejected; policy guard fails → order rejected.
2. Tests confirm that guard failures are logged with typed error codes, not swallowed.
3. Tests use transaction-wrapped DB interactions so they do not contaminate shared test state.
4. `pnpm --filter @repo/agents test` passes.
5. Tests are deterministic — same fixture inputs produce the same result on every run.

---

**AUR-044**
**Persona:** Engineer
**Story:** As an Engineer, I want `executeSimulationOrder` to have tests for the buy, insufficient-cash, min-notional, and reset paths, so that simulation accounting logic is covered before any live path reuses it.
**Priority:** P0 — Critical (financial safety)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (executeSimulationOrder — untested buy/insufficient-cash/min-notional/reset paths) · order-lifecycle-rule.md

**Acceptance Criteria:**
1. Tests cover: buy order success (cash deducted, position created, transaction logged); sell order success (cash credited, position updated); insufficient cash (order rejected, no state mutation); below min_notional (order rejected); account reset (archive pattern — no DELETE, simulation_events record created).
2. All state mutations verified in the DB after each test case.
3. No partial write is observable: if a test interrupts mid-transaction, the rollback leaves state clean.
4. `pnpm --filter @repo/db test` or `pnpm --filter @repo/agents test` passes with all new cases.
5. Fixtures use fixed account IDs and balances — not random.

---

**AUR-045**
**Persona:** Engineer
**Story:** As an Engineer, I want pure signal and forecasting functions (`deriveSignalSnapshot`, composite-score, indicators, `buildForecast`) to have known-input/known-output tests, so that formula changes are caught by the test suite rather than discovered in production.
**Priority:** P0 — Critical (financial safety)
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (deriveSignalSnapshot + indicators + composite-score + build-forecast — pure but untested)

**Acceptance Criteria:**
1. Each indicator (RSI, EMA, MACD, Bollinger Bands) has tests for: normal input with pre-computed expected output, minimum bars (exactly `MIN_BARS`), below-minimum bars (returns `confidence: 0`), flat price series, NaN in input (throws `InsufficientDataError`).
2. `deriveSignalSnapshot` has tests with known OHLCV fixtures and expected `{ score, confidence, explanation }` outputs.
3. `buildForecast` tests confirm: confidence bounds are present, `generatedAt` is passed in (not `Date.now()` internally), and determinism (same seed → same output).
4. Tests use the fixture pattern from `test-data-rule.md` — no `Math.random()`.
5. `pnpm --filter @repo/signals test` and `pnpm --filter @repo/forecasting test` pass.

---

### Epic G4 — Dead Code Removal and Architecture Reconciliation

---

**AUR-046**
**Persona:** Engineer
**Story:** As an Engineer, I want the unused `order-state-machine.ts` and `simulation-trade-workflow.ts` removed or wired properly, and the order lifecycle rule reconciled with the actual DB path, so that the codebase accurately reflects what the system does.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** Code Audit (order-state-machine.ts unwired; simulation-trade-workflow.ts superseded by unified; order-lifecycle-rule claims PENDING→SUBMITTED→FILLED but live path inserts 'filled' directly)

**Acceptance Criteria:**
1. `order-state-machine.ts` is either wired into the execution path or deleted. If deleted, a decision record is added to `CLAUDE.md §4`.
2. `simulation-trade-workflow.ts` is removed (superseded by `unified-trade-workflow.ts`) or the relationship is documented with a clear deprecation notice.
3. The `order-lifecycle-rule.md` is updated to accurately reflect the actual DB write path (direct `FILLED` insert vs. state machine).
4. `packages/agents typecheck` and `pnpm test` pass after removals.
5. No remaining code imports the deleted files.

---

**AUR-047**
**Persona:** Engineer
**Story:** As an Engineer, I want `runPreTradeRiskCheck` to exist as a named function (or the rules updated to name the real gate), so that the architecture documentation matches what the code actually does.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (`runPreTradeRiskCheck` named in rules/PRD but does not exist — real gate is broker-supervisor composition)

**Acceptance Criteria:**
1. Either: `runPreTradeRiskCheck` is implemented as a named function that wraps the broker-supervisor composition and is called at all execution entry points, OR the `.claude/rules/risk-gates-required.md` and PRD are updated to name the real function(s).
2. The chosen function name is consistent across rules, PRD, and all calling code.
3. `pnpm --filter @repo/agents typecheck` passes.
4. Grep confirms the named function is actually called before every order submission in agent workflows.

---

**AUR-048**
**Persona:** Engineer
**Story:** As an Engineer, I want approximately 28 identified orphan components and 10 unwired forecasting modules removed, and `noUnusedLocals`/`noUnusedParameters` added to tsconfig, so that the bundle is smaller and dead code does not mislead future contributors.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** M
**Source:** Code Audit (~28 orphan components incl. execution-mode-switch/confidence-meter/signals-intelligence-tabs; 10 unwired forecasting modules; 34 unused exports; 5 unused deps; stale .js artifacts)

**Acceptance Criteria:**
1. Identified orphan components (including `execution-mode-switch`, standalone `confidence-meter`, `signals-intelligence-tabs`) are deleted after confirming no import references.
2. Unwired forecasting modules are deleted or documented as intentionally deferred with a `// TODO: wire in [ticket ID]` comment.
3. `noUnusedLocals: true` and `noUnusedParameters: true` are added to the relevant `tsconfig.json`.
4. `pnpm --filter @repo/... typecheck` passes with the new tsconfig flags (all remaining unused symbols resolved).
5. Stale `.js` artifacts in `packages/providers/src` are removed; only `.ts` source files remain.

---

### Epic G5 — i18n Completeness

---

**AUR-049**
**Persona:** Admin
**Story:** As an Admin, I want a CI-run i18n parity test that catches missing translation keys before release, so that hardcoded English strings never ship in production to non-English users.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** M
**Source:** PRD AC-03 · Feature Gap Audit (Translation/i18n: partially integrated) · PRD AC-02

**Acceptance Criteria:**
1. A parity test (script or vitest suite) checks that every key present in the base locale (e.g., `en.json`) is also present in all other supported locale files.
2. The test fails the CI build when any locale file is missing a key.
3. Empty/loading/error state i18n keys are added to all locale files as part of this story.
4. The test runs as part of `pnpm test` or as a separate `pnpm test:i18n` script.
5. All hardcoded English strings identified in the UX audit and gap audit are replaced with i18n keys in the same scope of work.

---

**AUR-050**
**Persona:** Admin
**Story:** As an Admin, I want the footer to contain complete links to all legal pages (AI disclaimer, market-data disclaimer, cookie notice, contact/support), so that required disclosures are accessible and the nav IA is internally consistent after Legal was moved from the main nav.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (footer missing 4 legal pages now that Legal left the nav) · PRD AC-04 · AC-05 · Feature Gap Audit (Legal pages: partially integrated)

**Acceptance Criteria:**
1. Footer includes links to: AI disclaimer (`/legal/ai-disclaimer`), market-data disclaimer (`/legal/market-data-disclaimer`), cookie notice (`/legal/cookie-notice`), contact/support (`/legal/contact-support`), and simulation disclaimer (`/legal/simulation-disclaimer`).
2. All linked pages exist with correct (non-placeholder) content.
3. Footer links are organized in a logical grouping (e.g., a "Legal" column).
4. Footer links use i18n keys for link text.
5. Legal pages do not appear in the primary navigation (moved to footer per IA restructure).

---

### Epic G6 — Cash Currency Configurability

---

**AUR-051**
**Persona:** Marta
**Story:** As Marta, I want my simulation account cash to default to EUR, with a documented FX fallback when price data is in USD, so that my simulation P&L is in the currency I actually manage.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** L
**Source:** PRD SE-11 · AC-01 · Feature Gap Audit (Cash currency config: missing)

**Acceptance Criteria:**
1. `simulation_accounts` schema includes a `cash_currency` column (default `'EUR'`).
2. When creating a new simulation account, `cash_currency` defaults to `'EUR'` and may be configured at account creation.
3. FX conversion is applied when a position's quote price currency differs from the account's `cash_currency`; the conversion rate source and timestamp are recorded.
4. P&L in the portfolio view is displayed in the account's `cash_currency` with the correct symbol (€ or $).
5. If FX conversion data is unavailable, the UI displays a "USD equivalent" disclaimer rather than silently converting with a stale rate.

---

## H. Platform Quality & Hardening

### Epic H1 — Navigation IA Restructure

---

**AUR-052**
**Persona:** Sione
**Story:** As Sione, I want the navigation to be restructured to 4–5 top-level destinations with ⌘K as the primary path to everything else, so that I reach my target in fewer decisions.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Done ✓
**Size:** L
**Source:** UX Heuristic H8 (Severity: High) · PRD UX-11 · `components/layout/header.tsx`, `grouped-site-nav.tsx`

**Notes:** Navigation restructured from 32 to 25 destinations in 4 decision-funnel groups (Markets → Intelligence → Invest → Admin). Legal moved to footer. Completed in the current session.

---

### Epic H2 — Signal Safety Language

---

**AUR-053**
**Persona:** Sione
**Story:** As Sione, I want signal and recommendation copy across all routes to never use guaranteed-return language ("will", "guaranteed", "certain", "risk-free"), so that I am not misled about the nature of AI-generated suggestions.
**Priority:** P1 — High
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** PRD UX-12 · financial-ui-safety-rule.md · `explainability-rule.md`

**Acceptance Criteria:**
1. A linting rule or grep CI check confirms no shipped route or component file contains the forbidden strings: "will make you money", "guaranteed", "certain to", "risk-free", "AI predicts" (as certainty).
2. Every signal card and recommendation display includes at minimum one disclaimer: "Indicative only" or "Past performance does not guarantee future results" or "Not financial advice."
3. The disclaimer uses an i18n key.
4. Automated screenshot regression confirms disclaimers appear on signal cards in the production build.

---

### Epic H3 — Tab and Table Accessibility

---

**AUR-054**
**Persona:** Sione
**Story:** As Sione, I want the signals-cockpit tab ARIA wiring to be correct, so that screen reader users can navigate between tabs without encountering broken role assignments.
**Priority:** P0 — Critical (a11y)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (tab ARIA wiring broken in signals-cockpit — correct pattern exists in intelligence-analysis-tabs.tsx)

**Acceptance Criteria:**
1. `signals-cockpit.tsx` tabs implement `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, and `aria-controls` following the pattern in `intelligence-analysis-tabs.tsx`.
2. Keyboard navigation within the tablist follows ARIA patterns: Arrow keys move between tabs, Enter/Space activates, Home/End go to first/last.
3. Automated axe-core scan on the signals page returns no ARIA-related violations.
4. Tab ARIA fix does not alter any visual styling.

---

**AUR-055**
**Persona:** Sione
**Story:** As Sione, I want data tables in analytics views to use `<th scope>` attributes, so that screen reader users understand column and row context when navigating financial tables.
**Priority:** P1 — High (a11y)
**MVP:** MVP
**Status:** Todo
**Size:** S
**Source:** Code Audit (analytics-table missing th scope) · accessibility-rule.md

**Acceptance Criteria:**
1. Every `<th>` in the analytics table (and any other data table in the application) has an explicit `scope="col"` or `scope="row"` attribute.
2. Automated axe-core scan on affected table pages returns no table-related violations.
3. Visual presentation is unchanged.
4. Fix is applied to all table components, not only the analytics table.

---

### Epic H4 — Claude Finance Integration

---

**AUR-056**
**Persona:** Sione
**Story:** As Sione, I want Claude Finance to appear as a clearly labeled AI side-input on the signal and recommendation surfaces, so that I can read Claude's rationale alongside deterministic signals without mistaking it for the primary risk gate.
**Priority:** P2 — Medium
**MVP:** Nice-to-have
**Status:** Todo
**Size:** L
**Source:** PRD AN-09 · Feature Gap Audit (Claude Finance integration: missing) · competitive-scan §6 white-space opportunity 1

**Acceptance Criteria:**
1. A `ClaudeFinanceProvider` abstraction is implemented in `packages/ai-market-intelligence/` that wraps the existing Claude API client, applies structured analysis schema, and returns a `ClaudeFinanceSignal` with `{ score, confidence, explanation, isAIGenerated: true, modelName: "claude-finance" }`.
2. Claude Finance output is displayed with an explicit "AI-generated" label and its own confidence score — visually distinct from deterministic signals.
3. Claude Finance output is one input into the aggregated signal score, weighted by its confidence — it does not override the deterministic risk gate.
4. If Claude Finance is unavailable or returns an error, deterministic signals continue unaffected; the UI shows "AI context unavailable" in the Claude Finance section only.
5. Claude Finance output never authorizes fund movement or overrides a failed risk gate.

---

---

## Notion Todo Import Table

> Copy-paste or export this table to Notion. One row per story. Security, dependency, a11y-critical, and privacy items appear first (P0/P1).

| Name | Status | Priority | Persona | Epic | Size | MVP | Acceptance Criteria (summary) | Source |
|---|---|---|---|---|---|---|---|---|
| AUR-033 Admin action auth/role check | Todo | P0 | Admin | F1 Admin Monitoring | S | MVP | `saveProviderMonitorConfigAction` adds session + role guard; unauthorized calls return typed error; integration test confirms rejection | Code Audit (security) |
| AUR-038 Server action rate limiting | Todo | P0 | Engineer | G1 Security Hardening | M | MVP | Login/register server actions apply rate limiting matching route handlers; exceeded limit returns typed response; integration test | Code Audit (security) |
| AUR-041 Next.js + Vitest + Turbo upgrade | Todo | P0 | Engineer | G2 Dependency Security | M | MVP | next ≥16.2.6, vitest ≥3.2.6, turbo ≥2.9.14, brace-expansion override; build and tests pass | Code Audit (CVEs) |
| AUR-019 Command palette focus trap | Todo | P0 (a11y) | Sione | C3 Navigation Efficiency | S | MVP | Focus trapped in palette; Escape closes and returns focus; axe-core scan clean | Code Audit · accessibility-rule.md |
| AUR-011 Auth forms aria-live + aria-invalid | Todo | P0 (a11y) | Sione | C1 Auth UX | S | MVP | Error banners have role=alert/aria-live; invalid fields have aria-invalid + aria-describedby; axe-core clean | Code Audit · accessibility-rule.md |
| AUR-054 Signals cockpit tab ARIA | Todo | P0 (a11y) | Sione | H3 Table/Tab A11y | S | MVP | role=tablist/tab/tabpanel + aria-selected + keyboard navigation matching intelligence-analysis-tabs.tsx pattern; axe-core clean | Code Audit · accessibility-rule.md |
| AUR-035 force-dynamic on account routes | Todo | P0 (privacy) | Engineer | F2 Performance/Privacy | S | MVP | export const dynamic="force-dynamic" on account/settings and account/activity; build confirms non-static | Code Audit · user-specific-cache-rule.md |
| AUR-036 User-scoped cache key for loadLinkedAccounts | Todo | P0 (privacy) | Engineer | F2 Performance/Privacy | S | MVP | unstable_cache removed or keyed by user ID; unit test confirms distinct cache entries per user | Code Audit · user-specific-cache-rule.md |
| AUR-042 runUnifiedTradeWorkflow tests | Todo | P0 | Engineer | G3 Test Coverage | M | MVP | Tests for sim buy, sim sell, risk gate fail, kill switch active, mode routing; deterministic fixtures; no mocked risk gate | Code Audit (financial safety) |
| AUR-043 runBrokerSupervisor tests | Todo | P0 | Engineer | G3 Test Coverage | M | MVP | Tests for all-pass, capital guard fail, position limit fail, policy fail; typed error codes logged; transaction-wrapped | Code Audit (financial safety) |
| AUR-044 executeSimulationOrder tests | Todo | P0 | Engineer | G3 Test Coverage | M | MVP | Tests for buy/sell success, insufficient cash, min_notional, reset (archive not delete); DB state verified per case | Code Audit (financial safety) |
| AUR-045 Signal/forecast pure function tests | Todo | P0 | Engineer | G3 Test Coverage | M | MVP | Indicator tests: normal, MIN_BARS exact, below-MIN_BARS, flat series, NaN input; forecast determinism + bounds; no Math.random() in fixtures | Code Audit (financial safety) |
| AUR-010 Forgot password link | Todo | P0 | Sione | C1 Auth UX | S | MVP | Link below password field and in error banner; routes to /forgot-password; i18n key; 44px tap target | PRD UX-06 · UX H3 Critical |
| AUR-025 Live lane promotion server action [Roadmap] | Todo | P0 [Roadmap] | Marta | D1 Live Readiness Gate | M | MVP [Roadmap] | Privileged server action only; verifies session + role + assertLiveReadinessGate; no URL param activation; system event logged; confirmation dialog | PRD LR-02 |
| AUR-027 Persistent deactivate control [Roadmap-sim now] | Todo | P0 [Roadmap] | Marta | D2 AI Autonomy Control | M | MVP [Roadmap] | Deactivate button in /invest header when autonomy active; atomic DB write + PENDING cancel + log in one transaction; ≤30s latency | Autonomy PRD AUT-04, AUT-20, AUT-21 |
| AUR-040 Content Security Policy | Todo | P1 | Engineer | G1 Security Hardening | S | MVP | CSP includes default-src, script-src, object-src; delivered as HTTP header; no CSP violations in build | Code Audit (security) |
| AUR-039 Shared rate-limit store | Todo | P1 | Engineer | G1 Security Hardening | M | MVP | Rate limiter backed by shared persistent store; persists across restarts; fails open with logging | Code Audit (security) |
| AUR-001 SIM badge on /market /signals /observe | Todo | P1 | Theo | A1 Market Overview | S | MVP | Persistent SIMULATION badge on all three routes; WCAG AA contrast; screenshot regression | PRD UX-01 · UX H4 High |
| AUR-003 Remove "No source URL" from news | Todo | P1 | Theo | A1 Market Overview | S | MVP | Suppress link when no href; fallback "Source unavailable" if needed; i18n key | UX H2 High |
| AUR-013 Fix 404 page copy | Todo | P1 | Sione | C2 Simulation Trade Flow | S | MVP | Title "Page not found"; description non-disclaimer copy; "Go to Dashboard" CTA; i18n key | PRD UX-07 · UX H2 High |
| AUR-012 Show/hide password toggle | Todo | P1 | Sione | C1 Auth UX | S | MVP | Eye icon toggle button; aria-label toggles; applies to login + register forms | UX H5 Medium |
| AUR-018 Pre-trade risk gate visible in UI | Todo | P1 | Sione | C2 Simulation Trade Flow | M | MVP | Risk gate summary on trade ticket; pass/fail per check; Submit disabled on failure; server-side read model | PRD RG-06 |
| AUR-005 ConfidenceMeter threshold legend | Todo | P1 | Theo | B1 Confidence/Explainability | S | MVP | Legend ≥70/40–69/<40/0; semantic fill color; i18n keys; WCAG AA; dead standalone component removed | PRD EX-05 · UX H1 Medium |
| AUR-032 Provider health matrix on /admin/monitoring | Todo | P1 | Admin | F1 Admin Monitoring | M | MVP | Per-provider: last-call ts, status chip, latency, rate-limit state, fallback position; manual trigger server action | PRD AO-01 · Gap Audit |
| AUR-034 Live-readiness + kill-switch admin panels | Todo | P1 | Admin | F1 Admin Monitoring | M | MVP | Readiness panel per account; kill-switch panel; operator halt action with confirmation; force-dynamic | PRD AO-03 · AO-04 |
| AUR-037 Promise.all in portfolio/agent services | Todo | P1 | Engineer | F2 Performance/Privacy | S | MVP | Independent awaits converted to Promise.all; dependent awaits remain sequential; typecheck passes | Code Audit · slow-route-performance-rule.md |
| AUR-046 Remove/reconcile dead order lifecycle code | Todo | P1 | Engineer | G4 Dead Code/Reconciliation | M | MVP | order-state-machine.ts decision + sim-trade-workflow.ts removed; order-lifecycle-rule.md updated to reflect actual DB path | Code Audit |
| AUR-047 Reconcile runPreTradeRiskCheck naming | Todo | P1 | Engineer | G4 Dead Code/Reconciliation | S | MVP | Named function created or rules/PRD updated to match real function; grep confirms usage before every order | Code Audit |
| AUR-049 i18n parity CI test | Todo | P1 | Admin | G5 i18n | M | MVP | CI fails on missing keys; empty/loading/error keys added; all hardcoded strings from UX/gap audit replaced | PRD AC-02 · AC-03 |
| AUR-050 Footer legal links complete | Todo | P1 | Admin | G5 i18n | S | MVP | Footer has links to AI disclaimer, market-data disclaimer, cookie notice, contact/support; pages have correct content | PRD AC-04 · AC-05 · Gap Audit |
| AUR-023 Live-readiness structured checklist [Roadmap] | Todo | P1 [Roadmap] | Marta | D1 Live Readiness Gate | L | MVP [Roadmap] | Per-check status + evidence + timestamp; no UI bypass; force-dynamic | PRD LR-03 |
| AUR-026 Global autonomy ceiling + preflight UI [Roadmap-sim] | Todo | P1 [Roadmap] | Marta | D2 AI Autonomy Control | L | MVP [Roadmap] | /invest/autonomy shows ceiling state; per-lane preflight table; enable confirmation dialog; autonomy_events logged | Autonomy PRD AUT-01, AUT-05 |
| AUR-029 Autonomy events log on /invest/autonomy [Roadmap-sim] | Todo | P1 [Roadmap] | Marta | D2 AI Autonomy Control | M | MVP [Roadmap] | Timeline of autonomy_events; auto orders badged in /invest/orders; append-only records | Autonomy PRD AUT-37, AUT-38, AUT-40 |
| AUR-055 Analytics table th scope | Todo | P1 (a11y) | Sione | H3 Table/Tab A11y | S | MVP | All th elements have scope="col" or "row"; axe-core clean; visual unchanged | Code Audit · accessibility-rule.md |
| AUR-053 Signal safety language check | Todo | P1 | Sione | H2 Signal Safety Language | S | MVP | Grep CI check for forbidden strings; disclaimer on every signal card; i18n key | PRD UX-12 · financial-ui-safety-rule.md |
| AUR-002 Price staleness indicator | Todo | P1 | Theo | A1 Market Overview | S | MVP | isStale=true shows visible indicator + accessible label; no price displayed without timestamp | PRD UX-02 · MD-02 |
| AUR-008 Lane ID display names | Todo | P2 | Sione | B1 Confidence/Explainability | S | Nice-to-have | Mapper converts lane IDs to display names; no raw IDs visible; unit-tested | PRD SL-05 · UX H2 Low |
| AUR-006 Signal guide tooltip | Todo | P2 | Theo | B1 Confidence/Explainability | S | Nice-to-have | ? icon opens popover with score/confidence legend; focus trap; Escape dismisses; aria-describedby | UX H10 Medium |
| AUR-007 Signal detail history/accuracy/ROI/news tabs | Todo | P2 | Sione | B1 Confidence/Explainability | L | Nice-to-have | 4 tabs: History, Accuracy, ROI, News Impact; server read models; all 4 states; no guaranteed-return language | PRD AN-08 · Gap Audit |
| AUR-009 News ingestion enrichment | Todo | P2 | Theo | A2 Market Ticker | L | Nice-to-have | News schema extended: assetIds, entities, riskTags, whyItMatters, articleId; deduplication; stale flagging | PRD AC-06 · Gap Audit |
| AUR-014 Position-size-vs-cash soft warning | Todo | P2 | Sione | C2 Simulation Trade Flow | S | Nice-to-have | Amber warning when estimatedGross/availableCash>25%; server-computed; i18n key; does not block submit | UX H5 Low |
| AUR-015 Sticky section nav on simulation cockpit | Todo | P2 | Sione | C2 Simulation Trade Flow | M | Nice-to-have | Sticky nav with fragment anchors for 5 sections; keyboard-navigable; mobile scrollable strip | UX H8 Medium |
| AUR-016 "Clear prepared ticket" as secondary button | Todo | P2 | Sione | C2 Simulation Trade Flow | S | Nice-to-have | 3 ticket actions as button--secondary; min 44px tap target; behavior unchanged | UX H3 Medium · Part 4 Medium |
| AUR-017 Lane descriptions in BrokerModeLaunchpad | Todo | P2 | Sione | C2 Simulation Trade Flow | S | Nice-to-have | One-sentence description per lane; "What is a simulation lane?" collapsible; i18n keys; no guaranteed-return language | UX H6 Medium · H10 Medium |
| AUR-020 ⌘K chip in header | Todo | P2 | Theo | C3 Navigation Efficiency | S | Nice-to-have | Persistent "Search ⌘K" chip in header; activates palette; aria-label; authenticated routes only | UX H6 Low · H7 Medium |
| AUR-021 Resume simulation in account menu | Todo | P2 | Sione | C3 Navigation Efficiency | S | Nice-to-have | "Resume simulation" link + equity subtitle in account menu when portfolioSnapshot non-null; no extra fetch | UX H7 Medium |
| AUR-022 Primary CTA on dashboard band | Todo | P2 | Sione | C3 Navigation Efficiency | S | Nice-to-have | State-based primary CTA (simulation active → Open Cockpit; else → Open Market); others secondary; server-side | UX H8 Medium |
| AUR-024 Simulation audit export [Roadmap] | Todo | P1 [Roadmap] | Marta | D1 Live Readiness Gate | L | MVP [Roadmap] | Server-side PDF/CSV export: sim summary, signal history, risk gate outcomes, P&L, lane config; no guaranteed-return language | PRD LR-04 |
| AUR-028 Per-lane autonomy status panels [Roadmap-sim] | Todo | P1 [Roadmap] | Marta | D2 AI Autonomy Control | M | Nice-to-have [Roadmap] | Orders today, daily P&L vs cap, drawdown vs cap, next cycle; ≤30s polling; Page Visibility API; read models | Autonomy PRD AUT-15, AUT-50 |
| AUR-030 Banking adapter abstraction [Roadmap] | Todo | P1 [Roadmap] | Marta | E1 Banking/Funding | L | MVP [Roadmap] | BankingAdapter interface in packages/agents; sandbox default; distinct credentials; independent from broker | PRD BK-01, BK-02 |
| AUR-031 Fund movement auditability [Roadmap] | Todo | P0 [Roadmap] | Marta | E1 Banking/Funding | L | MVP [Roadmap] | Every deposit/withdrawal transactional + append-only; human-authorized only; stale source blocks readiness | PRD BK-03, BK-04 |
| AUR-004 Market ticker degraded state label | Todo | P2 | Theo | A2 Market Ticker | S | Nice-to-have | "Ticker unavailable" chip when freshnessState=unavailable; aria-label; auto-resumes when data returns | UX H1 Low |
| AUR-048 Orphan component + dead code removal | Todo | P2 | Engineer | G4 Dead Code/Reconciliation | M | Nice-to-have | ~28 orphan components deleted; 10 unwired forecasting modules removed or documented; noUnusedLocals/noUnusedParameters in tsconfig; stale .js artifacts removed | Code Audit |
| AUR-051 Configurable simulation cash currency (EUR default) | Todo | P2 | Marta | G6 Cash Currency | L | Nice-to-have | cash_currency column on simulation_accounts (default EUR); FX conversion applied; P&L in account currency; FX unavailable shows disclaimer | PRD SE-11 · AC-01 · Gap Audit |
| AUR-056 Claude Finance integration | Todo | P2 | Sione | H4 Claude Finance | L | Nice-to-have | ClaudeFinanceProvider abstraction; "AI-generated" label; own confidence score; one signal input; unavailable → graceful fallback; no risk gate override | PRD AN-09 · Gap Audit |
| AUR-052 Navigation IA restructure | Done | P1 | Sione | H1 Navigation IA | L | MVP | 4 decision-funnel groups; 32→25 destinations; Legal moved to footer | UX H8 High · PRD UX-11 |
