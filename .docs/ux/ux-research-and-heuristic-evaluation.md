# UX Research & Heuristic Evaluation — Aurox Intelligence
**Date:** 2026-06-13
**Scope:** Full workstation — dashboard, invest/simulation cockpit, market, asset detail, signals, account, auth flows, navigation system
**Evaluator:** Expert static analysis (Nielsen's 10 Usability Heuristics + finance-workstation-specific criteria)
**Routes analysed:** 40+ pages across `apps/web/app/`, 80+ components across `apps/web/components/`

---

## Executive Summary — Top 5 Findings

| Rank | Severity | Finding | Primary Location |
|------|----------|---------|-----------------|
| 1 | **Critical** | Login form lacks a "Forgot password" escape hatch — the API endpoint exists but no link surfaces in the UI. Users with forgotten credentials are stranded. | `components/auth/login-form.tsx` |
| 2 | **High** | The 404 Not-Found page uses `messages.common.simulationDisclosure` as its error description — a simulation-mode legal disclaimer, not a helpful error message. | `app/not-found.tsx` |
| 3 | **High** | Dashboard news panel surfaces developer-facing copy ("No source URL") as a visible UI label when a headline has no link, instead of suppressing the element entirely. | `app/dashboard/page.tsx:155` |
| 4 | **High** | Simulation execution mode badge (`SIM` / `SIMULATION`) is applied inconsistently — present in the finance cockpit, account view, and invest page headers, but absent from the market overview (`/market`), signals page, and observe workstation while trade-adjacent actions appear there. | Multiple routes |
| 5 | **Medium** | The navigation system exposes 8 items in the "Core Workstations" group and a further 5–7 items per secondary group, totalling 30+ visible nav destinations, violating Hick's Law and Miller's 7±2 chunks. The command palette (`⌘K`) is an excellent power-user escape but is not surfaced as the primary navigation pattern. | `components/layout/header.tsx`, `grouped-site-nav.tsx` |

---

## Part 1 — Competitive & Award Benchmark

### 1.1 State-of-the-Art Fintech / Trading Workstations

**Bloomberg Terminal**
The Terminal compresses maximum data density into a fixed viewport. Its key UX insight — relevant for Aurox — is that *complexity must be concealed, not removed*. Bloomberg UX designers explicitly work to "hide complexity from users to prevent confusion or workflow disruption" while still surfacing the full data set on demand [Bloomberg Tech, 2024]. The implication for Aurox: the information is rich enough to justify this approach, but the progressive disclosure mechanisms (the `<Disclosure>` components) need to be more consistently applied.

**TradingView**
TradingView's dominant UX advantage is keyboard-first navigation (Ctrl+K for search, documented shortcut library) and a persistent chart that never disappears. It uses a clear three-zone layout: instrument search / symbol selector → chart → watchlist + tools. Its dark mode, information-dense watchlists, and quick-action menus set the expectation for professional users in this category. Aurox already matches TradingView in the command palette shortcut (`⌘K`) — a significant strength.

**Interactive Brokers (IBKR) Trader Workstation**
IBKR's "Mosaic" layout introduced movable panels and persistent watchlist tiles. The key lesson: *financial workstations earn trust by being explicit about data freshness on every quote tile*, not just in a dedicated health section. IBKR shows a last-trade timestamp next to every quote.

**Kraken Pro / Coinbase Advanced**
Both use a tight primary zone — order book, chart, order ticket — visible simultaneously without scrolling. For Aurox's simulation cockpit, the split between "metrics strip" → "ledger tabs" → "tradable universe" stacks a lot of scrolling before reaching the trade ticket. Best-in-class crypto workstations keep the order ticket anchored in the viewport.

**Robinhood / Webull (Onboarding Model)**
These platforms excel at onboarding-to-first-action: the user reaches a meaningful interaction (add to watchlist, see a stock chart) within 60 seconds. Aurox's simulation requires: login → invest page → understand lanes → start lane → return to simulation cockpit. That is 4–5 steps before paper trading begins.

### 1.2 Award-Winning Data/Finance UI Patterns (Awwwards / CSSDA)

Award-winning data dashboards in 2025 share these observable patterns, relevant to Aurox:

- **Spatial hierarchy over visual clutter**: One dominant metric per viewport zone, supporting metrics in a clearly lower visual weight. Aurox's 6-card KPI strip on the simulation page is solid; the dashboard could benefit from stronger visual hierarchy between the mission-control band and secondary groups.
- **Micro-interactions for state transitions**: Fill success, order confirmation, and loading states use motion to build confidence. Aurox's shimmer skeletons are present but the success fill feedback (`Bought 1.0000 AAPL @ $182.00`) uses a text string only — a subtle animation or color flash would reinforce the action.
- **Dark-first colour systems with controlled semantic colour use**: Financial data products that win awards use colour conservatively (green/red only for directional P&L, amber for caution), exactly as the project's design tokens intend.
- **Progressive disclosure as a first-class pattern**: `<details>`/`<summary>` used for secondary content (Aurox uses this well via `<Disclosure>`) — but the pattern must be consistent across all pages.

### 1.3 Finance-Specific UX Principles Applied in This Evaluation

Beyond Nielsen's 10:

| Principle | Description |
|-----------|-------------|
| **Trust legibility** | Users must see evidence that the system is safe to use — simulation badges, disclaimers, and data-source attribution at point of action |
| **Risk communication** | Risk labels must appear at the same visual level as the action they govern, not buried below the fold |
| **Data freshness signaling** | Every live price must carry a visible age indicator; stale data must be visually distinct from fresh data |
| **Decision-centric layout** | The primary action (place trade, inspect asset) must be the dominant CTA, not one of five equal-weight buttons |
| **Tabular number legibility** | Monetary values in tables require `font-variant-numeric: tabular-nums` and consistent decimal precision |
| **Empty state completeness** | Every data-driven section must have a designed first-run state that explains what to do next |

---

## Part 2 — Heuristic Evaluation

### H1 — Visibility of System Status

| Status | Evidence |
|--------|----------|
| **Mostly met with gaps** | Loading states: excellent. Root `loading.tsx` uses `<SkeletonWorkspace>` with contextual copy ("Preparing intelligence workspace…"). Invest page uses granular `<Suspense>` boundaries with per-section shimmer skeletons. Invest route has explicit `InvestDataHealthSection` with provider name, last-update time, freshness label, and symbol coverage. Simulation cockpit surfaces workstation status ("running", "paused", "stopped") via the `WorkstationPageHeader` badge. |

**Gaps identified:**

- **Severity: Medium** — The `ConfidenceMeter` component (`components/stats/confidence-meter.tsx`) renders a raw percentage (`value: number`) but no threshold context. A user cannot know if 62% confidence is good, acceptable, or low without a reference legend. The component has no colour change or semantic zone indication.
  - Fix: Add semantic colour fill (green ≥ 70%, amber 40–69%, red < 40%) matching the `confidence-score-rule.md` thresholds. Display a threshold label below the bar ("Below 40% = indicative only").

- **Severity: Low** — The market ticker in the header has a `freshnessState: 'unavailable'` degraded state, but when the ticker falls back to empty items, the user sees a blank marquee strip with no visible indicator that it is degraded vs. simply quiet. The header timeout is 3 seconds and silently discards data.
  - Fix: Surface the `statusLabel` from `freshnessState === 'unavailable'` as a visible inline message in the ticker bar ("Market data loading…" or a static "Ticker unavailable" chip).

---

### H2 — Match Between System and Real World

| Status | Evidence |
|--------|----------|
| **Mostly met** | Copy is generally user-facing and context-appropriate. The simulation cockpit uses "Paper portfolio", "Fictive cash", "Available cash" — all clear. The `WorkstationPageHeader` summary surfaces `messages.common.simulationDisclosure` as orientation copy. |

**Gaps identified:**

- **Severity: High** — `app/not-found.tsx:14–15` uses `eyebrow="404"` and `title={messages.common.unavailable}` and — critically — `description={messages.common.simulationDisclosure}`. The description text for a 404 page is the simulation legal disclaimer ("All trades are fictive and for simulation purposes only"). This is a fundamental copy mismatch: the user sees a cryptic 404 with unrelated legal text.
  - Fix: Replace `description` with a clear, user-facing message: "The page you're looking for doesn't exist or has moved." Add a concrete next step CTA.

- **Severity: Medium** — Dashboard news panel (`app/dashboard/page.tsx:155`) renders the literal string `"No source URL"` as visible UI when a news item has no link. This is developer terminology surfaced to end users.
  - Fix: Either suppress the link element entirely (`{item.href && <a href={item.href}>Open source</a>}`) or display "Source unavailable" if the presence of the field must be indicated.

- **Severity: Low** — The macro regime page surfaces raw score values (`macroContext.regime.inflationRegime.score.toFixed(2)`) without units or scale context in the simulation cockpit (`app/invest/simulation/page.tsx:965–968`). Four numeric boxes show values like `0.34` with no axis or legend.
  - Fix: Add a scale label ("Pressure scale: −1 to +1") and a visual indicator (coloured dot or direction arrow) derived server-side in the mapper.

- **Severity: Low** — Lane IDs surface in user-visible contexts with underscores: `manual_stock_lane`, `ai_copilot_lane`. These appear in the simulation page breadcrumbs and status badges in their raw form.
  - Fix: Map lane IDs to display names in the mapper. `manual_stock_lane` → "Manual Stock Lane", etc.

---

### H3 — User Control and Freedom

| Status | Evidence |
|--------|----------|
| **Mostly met** | The simulation reset flow (`ResetSimulationAccountForm`) correctly implements a two-step confirmation (first click shows warning and confirm/cancel buttons). The command palette (`⌘K`) with Escape dismissal is properly implemented. Navigation has Escape key handling in `grouped-site-nav.tsx`. |

**Gaps identified:**

- **Severity: Critical** — The login form (`components/auth/login-form.tsx`) has no "Forgot password?" link. The API endpoint (`/api/auth/forgot-password`) exists and is fully implemented. Users who cannot recall their password have no in-context escape hatch — they must know to navigate directly to a reset URL.
  - Fix: Add a "Forgot password?" link below the password field pointing to `/forgot-password`.

- **Severity: Medium** — The simulation workstation has no "undo last trade" or "cancel pending ticket" action beyond navigating away from the prepared ticket (which requires a link click that clears the `?intent=` query parameters). There is a "Clear prepared ticket" link but it is a tertiary `journal-action-link` style, easily missed.
  - Fix: Make "Clear prepared ticket" visually equivalent to a secondary action button, not an inline text link, within the ticket card header.

- **Severity: Low** — The account settings `password-form` at `components/account/password-form.tsx` shows no password strength indicator while typing. The user can only discover requirements at submission time when the server returns a validation error.
  - Fix: Add client-side password strength hints ("At least 8 characters", "Include a number") that appear inline as the user types `currentLength > 0`.

---

### H4 — Consistency and Standards

| Status | Evidence |
|--------|----------|
| **Mostly met with notable gaps** | Button variant conventions (`button--primary`, `button--secondary`, `button--danger`) are applied consistently. The `status-pill` system and `StatusBadge` component are used uniformly. `font-variant-numeric: tabular-nums` is applied across financial tables in CSS. |

**Gaps identified:**

- **Severity: High** — Simulation mode indicator is inconsistent. The finance cockpit (`finance-hero-bar.tsx:17`) shows a permanent `SIMULATION` badge with `aria-label`. The account cockpit shows `SIMULATION`. The `WorkstationPageHeader` passes `statusLabel="simulation"` on invest and simulation pages. But the market overview (`/market`), signals page (`/signals`), and observe workstation (`/observe`) — all of which surface trade-adjacent actions — do not have a persistent simulation mode indicator.
  - Fix: Add a global simulation mode indicator to the header or a persistent banner component that appears on all routes that can trigger simulation trades. The project rule `financial-ui-safety-rule.md` explicitly requires this.

- **Severity: Medium** — The `InvestableAssetCard` component shows `changeLabel` in the "Move" row (`comparison-stat__subvalue`). On the simulation page, `changeLabel` is set to `"Watchlist"` for watchlist items (a category label, not a price change). On the invest page the same slot shows a percent change. The same visual component carries two different semantic meanings depending on the parent page context.
  - Fix: Use a dedicated `categoryBadge` prop for non-change-value labels, and keep `changeLabel` reserved for `+1.23%` style content.

- **Severity: Low** — The signal badge in `SignalScoreBadge` renders the combined `"Label (score | confidence%)"` in a single `<StatusBadge>` string. Other metrics in the workstation separate label from value (e.g., `comparison-stat__label` + `comparison-stat__value`). The signal badge is visually different from every other metric display.
  - Fix: Decompose the badge into a label element and a separate score/confidence element to match the workstation visual grammar.

---

### H5 — Error Prevention

| Status | Evidence |
|--------|----------|
| **Well met** | The `SimulatedOrderForm` implements multi-layer error prevention: client-side `onFormSubmit` validation with `validateClientQuantity()`, server-side Zod validation, quantity chips for common values, and percentage chips (25%/50%/100%) for sells. The `disabled` + `disabledReason` pattern prevents invalid trades proactively. The simulation reset form requires two clicks. |

**Gaps identified:**

- **Severity: Medium** — The login form (`components/auth/login-form.tsx`) has no "show password" toggle on the password input. Mistyped passwords are invisible and produce a generic error. In a financial application where authentication failure locks the user out of their portfolio, this friction increases error rate.
  - Fix: Add a show/hide password toggle button (eye icon, `type="button"` with `aria-label="Show password"`) inside the password input field.

- **Severity: Low** — The `SimulatedOrderForm` shows `estimatedGross` as a hint line ("Estimated notional: $1,820.00") but does not warn when the estimated notional exceeds a configurable percentage of available cash. A user could accidentally size a position to 95% of their simulation account with no warning.
  - Fix: Add a soft warning state to the hint area when `estimatedGross / availableCash > 0.25` (for example): "This represents ~30% of your available cash — consider a smaller position."

---

### H6 — Recognition Over Recall

| Status | Evidence |
|--------|----------|
| **Mostly met** | The command palette (`⌘K`) is well implemented with routes, assets, and actions as named entries. The `grouped-site-nav` surfaces all destinations with icon glyphs and descriptions. The `MarketViewToggle` makes the grid/list switch immediately visible. |

**Gaps identified:**

- **Severity: Medium** — The simulation lane selector (`BrokerModeLaunchpad`) lists lane options (manual_stock_lane, manual_multi_asset_lane, ai_copilot_lane, signal_follow_lane, agent_sandbox_lane) but does not explain what each lane does inline. A user selecting a lane must recall from prior reading what each one means.
  - Fix: Add a one-sentence description beneath each lane name in the launchpad (a `description` prop already exists in `InvestmentCapabilityCard` — apply the same pattern to lane selection buttons).

- **Severity: Low** — The `⌘K` shortcut is announced on the dashboard CTA band (`<span className="dashboard-exec-cta-band__hint text-muted">Press <kbd>⌘K</kbd> for quick navigation</span>`) but is not surfaced persistently in the header. Users who do not see the dashboard first will not discover this feature.
  - Fix: Add a small persistent `⌘K` hint chip in the header search area (standard pattern: magnifying-glass button labelled "Quick search ⌘K").

---

### H7 — Flexibility and Efficiency of Use

| Status | Evidence |
|--------|----------|
| **Partially met** | The command palette is the primary power-user mechanism and is well built. The `MarketViewToggle` (grid/list) provides a density choice. The `?tab=` URL parameter for the simulation ledger persists tab state across navigation, which is excellent for power users. |

**Gaps identified:**

- **Severity: Medium** — No keyboard shortcuts are documented or available for core simulation actions (Buy, Sell, navigate to asset detail). On TradingView, pressing `B` or `S` opens the order ticket. Power users in a trading workstation context expect at minimum keyboard access to trade form submission.
  - Fix: Add `accesskey` attributes to primary trade buttons, or implement a lightweight key binding (`b` → focus buy form, `s` → focus sell form) on the simulation page when a prepared ticket is active.

- **Severity: Medium** — Returning simulation users cannot quickly resume their last session without navigating through the full invest page → simulation page flow. There is no persistent "Resume simulation" entry point in the header or dashboard beyond the CTA band.
  - Fix: When `portfolioSnapshot` is non-null in the header (it is already fetched in `header.tsx`), surface a "Resume simulation" link in the account menu dropdown alongside the portfolio value that is already displayed there.

- **Severity: Low** — The simulation page `?tab=` parameter works for deep linking, but the page header "Destinations" quick-links (`WorkstationPageHeader`) do not include a tab-specific link (e.g., "Open journal" → `/invest/simulation?tab=journal`).
  - Fix: Add tab-specific quick-links to the `WorkstationPageHeader` actions array on the simulation page.

---

### H8 — Aesthetic and Minimalist Design

| Status | Evidence |
|--------|----------|
| **Mostly met with cognitive-load concerns** | The dashboard groups information into labelled sections with eyebrows and descriptors. The `<Disclosure>` component (used for "All portfolio metrics", "Lanes & exposure", "Macro regime context", "Session diagnostics", "AI broker agent") correctly hides secondary content. The shimmer skeleton system matches content layout, preventing layout shift. |

**Gaps identified:**

- **Severity: High** — The navigation system violates Hick's Law. The grouped site nav exposes 8 items in "Core Workstations", 5 in "Markets", 7 in "Intelligence", 3 in "Admin", 9 in "Legal" — approximately 32 distinct navigation destinations before any search. Even with grouping, a user choosing between 8 core workstations must evaluate each one before acting. The `⌘K` command palette exists but is not the default navigation pattern.
  - Fix: Collapse the primary nav to 4–5 top-level destinations (Dashboard, Market, Invest, Signals, Account) with the command palette as the explicit path to everything else. Move "Intelligence" sub-routes under a single "Intelligence" top-level item. Move "Admin" and "Legal" to the account menu.

- **Severity: Medium** — The simulation page body is a very long vertical scroll (metrics strip → disclosure → ledger tabs → watchlist header → watchlist cards → tradable universe header → tradable universe cards → context & tools disclosures). A first-time user will scroll through ~12 distinct sections before seeing the full surface. The trade ticket (prepared ticket) appears above the metrics strip, which is good, but the relationship between the ledger and the asset cards below is not visually separated.
  - Fix: Add a sticky section-navigation strip (a `<nav>` with fragment anchors: "Metrics | Holdings | Watchlist | Universe | Tools") so users can jump directly to the section they need, especially on return visits.

- **Severity: Medium** — The dashboard CTA band has 5 equal-weight `<Link>` buttons ("Open Market Workstation", "Open Observer Feed", "Inspect Alert Center", "Open Simulation Cockpit", "Review Portfolio Intelligence"). There is no primary CTA; all are `button` (default style). Per the `workstation-ui-rule.md`, the most important action should have a distinct visual weight.
  - Fix: Designate "Open Market Workstation" or "Open Simulation Cockpit" (depending on user state) as `button--primary`, demote the rest to `button--secondary`.

---

### H9 — Help Users Recognize, Diagnose, and Recover from Errors

| Status | Evidence |
|--------|----------|
| **Well met overall with one critical gap** | The `SimulationFormFeedback` component uses `role="alert"` with `aria-live="assertive"` for errors and `role="status"` with `aria-live="polite"` for success — correct semantics. Field-level errors have proper `aria-invalid` and `aria-describedby` linkage. The `QUOTE_NOT_READY` state surfaces a retry button with countdown, which is excellent. |

**Gaps identified:**

- **Severity: Critical** — The login form at `components/auth/login-form.tsx:29` shows a single `form-banner` error message for all authentication failures (invalid email, wrong password, account not found, locked account). The message content is not inspectable from the component — it relies on `state.message` from the server action, but there is no contextual "Forgot password?" link co-located with the error banner.
  - Fix: When `state.status === 'error'`, render a "Forgot password?" link inline beneath the error banner. This does not require differentiating error types — the link is always relevant when authentication fails.

- **Severity: Medium** — The 404 page (`app/not-found.tsx`) uses `messages.common.unavailable` as its title and `messages.common.simulationDisclosure` as its description. "Unavailable" is a data-freshness term borrowed from the quote system, not a natural error heading. "Simulation disclosure" is the wrong description for a navigation error.
  - Fix (same as H2): Write specific 404 copy: title = "Page not found", description = "The page you're looking for doesn't exist or has moved. Go back to the dashboard or use search (⌘K) to find what you need."

- **Severity: Low** — The global error boundary (`app/global-error.tsx`, `app/error.tsx`) was not audited for copy quality. Ensure these use specific, actionable language and surface a "Go to dashboard" escape hatch rather than a bare browser reload.

---

### H10 — Help and Documentation

| Status | Evidence |
|--------|----------|
| **Partially met** | Legal pages (risk disclosure, simulation disclaimer, AI disclaimer, market data disclaimer) are well structured and accessible via `/legal`. The `WorkstationPageHeader` `summary` field surfaces the simulation disclosure on every execution page. The `<Disclosure>` for "Platform capabilities & safety model" on the invest page provides inline reference. |

**Gaps identified:**

- **Severity: Medium** — The simulation lane selection (`BrokerModeLaunchpad`) is the most consequential first-time decision a user makes (which lane to start). There is no contextual help — no tooltip, no "Learn more" link, no explanation of what each lane means in practice. A first-time user must understand "manual_stock_lane" vs "ai_copilot_lane" with no in-context guidance.
  - Fix: Add a collapsible "What is a simulation lane?" explanation directly in the `BrokerModeLaunchpad` component, above the lane selector.

- **Severity: Medium** — Signal scores are surfaced across multiple pages (invest cards, simulation universe, signals page) but there is no persistent "How to read signals" help. The `SignalSummary` component shows an `explanation` string (good) but does not link to or provide a legend for the confidence scale.
  - Fix: Add a persistent "Signal guide" tooltip or popover accessible from the `SignalScoreBadge` (a `?` icon that expands a micro-legend: "Score −1 to +1 · Confidence 0–100% · < 40% = insufficient data").

- **Severity: Low** — The `⌘K` shortcut is the only documented keyboard shortcut for users. There is no help surface for other efficiency features (tab navigation, view toggling with `?view=list`).
  - Fix: Add a "Keyboard shortcuts" entry to the account menu or a `?` icon in the header that opens a `<Disclosure>` or tooltip listing the available shortcuts.

---

## Part 3 — Cognitive Walkthrough: Simulation Trade Flow

**Flow evaluated:** First-time user → Login → Invest page → Start simulation → Place first buy order

| Step | Will user know what to do? | Can user see how to do it? | Will user understand feedback? | Issues |
|------|---------------------------|---------------------------|-------------------------------|--------|
| 1. Login | Yes — clear form | Yes — email/password visible | Partial — error states present but no "Forgot password" link | **H3/H9: No escape hatch for forgotten credentials** |
| 2. Land on /invest | Yes — "Investing and simulation" heading | Yes — BrokerModeLaunchpad is prominent | Yes — simulation mode badge in header | Good |
| 3. Choose simulation lane | Partial — lane names are visible | Yes — buttons are clear | N/A | **H10: No inline explanation of lane differences** |
| 4. Session starts, redirect to /invest/simulation | Yes — "Paper portfolio" heading | Yes — status badge changes to "running" | Yes — `WorkstationPageHeader` shows equity | Good |
| 5. Browse tradable universe (below the fold) | Partial — requires significant scrolling | Yes once found | Yes — cards show price and simulation badge | **H8: Long scroll before reaching asset cards** |
| 6. Click "Buy" on an asset card | Yes | Yes — "BUY" chip is visible | Yes — navigates to simulation page with prepared ticket | Good |
| 7. Review prepared ticket at top of page | Yes — ticket card is prominent | Yes — clear card layout | Yes — quote and freshness stated | **H6: "Clear prepared ticket" is underweighted visually** |
| 8. Submit order | Yes — button is present | Yes | Yes — fill detail message appears (`Bought 1 AAPL @ $182.00`) | **H5: No position-size-vs-cash warning** |

**Cognitive Walkthrough verdict:** The flow works but has 3 friction points that would cause a first-time user to pause: (a) no lane explanation, (b) too much scrolling before the tradable universe, and (c) the "Clear ticket" link is hard to find if the user changes their mind.

---

## Part 4 — Touch / Click Target Audit (Fitts's Law)

No Tailwind class-based small target violations were found (the project uses a bespoke CSS system, not Tailwind utility classes). The project's button system uses padding-based sizing defined in `globals.css`.

**Manual concerns identified:**

- **Severity: Medium** — The `journal-action-link` styled elements ("Clear prepared ticket", "Open asset detail", "Open portfolio") in the simulation prepared ticket card (`app/invest/simulation/page.tsx:591–604`) are rendered as `<Link>` elements styled as text links, not buttons. They appear in a small `aurox-action-row` strip. Without inspecting the CSS, the click target height is likely below 44px.
  - Fix: Convert these three actions to `button--secondary` or style `journal-action-link` to a minimum 44×32px tap target with appropriate padding.

- **Severity: Low** — The `SIM` badge chip in `quick-trade-actions.tsx:160` (`style={{ fontSize: '0.65rem' }}`) is an informational badge but is rendered at very small text size. If this renders adjacent to interactive elements, it compresses the perceived click target area of adjacent buttons.

---

## Part 5 — Prioritised Recommendations

### Critical (fix before user testing or broader rollout)

**C1 — Add "Forgot password?" link to login form**
- File: `apps/web/components/auth/login-form.tsx`
- Add below the password `<label>`: `<Link href="/forgot-password" className="auth-form__meta-link">Forgot password?</Link>`
- Also add inline below the error banner when `state.status === 'error'`.

**C2 — Fix 404 page copy**
- File: `apps/web/app/not-found.tsx`
- Replace `title={messages.common.unavailable}` with `title="Page not found"` and `description={messages.common.simulationDisclosure}` with `description="The page you're looking for doesn't exist or has moved."`.

---

### High (fix in next sprint)

**H-A — Remove "No source URL" developer string from dashboard news**
- File: `apps/web/app/dashboard/page.tsx:155`
- Change: `{item.href ? <a href={item.href} ...>Open source</a> : <span className="text-muted">No source URL</span>}` → `{item.href ? <a href={item.href} ...>Open source</a> : null}`

**H-B — Enforce simulation mode badge on market, signals, and observe pages**
- Files: `apps/web/app/market/page.tsx`, `apps/web/app/signals/page.tsx`, `apps/web/app/observe/page.tsx`
- The `WorkstationPageHeader` already supports a `statusLabel` + `statusTone` prop. Pass `statusLabel="simulation" statusTone="info"` on all execution-adjacent routes that do not currently show it.
- Alternatively, promote the simulation badge to a persistent layout-level element (a slim banner beneath the header) visible on all authenticated routes.

**H-C — Reduce navigation to 4–5 top-level destinations**
- File: `apps/web/components/layout/header.tsx` + `grouped-site-nav.tsx`
- Recommended primary nav: Dashboard · Market · Invest · Intelligence · Account
- Move Admin and Legal to account menu. Move intelligence sub-routes under a single "Intelligence" top-level item. Use `⌘K` as the disclosed path to all other routes.

**H-D — Add "Show password" toggle to login and register forms**
- Files: `apps/web/components/auth/login-form.tsx`, `apps/web/components/auth/register-form.tsx`
- Add a `type="button"` toggle beside the password input that switches `input type` between `"password"` and `"text"`.

---

### Medium (fix in next quarter)

**M-A — Add semantic colour to ConfidenceMeter**
- File: `apps/web/components/stats/confidence-meter.tsx`
- Map fill colour to confidence threshold: `< 40%` → danger/red, `40–69%` → warning/amber, `≥ 70%` → success/green.
- Add threshold legend text below the bar.

**M-B — Add simulation lane descriptions to BrokerModeLaunchpad**
- File: `apps/web/components/invest/broker-mode-launchpad.tsx` (inferred from usage)
- Add a one-line description beneath each lane name.
- Add a "What is a simulation lane?" collapsible above the selector.

**M-C — Add sticky section navigation to simulation cockpit**
- File: `apps/web/app/invest/simulation/page.tsx`
- Add a client-side `<nav>` with fragment anchors for "Metrics", "Holdings", "Watchlist", "Universe", "Tools". Renders above the first `<Section>` of content.

**M-D — Establish a single primary CTA on the dashboard CTA band**
- File: `apps/web/app/dashboard/page.tsx:165–170`
- Make one button `button--primary` based on user state (simulation active → "Open Simulation Cockpit", else → "Open Market Workstation"). Demote remaining to `button--secondary`.

**M-E — Add "Resume simulation" to account menu in header**
- File: `apps/web/components/layout/account-menu.tsx`
- When `portfolioSnapshot` is non-null (already fetched in `header.tsx`), add a "Resume simulation" link in the dropdown showing the portfolio equity value as a subtitle.

**M-F — Surface "Forgot password?" link co-located with auth errors**
- File: `apps/web/components/auth/login-form.tsx`
- Render `<Link href="/forgot-password">Forgot password?</Link>` inside the error state banner when `state.status === 'error'`.

**M-G — Add position-size-vs-cash soft warning in SimulatedOrderForm**
- File: `apps/web/components/invest/simulation-action-form.tsx`
- When `estimatedGross / availableCash > 0.25`, append a warning fragment to the hint line.

**M-H — Add "Signal guide" tooltip or popover to SignalScoreBadge**
- File: `apps/web/components/signals/signal-score-badge.tsx`
- Add a `?` icon button beside the badge that opens a micro-legend explaining score range and confidence thresholds.

**M-I — Upgrade "Clear prepared ticket" to a secondary button**
- File: `apps/web/app/invest/simulation/page.tsx:591`
- Convert the `journal-action-link` styled anchor to a `<Link className="button button--secondary">` with proper tap target sizing.

---

### Low (backlog)

**L-A — Map raw lane IDs to display names in all user-visible contexts**
- Replace `manual_stock_lane` → "Manual Stock" in all status pills and labels. This belongs in a shared formatter used by the mapper.

**L-B — Add macro regime scale context to simulation cockpit**
- File: `apps/web/app/invest/simulation/page.tsx:964–968`
- Add `Scale: −1 to +1` label and a colour-coded dot to each regime score card.

**L-C — Add password strength hints to registration and account password forms**
- Files: `apps/web/components/auth/register-form.tsx`, `apps/web/components/account/password-form.tsx`

**L-D — Ensure global-error.tsx has actionable copy and a dashboard escape hatch**
- File: `apps/web/app/global-error.tsx`
- Verify the error boundary message is user-facing, not technical.

**L-E — Surface ⌘K shortcut persistently in header**
- File: `apps/web/components/layout/header-client.tsx`
- Add a "Search ⌘K" chip or button in the header bar that is always visible, not only on the dashboard.

**L-F — Add keyboard shortcut for buy/sell actions on simulation page**
- For power-user efficiency. Consider `b` (buy) and `s` (sell) when trade ticket is active.

---

## Part 6 — Quick Wins vs. Larger Initiatives

### Quick Wins (< 2 hours each, high visible impact)

| Win | File | Effort |
|-----|------|--------|
| Add "Forgot password?" link below password field | `login-form.tsx` | 15 min |
| Fix 404 description copy | `not-found.tsx` | 10 min |
| Remove "No source URL" string from dashboard | `dashboard/page.tsx` | 5 min |
| Make one dashboard CTA band button primary | `dashboard/page.tsx` | 10 min |
| Add semantic colour fill to ConfidenceMeter | `confidence-meter.tsx` | 30 min |
| Add `aria-label` to the market ticker degraded state | `header.tsx` | 20 min |

### Larger Initiatives (1–3 sprint stories each)

| Initiative | Scope | Value |
|------------|-------|-------|
| **Navigation restructure** (reduce to 4–5 top-level items) | `header.tsx`, `grouped-site-nav.tsx`, `mobile-nav.tsx` | Reduces Hick's Law violation, reduces cognitive load on every page load |
| **Simulation mode badge system** (layout-level, all execution-adjacent routes) | Layout component or per-page integration | Compliance with financial-ui-safety-rule.md, trust legibility |
| **Sticky section nav on simulation cockpit** | `invest/simulation/page.tsx` | Power-user efficiency, reduces scrolling friction |
| **Lane explainer in BrokerModeLaunchpad** | `broker-mode-launchpad.tsx` | Onboarding-to-first-trade friction reduction |
| **Signal guide tooltip/popover** | `signal-score-badge.tsx` | Help and documentation, first-time comprehension |

---

## Part 7 — Sources & References

### Internal Standards Applied
- `.claude/rules/workstation-ui-rule.md` — Monospace numbers, all four states, consistent colours
- `.claude/rules/financial-ui-safety-rule.md` — Mode badge always visible, no guaranteed return language
- `.claude/rules/signal-visual-state-rule.md` — Low confidence / stale visual states
- `.claude/rules/accessibility-rule.md` — WCAG 2.1 AA, keyboard navigation, semantic elements
- `.claude/rules/read-model-rule.md` — UI receives pre-shaped read models
- `.claude/rules/confidence-score-rule.md` — Confidence thresholds and reduction rules

### External Research Sources
- [Bloomberg Terminal UX — How Bloomberg Hides Complexity](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity) — data density and conceal-complexity pattern
- [Fintech UX Best Practices 2026 — Eleken](https://www.eleken.co/blog-posts/fintech-ux-best-practices) — progressive disclosure, onboarding simplicity, high-stakes confirmations
- [Key UI/UX Principles for Fintech SaaS — Orbix Studio](https://medium.com/@orbix.studiollc/key-ui-ux-principles-for-fintech-saas-success-in-2025-603825e4187e) — trust signals, real-time feedback, decision support
- [Trading App Design: Complete Guide 2026 — Lollypop](https://lollypop.design/blog/2026/june/trading-app-design/) — information density approaches, Bloomberg vs. retail positioning
- [TradingView vs Bloomberg Terminal — Tockmarket](https://tockmarket.com/compare/tradingview-vs-bloomberg) — charting workstation UX patterns, customisability
- [TradingView Keyboard Shortcuts](https://www.tradingview.com/support/shortcuts/) — power-user keyboard navigation benchmark
- [Best Paper Trading Platform 2025 — ETNA](https://www.etnasoft.com/best-paper-trading-platform-for-u-s-broker-dealers-why-advanced-simulation-sets-the-2025-standard/) — simulation UX standards, onboarding patterns
- [Awwwards Annual Awards 2025](https://www.awwwards.com/annual-awards/) — award-winning data product design patterns
- [CSS Design Awards WOTY 2025](https://www.cssdesignawards.com/woty2025/) — finance and data dashboard award context
- [Nielsen Norman Group — Information Hierarchy cited in Fintech SaaS Principles](https://medium.com/@orbix.studiollc/key-ui-ux-principles-for-fintech-saas-success-in-2025-603825e4187e) — H8 aesthetic and minimalist design grounding
- [6 Best Paper Trading Simulators 2025 — CoinCodex](https://coincodex.com/article/65626/paper-trading-simulator) — simulation platform onboarding comparison

---

*Report generated by static expert analysis of the Aurox Intelligence codebase. No live user sessions were conducted. Findings should be validated with usability testing against representative users before large-scale implementation decisions are made.*
