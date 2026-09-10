# EPIC — GODTIER Interface Upgrade (Aurox, simulation-only)

**Created:** 2026-06-15
**Status:** Proposed — awaiting start-point confirmation
**Premise:** Aurox stays **simulation-only**. Real-money/live tasks (AUR-025/030/031) are deferred on the board to `P9 [Future · Real-Money/Live]`. This epic redirects energy from "going live" to making the simulation workstation visually *godtier* — Bloomberg/TradingView-class density with premium polish and trust.

> Plan doc. No board tasks created automatically (taskboard rule). Ask before pushing these to Notion.

---

## 1. Why now

The exploration (2026-06-15) found a **strong technical foundation** but an **uneven visual tier**:
- Mature: `/dashboard`, `/invest/simulation`, `/market`, `/portfolio/intelligence`.
- Sparse / raw: `/macro`, `/finance`, `/markets/intelligence`, `/invest/accounts`, `/news`, `/forecasts`.
- Inconsistency debt: 3 overlapping card patterns (`.surface` / `.analytics-card` / `.surface--ghost`), 3 badge systems, multiple metric layouts, ~1,535 CSS classes in one 280KB `globals.css`, no Storybook, no published token/type scale, CSS-only motion (feels static).

Most **ship-blocking UX fixes are already done** (AUR-001 sim badge, AUR-005 confidence legend, AUR-010 forgot-password, AUR-012 show-password, AUR-013 404 copy, AUR-052 nav IA, a11y AUR-019/054/055). So this epic is **refinement + elevation**, not triage.

---

## 2. Design pillars (the bar we hold every screen to)

1. **One language.** A single card primitive, a single badge system, a single metric tile, a documented type + spacing scale. Retire duplicates.
2. **Density with calm.** Bloomberg-grade information density, TradingView-grade focus. Progressive disclosure everywhere; one dominant metric per zone.
3. **Living, not static.** A restrained motion layer: state transitions, fill/success feedback, hover affordances, skeleton→content cross-fade. Honor `prefers-reduced-motion`.
4. **Trust on every tile.** Simulation badge, data-freshness age, confidence color, explainability — always visible, never implying guaranteed returns.
5. **Deterministic & safe.** No business logic in components (read models only); no real-money surfaces; a11y AA; no guaranteed-return language.

---

## 3. Phased plan

### Phase A — Design language foundation *(highest leverage; lifts every screen)*
- **A1. Token + scale spec.** Document color/spacing/type/elevation/motion tokens from `packages/design-tokens` + `globals.css` into `docs/DESIGN_SYSTEM.md`. Name the type scale and spacing steps.
- **A2. Unify the card.** One canonical `Card`/`Surface` with tone + density variants; codemod the worst offenders off `.surface--ghost`/ad-hoc `.analytics-card` markup.
- **A3. Unify badges + metric tiles.** Single `StatusBadge` taxonomy; single `MetricTile`. Map `status-pill`/`account-risk-badge`/`signal-badge` onto it.
- **A4. Motion primitives.** Reusable CSS/utility layer for enter/exit, value-change flash (green/red tick), hover lift, skeleton cross-fade. `prefers-reduced-motion` guard.

### Phase B — Flagship surface glow-ups *(visible wins)*
Apply the language to the anchor screens, one self-contained slice each:
- **B1. Dashboard** — primary-CTA-by-state (AUR-022), value-change flashes, tighter KPI strip.
- **B2. Market graph** — chart polish, crosshair/hover readout, freshness chip, legend.
- **B3. Simulation cockpit** — sticky section navigator (AUR-015), position-size soft warning (AUR-014), lane descriptions (AUR-017), clear-ticket as secondary button (AUR-016).
- **B4. Signals/Intelligence** — signal guide tooltip (AUR-006), decompose signal badge, confidence color everywhere.

### Phase C — Sparse-route rescue *(biggest before/after)*
Designed states for the raw screens: `/macro` (score legend + direction arrows + scale, AUR-???), `/forecasts` (direction/confidence encoding), `/markets/intelligence`, `/finance`, `/news`, `/invest/accounts`. Every section gets loading/empty/error/degraded states.

### Phase D — Navigation & wayfinding
- ⌘K persistent header hint (AUR-020), Resume-simulation in account menu (AUR-021), lane ID → display names (AUR-008), market ticker degraded label (AUR-004).

### Phase E — System maturity *(durable)*
- Storybook for primitives + patterns; visual-state catalog; keyboard shortcut map; optional dark/light toggle (tokens already support it).

---

## 4. Existing board tasks folded into this epic

These already-on-board P2 UI tasks become slices here (no real-money exposure):

| Board ID | Folds into | Note |
|---|---|---|
| AUR-022 Dashboard primary CTA | B1 | state-based CTA |
| AUR-015 Sticky section nav | B3 | sim cockpit |
| AUR-014 Position-size soft warning | B3 | server-computed |
| AUR-017 Lane descriptions | B3 | + "what is a lane?" |
| AUR-016 Clear-ticket secondary button | B3 | |
| AUR-006 Signal guide tooltip | B4 | focus-trap popover |
| AUR-007 Signal detail tabs | B4/C | history/accuracy/ROI/news |
| AUR-008 Lane ID display names | D | mapper |
| AUR-020 ⌘K chip | D | |
| AUR-021 Resume simulation | D | account menu |
| AUR-004 Ticker degraded label | D | |
| AUR-048 Orphan/dead-code removal | A | clean as we unify |

New (not yet on board): token/type spec, card/badge/metric unification, motion layer, macro/forecast/finance visual encoding, Storybook. Propose adding these as a new **"GODTIER UI"** epic on Notion if desired.

---

## 5. Recommended first slice

**Phase A1+A4 lite → then B1 (Dashboard).** Rationale: the token/type spec + a small motion primitive layer are low-risk, lift every later slice, and B1 turns the most-seen screen into the reference implementation of the new bar. Each is a separate verified PR.

Alternative first slices if you want an immediate visual "wow": **B2 Market graph** (most impressive surface) or **C `/macro` rescue** (most dramatic before/after).

---

## 6. Guardrails (every slice)

- Read models only in components; mappers do formatting (read-model-rule, aurox-ui-boundaries).
- a11y AA: keyboard, ARIA, contrast, `prefers-reduced-motion`.
- No guaranteed-return language; simulation badge + freshness preserved.
- Verify: `pnpm build:web`, eslint on changed files, `@repo/*` typecheck/test where touched.
- Branch per slice; Change Summary per slice; mark Notion Done only when told.

---

## 7. Open questions

1. Which first slice — **A1+A4→B1 (recommended)**, B2 (market graph), or C (/macro rescue)?
2. Create a new **"GODTIER UI"** epic + tasks on the Notion board, or track here in `.docs` only?
3. Dark/light toggle in scope for this epic, or later?
