# Candlestick Intelligence

A deterministic, explainable candlestick analysis layer. It reads raw daily
OHLCV bars and produces a contextual, evidence-based read of the current price
action — never a mechanical "N red candles = sell" signal.

> **Core principle.** Aurox must never say *"four red candles means sell."* It
> says: *"Recent selling pressure is elevated, but price is approaching
> established support; lower wicks are increasing and bearish bodies are
> contracting, which may indicate weakening selling pressure. Momentum remains
> negative, so reversal evidence is currently insufficient."*

## Where it lives

| Concern | Location |
|---|---|
| Output contract (Zod + types) | `packages/api-contracts/src/candles/candles.ts` |
| Pure engine (features, structure, patterns, confluence, resample, validation) | `packages/signals/src/candles/*` |
| New pure indicators (RSI, EMA, ATR) | `packages/signals/src/indicators/{rsi,ema,atr}.ts` |
| Route-side mapper (engine → view model) | `apps/web/server/mappers/candle-intelligence-mapper.ts` |
| UI panel (Signals tab) | `apps/web/components/asset/candle-intelligence-panel.tsx` |

The engine is **pure**: no I/O, no network, no `Date.now()`/`Math.random()`.
`generatedAt` is passed in. Identical `(bars, generatedAt)` → identical output.
This keeps every read reproducible and auditable (`pure-domain-packages.md`,
`forecasting-purity-rule.md`).

## Pipeline

```
DAILY OHLCV
  → sanitize (drop non-finite, repair high/low envelope)
  → candle features (body, wicks, ratios, gap, relative range/volume)
  → market structure (swings, HH/HL/LH/LL, S/R, breakout)
  → pattern detection (geometric, context-free)
  → confirmation channels (trend EMA+structure, momentum RSI, volume, volatility ATR)
  → contextual pattern weighting (trend / structure / S/R aware)
  → confluence score + direction + confidence
  → multi-timeframe (daily / derived weekly / derived monthly)
  → reasons / warnings / invalidation
```

## Candle features (per bar)

`bodySize`, `range`, `upperWick`, `lowerWick`, `bodyToRangeRatio`,
`upperWickRatio`, `lowerWickRatio`, `closePositionInRange`, `direction`,
`relativeRange` (vs trailing average, null until ≥3 priors), `relativeVolume`
(null if volume unavailable), `gap` (vs previous close, null for first bar).

Edge cases handled deterministically: zero-range candles (ratios → 0,
`closePositionInRange` → 0.5), missing volume (relatives → null), malformed
OHLC (dropped), insufficient history (see below).

## Market structure

Swing highs/lows via a symmetric **fractal window** (`SWING_WINDOW = 2`): a bar
is a swing high if its high ≥ every high within 2 bars each side (strict on at
least one). Regime is derived from the last two swing highs/lows:

- `uptrend` — higher highs **and** higher lows
- `downtrend` — lower highs **and** lower lows
- `transition` — conflicting (HH+LL or LH+HL)
- `range` — otherwise (with ≥3 swings)
- `unknown` — insufficient swings

Support/resistance are clustered swing levels (within `LEVEL_TOLERANCE = 1.5%`).
Breakout = latest close pierced **and held** beyond the prior swing;
`failedBreakout` = pierced intrabar but closed back inside.

## Pattern detection (geometric fact)

Doji, long-legged doji, hammer, inverted hammer, shooting star, bullish/bearish
engulfing, morning/evening star, inside bar, outside bar, bullish/bearish
marubozu. Each has an explicit, documented threshold definition and returns:

```
{ pattern, direction, strength, confidence, explanation, candleIndexes }
```

`confidence` here = **quality of the geometric match**, *not* a probability the
trade succeeds. Pattern names are never treated as Buy/Sell on their own.

## Contextual interpretation (the intelligence)

A detected pattern's directional contribution is scaled by context
(`contextMultiplier`):

- Bullish reversal in a **downtrend at support** → boosted (×1.4).
- Bullish reversal **beneath resistance in an uptrend** → discounted (×0.6) +
  counter-evidence warning.
- Any reversal **inside a range** → discounted (×0.8) as range noise.
- Continuation (marubozu/outside) **aligned with trend** → ×1.2, else ×0.7.

Thus a hammer after a decline at support is meaningfully different from the same
hammer in sideways noise — the design requirement.

## Confluence, score & confidence

Final score ∈ [-1, 1] is a weighted blend that keeps candle patterns as
*contextual* evidence rather than letting them dominate:

```
trend 0.28 · momentum 0.22 · pattern 0.30 · breakout 0.10 · volume 0.10
```

Trend and structure are **averaged** into one channel (not summed) to avoid
double-counting the same price information (EMA trend + structure describe the
same trend).

`confidence` ∈ [0, 0.9] reflects **evidence quality**: channel agreement, data
sufficiency, best pattern quality, minus conflict; reduced when volume is
unavailable; capped at 0.5 when the read is neutral. It is *not* a success
probability, and the UI never presents it as one.

