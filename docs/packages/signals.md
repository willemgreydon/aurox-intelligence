# `@repo/signals` — Pure Signal Derivation

**Package:** `packages/signals` · **npm name:** `@repo/signals`
**Status:** Authoritative — update after each signal/indicator change.

Deterministic, explainable directional context for market monitoring and downstream
intelligence (forecasting, recommendations, simulation surfaces). See also
[signal-framework.md](../signal-framework.md) for the conceptual model.

---

## 1. Purpose & Boundary

This package derives directional signals (trend, momentum, volatility, composite) from
raw numeric price series. It is a **pure computation package** — same input always
produces the same output.

Boundary constraints (enforced by `.claude/rules/pure-domain-packages.md`,
`signal-purity-rule.md`, `architecture-boundaries.md`):

- **No I/O.** No `fetch`, no DB, no filesystem, no provider calls.
- **No imports from** `@repo/db`, `@repo/providers`, or `@repo/agents`.
- **No randomness.** No `Math.random()`. No `Date.now()` inside scoring logic.
- **No input mutation**, no module-level mutable state.
- **Insufficient / invalid data ⇒ safe value**, never `NaN` propagation
  (`insufficient-data-rule.md`, `history-data-rule.md`).

Callers (apps/web queries, `@repo/forecasting`, `@repo/agents` intelligence) own all
I/O and pass plain `number[]` series in.

---

## 2. Directory Map

| Subfolder | Responsibility |
|---|---|
| `indicators/` | Primitive technical indicators (`movingAverage`, `momentum`, `volatility`, `trendStrength`). Each guards length + finiteness. |
| `scoring/` | Aggregation primitives (`compositeScore`, `signalScore`) that blend/label normalized components. |
| `analysis/` | `deriveSignalSnapshot` — the orchestrator that combines indicators + scoring into one `SignalSnapshot`. |
| `models/` | TypeScript contracts produced by the package (`DerivedSignal`). |
| `features/` | Feature scaffolds (`buildPriceFeatures`, `buildMacroFeatures`, `buildSentimentFeatures`). **Scaffold — not re-exported** from the package entry. |
| `__tests__/` | Deterministic Vitest fixtures + indicator/snapshot tests. |

> **CURRENT vs scaffold:** `index.ts` re-exports only `indicators/*`, `analysis/derive-signal-snapshot`, `models/derived-signal`, and `scoring/composite-score`. `scoring/signal-score` and everything under `features/` exist in-tree but are **not** part of the public entry point yet.

---

## 3. Key Exports / Public API

Re-exported from `packages/signals/src/index.ts`:

| Export | Signature (summary) | What it does |
|---|---|---|
| `movingAverage` | `(values: number[], period: number) => number \| null` | Mean of the last `period` values. Returns `null` if `period <= 0`, `values.length < period`, or any windowed value is non-finite. |
| `momentum` | `(values: number[]) => number \| null` | `last − first`. Returns `null` for `< 2` bars or non-finite endpoints. |
| `volatility` | `(values: number[]) => number` | Population standard deviation. Returns `0` for `< 2` bars or any non-finite value. |
| `trendStrength` | `(change: number, volatilityValue: number) => number` | `change / volatilityValue`; returns `0` when volatility is `0` (no divide-by-zero). |
| `compositeScore` | `(scores: number[]) => number` | Arithmetic mean of components; `0` for an empty array. |
| `deriveSignalSnapshot` | `(assetId: string, values: number[]) => SignalSnapshot` | Full pipeline: computes indicators, normalizes, blends, clamps, labels, and emits confidence + breakdown. |
| `DerivedSignal` | `interface` | Base shape: `{ name, value, interpretation }`. |
| `SignalSnapshot` | `interface extends DerivedSignal` | The full read model (see §4). |

Present in-tree but **not** re-exported (use only via direct path if needed):

| Export | Path | Notes |
|---|---|---|
| `signalScore` | `scoring/signal-score.ts` | Maps sign of a number to `'bullish' \| 'bearish' \| 'neutral'`. Tested, not in entry. |
| `buildPriceFeatures` | `features/price-features.ts` | Returns `{ latest }`. Scaffold. |
| `buildMacroFeatures` / `buildSentimentFeatures` | `features/*.ts` | Identity passthroughs. Scaffold. |

---

## 4. Core Contracts Consumed / Produced

