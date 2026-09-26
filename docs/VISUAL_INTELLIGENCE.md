# Aurox Visual Intelligence — Architecture & Visual Grammar

**Status:** living document. Started during the Visual Intelligence Expansion pass.
**Principle:** Aurox is a *visual intelligence system for understanding markets* — not a
chart gallery. Every visualization must answer at least one of: *what is happening / why /
how strong is the evidence / how unusual / how are assets connected / where is the risk /
what drove performance / how did our signal perform / what could happen under simulation.*
If it answers none, it is not built.

---

## 1. Layering (never violated)

```
DOMAIN DATA (@repo/db, @repo/providers)
   ↓
FINANCIAL ENGINE (@repo/signals, @repo/forecasting — PURE, deterministic)
   ↓
VISUALIZATION READ MODEL (apps/web/server/mappers — pure display shaping)
   ↓
GEOMETRY / SCALE PROJECTION (apps/web/lib/charts — pure, no domain math)
   ↓
RENDERER (apps/web/components/charts + feature components — SVG/CSS)
   ↓
INTERACTION / TOOLTIP (client islands only where interactivity is required)
```

**Hard rules** (enforced by the repo's boundary rules):
- Components never compute financial truth (PnL, correlation, drawdown, signal score).
  The mapper/engine produces numbers; the component projects and paints them.
- Geometry helpers know nothing about finance. They turn `number[]` into coordinates.
- No provider or DB access below the query layer; no chart library imported client-side
  without an explicit, justified decision (currently: **none** — all bespoke SVG/CSS).

---

## 2. Shared geometry primitives — `apps/web/lib/charts/chart-geometry.ts`

The single home for value → pixel math. Replaces the ~7 identical inline `buildLine`/
`buildArea` implementations that previously lived in each chart component. Pure,
deterministic, never throws on degenerate input.

| Export | Purpose |
|---|---|
| `computeBounds(values, padPct?)` | `{min,max,range}`; `range` floored at 1 (flat-series safe) |
| `projectSeries(values, opts)` | `number[]` → `{x,y}[]`; supports shared `bounds`, `clampY`, `padPct` |
| `buildLinePath` / `buildAreaPath` / `buildPointsAttr` | SVG `d` / `points` strings |
| `movingAverage(values, window)` | trailing SMA, window clamped to length |
| `inferTrend` / `trendFromSignalScore` | shared trend/tone resolution |
| `scaleLinear(domain, range, clamp?)` | generic axis/scatter scale (galaxy, constellation) |
| `normalizeUnit`, `clamp`, `xAt`, `yFor`, `sanitizeSeries` | low-level helpers |

Numeric behaviour is byte-identical to the legacy inline math, so adoption changes no
rendered pixels. Verified by `chart-geometry.test.ts` (degenerate/flat/inverted/insufficient
cases) and the existing component tests.

**Adopted so far:** `mini-sparkline.tsx`, `line-trend-panel.tsx`. Remaining candidates:
`price-history-panel`, `asset-price-explorer`, `account-performance-timeline`,
`sparkline-stat-card`, `market-graph-workspace`, `mini-indicator-chart`.

The intelligence-overlay projector (`lib/chart-intelligence-projection.ts`) stays separate:
it is a price/timestamp-anchored, viewport-clipping projector with its own well-tested
contract and should not be folded into the generic helpers.

---

## 3. Visual grammar

The user should learn one language, not re-learn it per chart. **Color is never the sole
channel** — always pair it with position, shape, label, or icon (accessibility + colour-blind
safety).

### Semantic meaning → encoding

| Meaning | Color token | Secondary (non-color) encoding |
|---|---|---|
| Positive / bullish | `--status-success-*` | ▲ glyph, upward position, `+` sign |
| Negative / bearish | `--status-danger-*` | ▼ glyph, downward position, `−` sign |
| Neutral | `--status-info-*` / `--text-secondary` | → glyph, centred position |
| Warning / low-confidence / stale | `--status-warning-*` | ⚠ icon, reduced opacity, dashed stroke |
| Muted / no-data | `--text-tertiary`, `surface` | "—", hollow shape, "unavailable" label |
| Forecast / projected | series-ghost + dashed | dashed/ghost stroke, "projected" label |
| Historical / realized | solid stroke | solid |
| Simulated | always accompanied by the SIMULATION badge | never styled to look like live |

### Confidence

Confidence in `[0,1]` maps to **opacity + explicit `NN%` label + a `hasLowConfidence`
threshold flag** (mapper-derived at `< 0.4`). Never render a full-strength visual on a
low-confidence or stale value. Confidence is *not* probability of profit — copy must reflect
that (see §5).

### Numbers

Monospace (`--font-family-mono`), tabular, consistent decimal places within a column.
Counters (touches, pattern counts) use `.num-bubble--{neutral|info|success|warning|danger|muted}`;
money never uses `num-bubble`.

### Layout widths (responsive system)

`--content-standard` (general) · `--content-wide` (large analytical canvases) ·
`--content-dashboard` (dense grids, WIDE/ULTRAWIDE) · `--content-full` (3440px workstation).
Wrap analytical pages in `.dashboard-page-container`; KPI rows in `.account-metric-grid`.
Ultrawide should expose **more context** (side rails), not a single stretched chart.

---

## 4. Fail-safe conventions (mandatory per visualization)

Every visualization handles all of: **loading · empty · insufficient-data · partial-coverage ·
stale · error**. Never fabricate. Prefer honest text over a fake `0.00`:

> `Correlation — insufficient overlapping history (42 obs, 60 required)`

Coverage must be labelled when partial (`32 / 39 assets`). Sample size must travel with any
empirical statistic — `N=4` must never look as authoritative as `N=4,000`.

---

## 5. Explainability & financial honesty

Each non-obvious visualization carries progressive-disclosure answers to: *what am I looking
at / how is it calculated / what does it NOT mean.* Precise language, placed locally (not
blanket disclaimers):

- correlation ≠ causation; "60-session correlation of synchronized daily returns"
- confidence ≠ probability of profit; forecast ≠ guaranteed outcome
- simulation ≠ live; signal ≠ recommendation; past performance ≠ future performance

---

## 6. Per-visualization documentation template

Every shipped visualization appends an entry here with:

```
### <Name>  —  <route/placement>
QUESTION ANSWERED · INPUT DATA · CALCULATION (engine) · ENCODING · INTERACTION ·
LIMITATIONS · FAIL-SAFE BEHAVIOUR · RESPONSIVE/MOBILE · ACCESSIBILITY
```

### Market State Constellation — `/market`
- **Question:** what is the state of the tracked market as a system, right now?
- **Input:** tradable universe + batched daily OHLCV (`getMarketStateConstellationData`).
- **Calculation:** per-asset scale-free momentum% + annualized realized-vol% (`computeRangeMetrics`) and deterministic signal/confidence (`deriveSignalSnapshot`). Pure normalization in the mapper (symmetric momentum → 0.5 centre; median-vol reference).
- **Encoding:** x = momentum, y = volatility, colour = signal direction, size = confidence; four labelled quadrants + reference lines.
- **Interaction:** node = `<Link>` to asset detail; native `<title>` tooltip.
- **Limitations:** bounded to ~44 assets; snapshot (not temporal). **Fail-safe:** insufficient history → empty state.

### Correlation Matrix — `/market`
- **Question:** which assets move together vs. apart?
- **Input:** bounded universe (14) + batched OHLCV → synchronized daily log-returns.
- **Calculation:** pure Pearson matrix (`computeCorrelationMatrix`); pairwise overlap; unavailable pairs reported, never zero-filled.
- **Encoding:** red → neutral → green by magnitude; muted unit diagonal; hatched "—" for insufficient overlap.
- **Limitations:** N×N only legible for small N. **Fail-safe:** `< 2` series or no overlap → honest empty/"—".

### Volatility Pulse — asset detail (risk tab)
- **Question:** is this market unusually volatile — for itself?
- **Input:** `vm.history` OHLCV. **Calculation:** pure rolling 20-session annualized realized vol + percentile within its own history (`computeVolatilityPulse`).
- **Encoding:** area history + band (quiet/normal/elevated/extreme) + percentile marker. **Fail-safe:** `< 25` bars → empty.

### Signal Confluence — asset detail (signals tab)
- **Question:** do the deterministic evidence channels agree or diverge?
- **Input/Calc:** `computeCandleIntelligence.confirmation` (trend/momentum/volume/volatility) exposed via the mapper.
- **Encoding:** diverging bars around a zero centre (right = bullish) + overall confluence & confidence.

### Support / Resistance Strength Map — asset detail (signals tab)
- **Question:** where is the nearest structure, how strong, how far?
- **Input/Calc:** `computeCandleIntelligence.structure.nearest{Support,Resistance}` (price, touches, distance).
- **Encoding:** levels around current price; touch-count strength dots + distance.

### Drawdown Underwater — `/account`
- **Question:** how far below its high-water mark has the account been, and has it recovered?
- **Input/Calc:** pure `computeDrawdownAnalytics` over the snapshot equity series.
- **Encoding:** 0% line at top, shaded region hanging to the trough; max/current/trough stats. **Fail-safe:** `< 2` snapshots → empty.

### Signal Accuracy — `/signals` (Phase F)
- **Question:** how accurate has the deterministic signal actually been?
- **Pipeline (live):** migration `0020` applied to Neon; a daily cron
  (`/api/cron/intelligence-history`) records the universe's signals into
  `signal_history`. History accrues forward — nothing is backfilled.
- **Calculation:** `getSignalAccuracy` joins each recorded signal to the realized
  price `N` sessions later (`app.market_daily_bars`) → per bullish/bearish
  interpretation: sample size, avg forward return, directional hits. Join + hit
  logic verified against real price data.
- **Encoding:** per-interpretation cards; **sample size is first-class** — hit
  rate only shown at N≥20, reliability banded by N (a tiny sample never reads as
  authoritative). Honest "still accumulating" empty state until data exists.

### Remaining Phase F follow-ups
- **Forecast-vs-Reality** — needs the forecast write-path wired (`forecasts` has a
  FK to `assets.id` to reconcile) so produced forecasts persist for later
  comparison to the realized path.
- **Pattern Expectancy** — needs a `pattern_occurrences` table + writer to record
  detected candle patterns with their forward outcomes.
Both are data-gated the same way Signal Accuracy was: build + verify the stats
once history has accrued.