## Multi-timeframe

Persisted history is **daily only**, so weekly/monthly are **derived by
resampling** daily bars (Monday-anchored weeks; calendar months, UTC). No extra
provider calls, no fabricated intraday data. Intraday multi-timeframe is out of
scope until intraday bars are persisted. Disagreement between the daily read and
a higher-timeframe trend is surfaced explicitly as a warning.

## Insufficient data

Below `CANDLE_MIN_BARS = 20` valid bars the engine returns
`hasInsufficientData: true` with `score: 0`, `confidence: 0`, `direction:
neutral`, and an explanatory warning. The UI renders an explicit
"insufficient data" state. NaN never propagates.

## Asset-class awareness

"Near a level" thresholds scale by class (crypto 4%, fx 1.5%, stocks/ETF 2.5%).
Volatility banding is already asset-class aware in `lib/market-pulse.ts`. Crypto
is 24/7; stocks/ETFs have session gaps — gaps are represented via the `gap`
feature rather than interpolated away.

## Empirical validation (kept separate)

`packages/signals/src/candles/validation.ts` measures **forward outcomes**
(forward return, MFE/MAE, hit rate, expectancy) per pattern. This is
intentionally isolated from detection: **a detected hammer is a geometric fact;
whether it predicts positive forward returns is an empirical question.** The
engine asserts no predictive power. A future backtest can drive this harness
over historical bars to calibrate weights.

## UI

The **Signals** tab of every asset-detail page (`/stocks/[symbol]`,
`/invest/stocks|crypto|etfs/[symbol]`) renders a Candle Intelligence panel: a
compact evidence summary (structure, pressure, momentum, volume, volatility,
overall), detected patterns, multi-timeframe row, and a collapsible **"Why?"**
evidence chain (supporting evidence / counter-evidence / invalidation).
Progressive disclosure keeps the default view clean. Language is evidence-based
("Moderately bullish evidence"), never advice, with a standing disclaimer.

## Testing

`packages/signals/src/__tests__/candle-*.test.ts` — deterministic fixtures cover
feature geometry, zero-range/malformed/missing-volume, RSI/EMA/ATR (incl.
insufficient/NaN), every pattern, structure regimes/S-R/breakout, score/confidence
bounds, determinism, and the doctrine scenarios A–F (four-red ≠ sell; four-red +
two-green ≠ buy; hammer-at-support vs hammer-in-range; pattern beneath
resistance surfaces counter-evidence; multi-timeframe disagreement).

## Chart overlay (market-graph workspace)

An **opt-in** "Candle intelligence" overlay is available on the large
market-graph workspace (advanced controls → toggle, **default OFF**). With the
toggle off the chart renders exactly as before — no intelligence is projected
and no extra work runs in the render path.

The overlay follows a strict three-layer separation so financial analysis never
leaks into the chart:

```
computeCandleIntelligence (server, @repo/signals)
  → buildChartIntelligenceOverlay      apps/web/server/mappers/chart-intelligence-overlay-mapper.ts
      (coordinate-INDEPENDENT view model: price/timestamp anchored primitives)
  → projectChartIntelligence           apps/web/lib/chart-intelligence-projection.ts
      (PURE geometry: timestamp→viewport index, price→y, clip, collide)
  → <g class="market-graph__intel">     SVG overlay layer (pointer-events: none)
```

- The mapper reuses the canonical engine for direction/headline/confidence and
  its `structure`, and reruns only the pure `sanitizeBars → deriveCandleFeatures`
  pipeline to resolve pattern `candleIndexes` back to bar timestamps. No second
  analysis, no market-structure re-implementation.
- Overlays are computed server-side for every asset in the workspace (daily
  views only) and shipped with the graph data, so switching the primary asset
  needs no client-side computation and no extra provider/DB calls.
- **Projected primitives**: nearest support/resistance (price-anchored dashed
  lines, `S`/`R` tags), last swing high/low (`HH`/`HL`/`LH`/`LL` chips,
  suppressed when they collide with an S/R line), candle-pattern glyphs
  (candle-mode only, anchored to the confirming bar, strongest-per-candle,
  capped), and structure events (breakout / failed breakout / BOS). Hovering a
  candle adds an optional "Candle intelligence" section to the existing tooltip
  with the pattern, strength, evidence, and one supporting / counter line.
- **Disabled with a note** in comparison mode (primary asset only; normalisation
  to 100 breaks absolute-price anchoring) and on true intraday views (the engine
  is daily-only — no manufactured intraday structure). S/R and structure remain
  valid in line mode; pattern glyphs are candle-mode only.

## Known limitations

- Weekly/monthly are resampled from daily; intraday MTF requires persisted
  intraday bars.
- Empirical validation harness exists but is not yet wired to a scheduled
  backtest; confluence weights are principled, not fitted.
- Chart-overlay swing markers are price-anchored (horizontal chips) rather than
  pinned to the originating candle, because the engine does not surface per-swing
  timestamps. Pattern glyphs align to bars only on daily-spaced viewports.