This package **consumes raw `number[]` series** (close prices) and **produces a
`SignalSnapshot`**. It does not currently import `SignalOutput` from
`@repo/api-contracts`; the contract is defined locally and consumed downstream
(notably by `@repo/forecasting`'s `buildForecastFromSignal`).

```ts
// models/derived-signal.ts
interface DerivedSignal {
  name: string;
  value: number;                                  // composite score, [-1, 1]
  interpretation: 'bullish' | 'bearish' | 'neutral';
}

// analysis/derive-signal-snapshot.ts
interface SignalSnapshot extends DerivedSignal {
  assetId: string;
  latestPrice: number | null;
  shortMovingAverage: number | null;             // movingAverage(values, min(5, len))
  longMovingAverage: number | null;              // movingAverage(values, min(20, len))
  momentumValue: number | null;
  volatilityValue: number;
  trendStrengthValue: number;
  compositeScoreValue: number;                    // clamped to [-1, 1]
  confidenceScore: number;                        // clamped to [0.2, 0.95]
  scoreBreakdown: {
    movingAverageContrib: number;                 // (shortMA − longMA) / longMA
    momentumContrib: number;                      // momentum / latestPrice
    trendContrib: number;                         // trendStrength / 10
  };
}
```

### Composite formula (current, `deriveSignalSnapshot`)

```
movingAverageSpread = (shortMA − longMA) / longMA        (0 if any MA null / longMA == 0)
normalizedMomentum  = momentum / latestPrice             (0 if null / no price)
normalizedTrend     = trendStrength / 10
compositeScoreValue = clamp(mean([maSpread, normMomentum, normTrend]), −1, 1)

interpretation = compositeScoreValue > 0.05 ? 'bullish'
               : compositeScoreValue < −0.05 ? 'bearish'
               : 'neutral'

confidenceScore = clamp((|compositeScoreValue| + trendStrength / 10) / 2, 0.2, 0.95)
```

> **Note:** with the default windows, when a series is shorter than 20 bars,
> `min(20, len)` collapses the long window onto the same data as the short window,
> so `shortMovingAverage === longMovingAverage` and `movingAverageSpread === 0`.

---

## 5. Determinism & Purity Invariants

| Invariant | How it holds |
|---|---|
| Same input ⇒ deep-equal output | No randomness/time; `deriveSignalSnapshot` deterministic (asserted in tests). |
| Score never `NaN`/`Infinity` | Every indicator guards `Number.isFinite`; `trendStrength` guards zero volatility; final score is `clamp(..., −1, 1)`. |
| Confidence in `[0.2, 0.95]` | Final `clamp(..., 0.2, 0.95)` floor/ceiling. |
| Composite in `[−1, 1]` | Final `clamp(..., −1, 1)`. |
| No external state | All functions take explicit args; no module-level mutable variables. |

Validation (per `pure-domain-packages.md`):

```bash
grep -r "async function\|await \|fetch(\|Math\.random" packages/signals/src --include="*.ts"
grep -r "import.*@repo/db\|import.*@repo/providers" packages/signals/src --include="*.ts"
```

---

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| Empty series | `deriveSignalSnapshot` returns a safe zero snapshot: prices/MAs/momentum `null`, composite `0`, interpretation `neutral`, finite confidence. No throw. |
| Below indicator minimum (`< period` for MA, `< 2` for momentum/volatility) | MA/momentum return `null`; volatility returns `0`. Contributions degrade to `0`. |
| Non-finite value (`NaN`/`Infinity`) in window | `movingAverage`/`momentum` return `null`; `volatility` returns `0`. **No `NaN` reaches the score.** |
| Zero volatility | `trendStrength` returns `0` (no divide-by-zero). |
| `longMovingAverage === 0` | `movingAverageSpread` forced to `0`. |
| Non-positive MA period | `movingAverage` returns `null`. |

Why this matters (`insufficient-data-rule.md`): a `NaN` score compared against a risk
threshold (`NaN > 0.3`) is `false` in JS, silently masking a data-quality problem.
These guards keep missing/invalid data explicit and non-actionable.

---

## 7. How to Extend

**Add a new indicator**
1. Create `packages/signals/src/indicators/<name>.ts` as a pure function.
2. Guard length and `Number.isFinite` first; return a safe value (`null` or `0`) on bad input — never `NaN`.
3. Re-export from `index.ts`.
4. Add deterministic tests in `__tests__/indicators.test.ts` using fixtures from `__tests__/fixtures.ts`.

**Fold an indicator into the composite**
1. Compute it inside `deriveSignalSnapshot` (`analysis/derive-signal-snapshot.ts`).
2. Normalize it to a comparable range, push into the `compositeScore([...])` array, and add a `scoreBreakdown.<x>Contrib` field on `SignalSnapshot`.
3. Keep the final `clamp([-1,1])` and confidence `clamp([0.2,0.95])`.
4. Update the snapshot bounds/determinism assertions in `__tests__/derive-signal-snapshot.test.ts`.

**Promote a scaffold (`features/*`, `signalScore`)**
- Implement real logic, re-export from `index.ts`, add fixtures + tests, then update §3 here (CURRENT vs scaffold).

---

## 8. Testing Notes

| Test file | Covers |
|---|---|
| `__tests__/fixtures.ts` | Hand-authored deterministic series (empty, single bar, flat, uptrend, NaN-middle, NaN-last, Infinity). No `Math.random()`/`Date.now()` per `test-data-rule.md`. |
| `__tests__/indicators.test.ts` | Per-indicator: normal, min-bars-exact, below-min, flat, NaN/Infinity, zero-volatility guard. Plus `compositeScore` and `signalScore`. |
| `__tests__/derive-signal-snapshot.test.ts` | Pre-computed snapshot values, neutral/flat floor, empty safe-zero, NaN safety, `[-1,1]`/`[0.2,0.95]` bounds, and deep-equal determinism. |

Run:

```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
```

---

## 9. Related Docs

- [signal-framework.md](../signal-framework.md) — conceptual signal architecture
- [forecasting.md](./forecasting.md) — consumes `SignalSnapshot`
- [agents.md](./agents.md) — consumes signal direction/confidence in trade intent
- `.claude/rules/pure-domain-packages.md`, `signal-purity-rule.md`, `indicator-derivation-rule.md`, `insufficient-data-rule.md`, `confidence-score-rule.md`
